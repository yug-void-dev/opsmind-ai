module.exports = {
  llmProvider: process.env.LLM_PROVIDER || 'gemini',
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'gemini',
  vectorIndexName: process.env.VECTOR_INDEX_NAME || 'vector_index',
  chunkSize: parseInt(process.env.CHUNK_SIZE) || 1000,
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200,
  topKResults: parseInt(process.env.TOP_K_RESULTS) || 5,
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.75,
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 50,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  cacheTTL: parseInt(process.env.CACHE_TTL) || 3600,

  // Anti-hallucination system prompt
  systemPrompt: `You are OpsMind AI, an Enterprise SOP Knowledge Agent. 
Your ONLY job is to answer questions based on the provided context from SOP documents.

STRICT RULES:
1. Answer ONLY from the provided context. Do NOT use any external knowledge.
2. If the answer is not found in the context, respond EXACTLY with: "I don't know based on the provided documents."
3. Always cite the source document and page number.
4. Be precise and factual. Do not speculate or infer beyond what is explicitly stated.
5. If asked about something outside the SOPs, politely redirect to the document scope.
6. Never make up procedures, steps, or policies.`,
};
