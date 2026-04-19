/**
 * Unit tests — Retrieval Pipeline
 * Tests RRF fusion, threshold gate, and citation building logic.
 * No DB or external API required.
 */

// ─── RRF Fusion ───────────────────────────────────────────────────────────────

const { reciprocalRankFusion, applyThresholdGate } = require('../src/services/retrievalService');

describe('reciprocalRankFusion()', () => {
  const makeChunk = (id, vectorScore = 0, keywordScore = 0) => ({
    _id: { toString: () => id },
    documentId: 'doc1',
    documentName: 'Test SOP.pdf',
    text: `Chunk content for ${id}`,
    pageNumber: 1,
    chunkIndex: 0,
    vectorScore,
    keywordScore,
  });

  it('ranks chunks that appear in both lists higher', () => {
    const vectorChunks = [
      makeChunk('chunk1', 0.95),
      makeChunk('chunk2', 0.85),
      makeChunk('chunk3', 0.80),
    ];
    const keywordChunks = [
      makeChunk('chunk2', 0, 0.9),  // chunk2 appears in both
      makeChunk('chunk4', 0, 0.8),
      makeChunk('chunk1', 0, 0.7),  // chunk1 also in both
    ];

    const fused = reciprocalRankFusion(vectorChunks, keywordChunks, 10);

    expect(fused.length).toBeGreaterThan(0);
    expect(fused.length).toBeLessThanOrEqual(10);

    // Chunks appearing in both should have higher hybrid scores
    const chunk1 = fused.find((c) => c._id.toString() === 'chunk1');
    const chunk4 = fused.find((c) => c._id.toString() === 'chunk4');

    if (chunk1 && chunk4) {
      expect(chunk1.hybridScore).toBeGreaterThan(chunk4.hybridScore);
    }
  });

  it('returns at most topN results', () => {
    const vectorChunks = Array.from({ length: 10 }, (_, i) => makeChunk(`v${i}`, 0.9 - i * 0.05));
    const keywordChunks = Array.from({ length: 10 }, (_, i) => makeChunk(`k${i}`, 0, 0.8 - i * 0.05));

    const fused = reciprocalRankFusion(vectorChunks, keywordChunks, 5);
    expect(fused.length).toBeLessThanOrEqual(5);
  });

  it('handles empty vector results gracefully', () => {
    const keywordChunks = [makeChunk('k1', 0, 0.9), makeChunk('k2', 0, 0.8)];
    const fused = reciprocalRankFusion([], keywordChunks, 5);
    expect(fused.length).toBeGreaterThan(0);
    expect(fused.every((c) => c.hybridScore > 0)).toBe(true);
  });

  it('handles empty keyword results gracefully', () => {
    const vectorChunks = [makeChunk('v1', 0.9), makeChunk('v2', 0.85)];
    const fused = reciprocalRankFusion(vectorChunks, [], 5);
    expect(fused.length).toBeGreaterThan(0);
  });

  it('handles both lists empty', () => {
    const fused = reciprocalRankFusion([], [], 5);
    expect(fused).toEqual([]);
  });

  it('assigns hybridScore to all results', () => {
    const vectorChunks = [makeChunk('v1', 0.9), makeChunk('v2', 0.85)];
    const keywordChunks = [makeChunk('k1', 0, 0.8)];
    const fused = reciprocalRankFusion(vectorChunks, keywordChunks, 10);
    fused.forEach((c) => {
      expect(typeof c.hybridScore).toBe('number');
      expect(c.hybridScore).toBeGreaterThan(0);
    });
  });

  it('deduplicates chunks that appear in both lists', () => {
    const shared = makeChunk('shared', 0.9, 0.8);
    const vectorChunks = [shared, makeChunk('v1', 0.85)];
    const keywordChunks = [shared, makeChunk('k1', 0, 0.75)];

    const fused = reciprocalRankFusion(vectorChunks, keywordChunks, 10);
    const sharedResults = fused.filter((c) => c._id.toString() === 'shared');
    expect(sharedResults.length).toBe(1); // Not duplicated
  });
});

// ─── Threshold Gate ───────────────────────────────────────────────────────────

describe('applyThresholdGate()', () => {
  const makeChunk = (vectorScore, hybridScore) => ({
    _id: 'test',
    text: 'content',
    vectorScore,
    hybridScore,
  });

  it('returns only chunks above threshold', () => {
    const chunks = [
      makeChunk(0.90, 0.85),  // above
      makeChunk(0.75, 0.70),  // above (default threshold 0.70)
      makeChunk(0.65, 0.60),  // below
      makeChunk(0.50, 0.45),  // below
    ];

    const passed = applyThresholdGate(chunks, 0.70);
    expect(passed.length).toBe(2);
    passed.forEach((c) => expect(c.vectorScore).toBeGreaterThanOrEqual(0.70));
  });

  it('returns empty array when all chunks below threshold', () => {
    const chunks = [
      makeChunk(0.50, 0.45),
      makeChunk(0.40, 0.35),
    ];
    expect(applyThresholdGate(chunks, 0.70)).toEqual([]);
  });

  it('returns all chunks when all above threshold', () => {
    const chunks = [
      makeChunk(0.95, 0.90),
      makeChunk(0.88, 0.85),
      makeChunk(0.80, 0.75),
    ];
    expect(applyThresholdGate(chunks, 0.70).length).toBe(3);
  });

  it('uses hybridScore as fallback when vectorScore is undefined', () => {
    const chunks = [
      { _id: '1', text: 'content', hybridScore: 0.85 },  // vectorScore absent
      { _id: '2', text: 'content', hybridScore: 0.50 },
    ];
    const passed = applyThresholdGate(chunks, 0.70);
    expect(passed.length).toBe(1);
  });

  it('handles empty chunk array', () => {
    expect(applyThresholdGate([], 0.70)).toEqual([]);
  });

  it('threshold of 0 passes all chunks', () => {
    const chunks = [makeChunk(0.10, 0.05), makeChunk(0.20, 0.15)];
    expect(applyThresholdGate(chunks, 0).length).toBe(2);
  });

  it('threshold of 1.0 blocks all real-world chunks', () => {
    const chunks = [makeChunk(0.99, 0.95), makeChunk(0.85, 0.80)];
    expect(applyThresholdGate(chunks, 1.0).length).toBe(0);
  });
});
