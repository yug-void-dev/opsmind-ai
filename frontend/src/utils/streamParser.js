/**
 * Parses SSE (Server-Sent Events) streams from the backend.
 * Handles chunked text, source citations, and error events.
 */

export async function* parseSSEStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ":") continue; // skip heartbeats

        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();

          if (data === "[DONE]") {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            yield parsed;
          } catch {
            // Plain text chunk fallback
            yield { type: "text", content: data };
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Extracts source citations from a message text.
 * Format: [[SOURCE: filename.pdf, Page X, Section Y.Z]]
 */
export function extractCitations(text) {
  const citationRegex = /\[\[SOURCE:\s*([^\]]+)\]\]/g;
  const citations = [];
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    const parts = match[1].split(",").map((s) => s.trim());
    citations.push({
      id: citations.length + 1,
      raw: match[0],
      filename: parts[0] || "Unknown",
      page: parts[1] || null,
      section: parts[2] || null,
      index: match.index,
    });
  }

  return citations;
}

/**
 * Replaces citation markers with superscript references.
 */
export function formatMessageWithCitations(text) {
  let counter = 1;
  return text.replace(/\[\[SOURCE:\s*([^\]]+)\]\]/g, () => {
    return `[${counter++}]`;
  });
}