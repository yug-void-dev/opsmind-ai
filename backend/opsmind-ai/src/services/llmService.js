const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

let geminiClient = null;
let groqClient = null;

const getGeminiClient = () => {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

/**
 * Build the strict RAG prompt
 */
const buildRAGPrompt = (query, contextChunks) => {
  const contextText = contextChunks
    .map((c, i) => `[Source ${i + 1}: ${c.documentName}, Page ${c.pageNumber}]\n${c.text}`)
    .join('\n\n---\n\n');

  return `${appConfig.systemPrompt}

=== CONTEXT FROM SOP DOCUMENTS ===
${contextText}
=== END CONTEXT ===

User Question: ${query}

Instructions: Answer ONLY using the context above. If the answer is not in the context, respond with exactly: "I don't know based on the provided documents."`;
};

/**
 * Generate answer using Gemini Flash (non-streaming)
 */
const generateWithGemini = async (prompt) => {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.1, // Low temp for factual responses
      topP: 0.8,
      maxOutputTokens: 1024,
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;

  return {
    text: response.text(),
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    },
  };
};

/**
 * Stream with Gemini Flash (SSE)
 */
const streamWithGemini = async (prompt, onChunk) => {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  });

  const result = await model.generateContentStream(prompt);
  let fullText = '';

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }

  return fullText;
};

/**
 * Generate answer using Groq / Llama 3
 */
const generateWithGroq = async (prompt) => {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: 'llama3-70b-8192',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1024,
  });

  return {
    text: completion.choices[0].message.content,
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
  };
};

/**
 * Stream with Groq / Llama 3 (SSE)
 */
const streamWithGroq = async (prompt, onChunk) => {
  const groq = getGroqClient();
  const stream = await groq.chat.completions.create({
    model: 'llama3-70b-8192',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1024,
    stream: true,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }

  return fullText;
};

/**
 * Rewrite query for better retrieval
 */
const rewriteQuery = async (originalQuery) => {
  const prompt = `Rewrite the following question to be more specific and optimized for searching SOP documents. 
Keep it concise. Only return the rewritten query, nothing else.
Original: ${originalQuery}
Rewritten:`;

  try {
    const provider = appConfig.llmProvider;
    let result;
    if (provider === 'groq') {
      result = await generateWithGroq(prompt);
    } else {
      result = await generateWithGemini(prompt);
    }
    return result.text.trim();
  } catch (e) {
    logger.warn(`Query rewrite failed, using original: ${e.message}`);
    return originalQuery;
  }
};

/**
 * Main generate function — routes to correct provider
 */
const generateAnswer = async (query, contextChunks) => {
  const prompt = buildRAGPrompt(query, contextChunks);
  const provider = appConfig.llmProvider;

  logger.debug(`Generating answer with provider: ${provider}`);

  if (provider === 'groq') {
    return generateWithGroq(prompt);
  }
  return generateWithGemini(prompt);
};

/**
 * Main stream function — routes to correct provider
 */
const streamAnswer = async (query, contextChunks, onChunk) => {
  const prompt = buildRAGPrompt(query, contextChunks);
  const provider = appConfig.llmProvider;

  logger.debug(`Streaming answer with provider: ${provider}`);

  if (provider === 'groq') {
    return streamWithGroq(prompt, onChunk);
  }
  return streamWithGemini(prompt, onChunk);
};

module.exports = { generateAnswer, streamAnswer, rewriteQuery, buildRAGPrompt };
