/**
 * OpsMind AI — LLM Service
 *
 * Provider-agnostic LLM interface supporting:
 *  - Gemini 1.5 Flash (default)
 *  - Groq / Llama-3 70B
 *
 * Features:
 *  - Multi-stage prompt construction (anti-hallucination)
 *  - Query rewriting for retrieval optimization
 *  - LLM re-ranking helper
 *  - Real-time SSE token streaming
 *  - Multi-document reasoning detection
 *  - Token usage tracking
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

// ─── Client Singletons ───────────────────────────────────────────────────────
let _geminiClient = null;
let _groqClient = null;

const getGeminiClient = () => {
  if (!_geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    _geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _geminiClient;
};

const getGroqClient = () => {
  if (!_groqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');
    _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groqClient;
};

// ─── Prompt Construction ─────────────────────────────────────────────────────

/**
 * Detect if chunks come from multiple documents (triggers multi-doc reasoning)
 */
const detectMultiDoc = (chunks) => {
  const uniqueDocs = new Set(chunks.map((c) => c.documentId?.toString()));
  return uniqueDocs.size > 1;
};

/**
 * Format source context with rich metadata for the LLM prompt.
 * Each chunk is clearly labeled with document name, page, and a snippet marker.
 */
const formatContext = (chunks) => {
  return chunks
    .map((c, i) => {
      const score = (c.rerankScore ?? c.vectorScore ?? c.hybridScore ?? 0);
      return [
        `━━━ [SOURCE ${i + 1}] ━━━`,
        `Document : ${c.documentName}`,
        `Page     : ${c.pageNumber}`,
        `Relevance: ${(score * 100).toFixed(1)}%`,
        `Content  :`,
        c.text,
        '',
      ].join('\n');
    })
    .join('\n');
};

/**
 * Build the full RAG prompt with layered anti-hallucination constraints.
 *
 * Architecture:
 *  [SYSTEM RULES] → [CONTEXT BLOCK] → [MULTI-DOC NOTE if needed] → [QUESTION] → [ANSWER TEMPLATE]
 */
const buildRAGPrompt = (query, chunks) => {
  const isMultiDoc = detectMultiDoc(chunks);
  const contextBlock = formatContext(chunks);
  const uniqueDocs = [...new Set(chunks.map((c) => c.documentName))];

  const multiDocNote = isMultiDoc
    ? `\n${appConfig.multiDocPrompt.replace('{numSources}', uniqueDocs.length)}\n`
    : '';

  return `${appConfig.ragSystemPrompt}
${multiDocNote}
══════════════════════════════════════════
[CONTEXT — USE ONLY THIS INFORMATION]
══════════════════════════════════════════
Documents available in context: ${uniqueDocs.join(', ')}

${contextBlock}
══════════════════════════════════════════
[END OF CONTEXT]
══════════════════════════════════════════

User Question: ${query}

CRITICAL REMINDER:
- If the answer is NOT in the context above, respond with EXACTLY: "I don't know based on the provided SOP documents."
- Do NOT use general knowledge. Do NOT speculate.
- Cite sources inline: [Source: <document name>, Page <N>]
- End with: Confidence: HIGH | MEDIUM | LOW — [reason]

Answer:`;
};

/**
 * Build the query rewrite prompt
 */
const buildRewritePrompt = (query) =>
  appConfig.queryRewritePrompt.replace('{query}', query);

// ─── Provider: Gemini ────────────────────────────────────────────────────────

const generateWithGemini = async (prompt, opts = {}) => {
  const genAI = getGeminiClient();
  const modelName = opts.model || appConfig.llmModel;
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: opts.temperature ?? appConfig.llmTemperature,
      topP: opts.topP ?? appConfig.llmTopP,
      maxOutputTokens: opts.maxTokens ?? appConfig.llmMaxTokens,
      // Candidates = 1: deterministic output, avoids wasting tokens
      candidateCount: 1,
    },
    // Safety settings: relaxed for enterprise SOP content
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  });

  const result = await model.generateContent(prompt);
  const response = result.response;

  return {
    text: response.text().trim(),
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    },
  };
};

const streamWithGemini = async (prompt, onChunk) => {
  const genAI = getGeminiClient();
  const modelName = appConfig.llmModel;
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: appConfig.llmTemperature,
      topP: appConfig.llmTopP,
      maxOutputTokens: appConfig.llmMaxTokens,
    },
  });

  // 90-second hard timeout — prevents infinite hang on Render free tier
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  let fullText = '';
  let promptTokens = 0;

  try {
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      if (controller.signal.aborted) break;
      try {
        const text = chunk.text();
        if (text) {
          fullText += text;
          onChunk(text);
        }
      } catch (chunkErr) {
        // A single bad chunk should not kill the whole stream
        logger.warn(`[LLM:Gemini] Chunk decode error (skipped): ${chunkErr.message}`);
      }
    }

    // Aggregate usage from response (available after stream completes)
    const finalResponse = await result.response;
    promptTokens = finalResponse.usageMetadata?.promptTokenCount || 0;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!fullText) throw new Error('Gemini stream returned no content');

  return {
    text: fullText.trim(),
    usage: {
      promptTokens,
      completionTokens: Math.ceil(fullText.length / 4), // estimate
      totalTokens: promptTokens + Math.ceil(fullText.length / 4),
    },
  };
};

// ─── Provider: Groq (Llama 3) ────────────────────────────────────────────────

const generateWithGroq = async (prompt, opts = {}) => {
  const groq = getGroqClient();
  const modelName = opts.model || appConfig.groqModel;

  // Groq uses chat format — wrap prompt as user message
  const completion = await groq.chat.completions.create({
    model: modelName,
    messages: [
      // System message enforces rules at the API level
      {
        role: 'system',
        content: 'You are OpsMind AI. Follow all instructions in the user prompt EXACTLY. Never deviate.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: opts.temperature ?? appConfig.llmTemperature,
    max_tokens: opts.maxTokens ?? appConfig.llmMaxTokens,
    top_p: opts.topP ?? appConfig.llmTopP,
    stream: false,
  });

  return {
    text: completion.choices[0].message.content.trim(),
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
  };
};

const streamWithGroq = async (prompt, onChunk) => {
  const groq = getGroqClient();
  const modelName = appConfig.groqModel;

  // 90-second hard timeout — prevents infinite hang on Render free tier
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  let fullText = '';
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const stream = await groq.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are OpsMind AI. Follow all instructions EXACTLY.' },
        { role: 'user', content: prompt },
      ],
      temperature: appConfig.llmTemperature,
      max_tokens: appConfig.llmMaxTokens,
      stream: true,
      stream_options: { include_usage: true },
    }, { signal: controller.signal });

    for await (const chunk of stream) {
      if (controller.signal.aborted) break;
      try {
        const text = chunk.choices?.[0]?.delta?.content || '';
        if (text) {
          fullText += text;
          onChunk(text);
          completionTokens++;
        }
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens || 0;
        }
      } catch (chunkErr) {
        // A single bad chunk should not kill the whole stream
        logger.warn(`[LLM:Groq] Chunk decode error (skipped): ${chunkErr.message}`);
      }
    }
  } catch (err) {
    // If we already received some content, treat as partial success
    if (fullText.length > 0) {
      logger.warn(`[LLM:Groq] Stream ended early: ${err.message}. Returning partial content.`);
    } else {
      throw err; // No content at all — propagate so fallback kicks in
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (!fullText) throw new Error('Groq stream returned no content');

  return {
    text: fullText.trim(),
    usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
  };
};

// ─── Provider Router ─────────────────────────────────────────────────────────

/**
 * Generic generate — routes to correct provider.
 * Used internally (re-ranking, query rewriting) and externally.
 */
const generateWithProvider = async (prompt, opts = {}) => {
  const provider = opts.provider || appConfig.llmProvider;
  if (provider === 'groq') return generateWithGroq(prompt, opts);
  return generateWithGemini(prompt, opts);
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Query Rewriting: improve user query for better embedding retrieval.
 * If rewriting fails, original query is returned (never blocks pipeline).
 */
const rewriteQuery = async (originalQuery) => {
  try {
    const prompt = buildRewritePrompt(originalQuery);
    const result = await generateWithProvider(prompt, { maxTokens: 100, temperature: 0 });
    const rewritten = result.text.trim().replace(/^OUTPUT:\s*/i, '').trim();

    if (!rewritten || rewritten.length < 3) return originalQuery;
    logger.debug(`[QueryRewrite] "${originalQuery}" → "${rewritten}"`);
    return rewritten;
  } catch (err) {
    logger.warn(`[QueryRewrite] Failed, using original: ${err.message}`);
    return originalQuery;
  }
};

/**
 * Standard (non-streaming) RAG answer generation.
 */
const generateAnswer = async (query, chunks) => {
  const prompt = buildRAGPrompt(query, chunks);
  logger.debug(`[LLM] Generating answer (provider: ${appConfig.llmProvider})`);
  
  try {
    return await generateWithProvider(prompt);
  } catch (err) {
    logger.warn(`[LLM] Primary provider failed: ${err.message}. Attempting fallback...`);
    const fallbackProvider = appConfig.llmProvider === 'groq' ? 'gemini' : 'groq';
    return await generateWithProvider(prompt, { provider: fallbackProvider });
  }
};

/**
 * Streaming RAG answer generation via SSE.
 * onChunk is called for each token/word as it arrives.
 */
const streamAnswer = async (query, chunks, onChunk) => {
  const prompt = buildRAGPrompt(query, chunks);
  logger.debug(`[LLM] Streaming answer (provider: ${appConfig.llmProvider})`);

  try {
    if (appConfig.llmProvider === 'groq') {
      return await streamWithGroq(prompt, onChunk);
    }
    return await streamWithGemini(prompt, onChunk);
  } catch (err) {
    logger.warn(`[LLM] Primary provider failed: ${err.message}. Attempting fallback...`);
    if (appConfig.llmProvider === 'groq') {
      return await streamWithGemini(prompt, onChunk);
    }
    return await streamWithGroq(prompt, onChunk);
  }
};

module.exports = {
  generateAnswer,
  streamAnswer,
  rewriteQuery,
  generateWithProvider,
  buildRAGPrompt,
  formatContext,
};
