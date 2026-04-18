const { chunkText, chunkPages } = require('../src/utils/chunker');

describe('Chunker Utility', () => {
  const sampleText = 'A'.repeat(500) + ' ' + 'B'.repeat(500) + ' ' + 'C'.repeat(500);

  describe('chunkText()', () => {
    it('should return chunks for valid text', () => {
      const chunks = chunkText(sampleText, 1);
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((c) => {
        expect(c).toHaveProperty('text');
        expect(c).toHaveProperty('pageNumber', 1);
        expect(c).toHaveProperty('chunkIndex');
      });
    });

    it('should respect chunkSize and overlap options', () => {
      const chunks = chunkText(sampleText, 1, { chunkSize: 300, overlap: 50 });
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should return empty array for empty text', () => {
      const chunks = chunkText('', 1);
      expect(chunks).toEqual([]);
    });

    it('should skip tiny chunks under 50 chars', () => {
      const tiny = 'Hi';
      const chunks = chunkText(tiny, 1);
      expect(chunks).toEqual([]);
    });

    it('should handle single-page short text', () => {
      const text = 'This is a standard operating procedure for employee onboarding. '.repeat(5);
      const chunks = chunkText(text, 1);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('chunkPages()', () => {
    it('should process multiple pages correctly', () => {
      const pages = [
        { pageNumber: 1, text: 'Page 1 content. '.repeat(100) },
        { pageNumber: 2, text: 'Page 2 content. '.repeat(100) },
      ];
      const chunks = chunkPages(pages);
      expect(chunks.length).toBeGreaterThan(0);
      const page1Chunks = chunks.filter((c) => c.pageNumber === 1);
      const page2Chunks = chunks.filter((c) => c.pageNumber === 2);
      expect(page1Chunks.length).toBeGreaterThan(0);
      expect(page2Chunks.length).toBeGreaterThan(0);
    });

    it('should assign sequential global chunk indexes', () => {
      const pages = [
        { pageNumber: 1, text: 'A'.repeat(2000) },
        { pageNumber: 2, text: 'B'.repeat(2000) },
      ];
      const chunks = chunkPages(pages);
      chunks.forEach((c, i) => {
        expect(c.chunkIndex).toBe(i);
      });
    });
  });
});
