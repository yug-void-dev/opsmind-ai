/**
 * Input sanitization utilities
 * Prevents prompt injection, XSS, and malicious inputs
 */

const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions?/i,
  /forget\s+(your|all|previous)\s+(instructions?|context|rules)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /act\s+as\s+(if\s+you\s+are|a|an)\s+/i,
  /disregard\s+(your|all|previous)\s+/i,
  /system\s*prompt/i,
  /\[system\]/i,
  /\[user\]/i,
  /\[assistant\]/i,
  /<\|.*?\|>/i,
  /###\s*(instruction|system|human|assistant)/i,
];

const MAX_QUERY_LENGTH = 2000;
const MAX_FILENAME_LENGTH = 255;

/**
 * Sanitize user query against prompt injection
 */
const sanitizeQuery = (query) => {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  const trimmed = query.trim();

  if (trimmed.length === 0) throw new Error('Query cannot be empty');
  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query too long. Maximum ${MAX_QUERY_LENGTH} characters allowed`);
  }

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error('Query contains disallowed content. Please ask a question about the SOP documents.');
    }
  }

  // Remove potential HTML/script tags
  return trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[{}]/g, ''); // Remove template literals
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  if (!filename) return 'unknown';
  return filename
    .replace(/[^a-zA-Z0-9._\-\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, MAX_FILENAME_LENGTH);
};

/**
 * Sanitize tags array
 */
const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t) => typeof t === 'string')
    .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, ''))
    .filter((t) => t.length > 0 && t.length <= 50)
    .slice(0, 20); // Max 20 tags
};

module.exports = { sanitizeQuery, sanitizeFilename, sanitizeTags };
