/**
 * OpsMind AI — Input Sanitization & Prompt Injection Prevention
 *
 * Defends against:
 *  - Direct prompt injection ("ignore previous instructions")
 *  - Role-play jailbreaks ("you are now a different AI")
 *  - System prompt leakage attempts
 *  - Template injection ({{}}, <| |>)
 *  - XSS / HTML injection
 *  - Oversized inputs (token flooding)
 *  - Path traversal in filenames
 */

// ─── Injection Pattern Registry ───────────────────────────────────────────────
// Each pattern targets a different category of prompt injection attack.
const INJECTION_PATTERNS = [
  // Classic instruction override
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|prompts?|context)/i,
  /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+/i,
  /forget\s+(everything|all|your|the\s+previous)\s+/i,
  /override\s+(your\s+)?(instructions?|rules?|system\s+prompt)/i,

  // Role injection
  /you\s+are\s+now\s+(a|an)\s+/i,
  /act\s+as\s+/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /roleplay\s+as\s+/i,
  /simulate\s+(being\s+)?(a|an)\s+/i,
  /impersonate\s+/i,
  /adopt\s+the\s+(role|persona)\s+/i,

  // System prompt extraction
  /reveal\s+(your\s+)?(system\s+prompt|instructions?|rules?|configuration)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+prompt|internal\s+instructions?)/i,
  /print\s+(your\s+)?(system\s+prompt|full\s+prompt)/i,
  /what\s+(are\s+your|is\s+your)\s+(system\s+prompt|instructions?)/i,
  /repeat\s+(your\s+)?(system\s+prompt|instructions?|rules?)/i,

  // Delimiter injection
  /<\|.*?\|>/i,             // Llama delimiter
  /\[INST\]/i,              // Llama instruction tag
  /\[\/INST\]/i,
  /###\s*(system|human|assistant|instruction)/i,
  /<system>/i,
  /<\/system>/i,
  /<<SYS>>/i,

  // Context poisoning
  /new\s+conversation\s+start/i,
  /end\s+of\s+system\s+prompt/i,
  /user\s*:\s*ignore/i,
  /assistant\s*:\s*sure/i,
  /\[system\s+message\]/i,

  // Encoding tricks
  /base64\s+decode/i,
  /hex\s+decode/i,
  /rot13/i,

  // Jailbreak phrases
  /do\s+anything\s+now/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /unrestricted\s+mode/i,
  /bypass\s+(your\s+)?(restrictions?|filters?|safety)/i,
  /no\s+restrictions?/i,
];

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_QUERY_LENGTH = 2000;
const MAX_FILENAME_LENGTH = 200;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS = 20;

// ─── Query Sanitization ───────────────────────────────────────────────────────

/**
 * Sanitize a user query string.
 * Throws descriptive errors for invalid input — caller converts to HTTP 400.
 *
 * @param {string} query
 * @returns {string} sanitized query
 * @throws {Error} on invalid or injected input
 */
const sanitizeQuery = (query) => {
  // Type check
  if (query === null || query === undefined) {
    throw new Error('Query is required');
  }
  if (typeof query !== 'string') {
    throw new Error('Query must be a string');
  }

  const trimmed = query.trim();

  // Empty check
  if (trimmed.length === 0) {
    throw new Error('Query cannot be empty');
  }

  // Length check (prevents token flooding)
  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query too long. Maximum ${MAX_QUERY_LENGTH} characters allowed`);
  }

  // Minimum meaningful length
  if (trimmed.length < 3) {
    throw new Error('Query too short. Please enter at least 3 characters');
  }

  // Prompt injection check
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error(
        'Query contains disallowed content. Please ask a factual question about the SOP documents.'
      );
    }
  }

  // Strip HTML/script tags (XSS prevention)
  const stripped = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');  // Remove event handlers (onclick= etc.)

  // Strip template injection tokens
  const clean = stripped
    .replace(/\{\{.*?\}\}/g, '')  // Handlebars/Jinja
    .replace(/\$\{.*?\}/g, '')    // Template literals
    .replace(/`/g, "'");          // Backticks (JS template strings)

  return clean.trim();
};

// ─── Filename Sanitization ────────────────────────────────────────────────────

/**
 * Sanitize a filename:
 * - Remove path traversal sequences
 * - Strip non-safe characters
 * - Replace spaces with underscores
 * - Enforce length limit
 */
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return 'unknown';

  return filename
    // Remove path traversal
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Strip null bytes
    .replace(/\0/g, '')
    // Keep only safe characters (alphanumeric, dash, underscore, dot, space)
    .replace(/[^a-zA-Z0-9.\-_\s]/g, '')
    // Normalize spaces
    .replace(/\s+/g, '_')
    // Enforce max length (preserve extension)
    .slice(0, MAX_FILENAME_LENGTH)
    .trim() || 'unknown';
};

// ─── Tag Sanitization ─────────────────────────────────────────────────────────

/**
 * Sanitize and normalize an array of tags.
 * Tags must be lowercase alphanumeric with hyphens/underscores.
 */
const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];

  return tags
    .filter((t) => t !== null && t !== undefined && typeof t === 'string')
    .map((t) =>
      t
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\-_]/g, '') // Strict whitelist
    )
    .filter((t) => t.length > 0 && t.length <= MAX_TAG_LENGTH)
    .slice(0, MAX_TAGS);
};

// ─── Generic String Sanitizer ─────────────────────────────────────────────────

/**
 * Sanitize a generic string field (names, titles, etc.)
 */
const sanitizeString = (str, maxLength = 200) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/<[^>]+>/g, '')       // Strip HTML
    .replace(/[<>'"&]/g, '')       // Strip injection chars
    .slice(0, maxLength);
};

module.exports = {
  sanitizeQuery,
  sanitizeFilename,
  sanitizeTags,
  sanitizeString,
  INJECTION_PATTERNS,
};
