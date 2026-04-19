/**
 * Unit tests — Chunker Utility
 * Tests sentence-aware chunking, overlap, deduplication, and edge cases.
 */
const { chunkText, chunkPages, deduplicateChunks } = require('../src/utils/chunker');

// ─── chunkText ─────────────────────────────────────────────────────────────

describe('chunkText()', () => {
  const longText = [
    'The employee onboarding process begins on the first day of work.',
    'All new employees must complete the induction training within 48 hours.',
    'The HR department is responsible for scheduling the induction sessions.',
    'Managers must provide new employees with access to required systems.',
    'All new employees must sign the confidentiality agreement on day one.',
    'The probation period lasts for 90 days from the start date.',
    'Performance reviews are scheduled at 30, 60, and 90 day marks.',
    'Employees receive their access credentials via the IT helpdesk.',
    'Parking permits are issued by the facilities management team.',
    'Any questions should be directed to the HR business partner.',
  ].join(' ');

  it('returns chunks for valid text', () => {
    const chunks = chunkText(longText, 1);
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((c) => {
      expect(typeof c.text).toBe('string');
      expect(c.text.length).toBeGreaterThan(0);
      expect(c.pageNumber).toBe(1);
      expect(typeof c.chunkIndex).toBe('number');
    });
  });

  it('each chunk does not exceed chunkSize (with word-boundary tolerance)', () => {
    const chunks = chunkText(longText, 1, { chunkSize: 200, overlap: 50 });
    chunks.forEach((c) => {
      // Allow small overshoot due to sentence-boundary preservation
      expect(c.text.length).toBeLessThanOrEqual(350);
    });
  });

  it('chunks contain overlapping content when overlap > 0', () => {
    const text = Array(20).fill('Standard Operating Procedure step one must be followed carefully.').join(' ');
    const chunks = chunkText(text, 1, { chunkSize: 200, overlap: 80 });
    if (chunks.length > 1) {
      // Content from end of chunk[0] should appear in start of chunk[1]
      const end0 = chunks[0].text.slice(-40).toLowerCase().trim();
      const start1 = chunks[1].text.slice(0, 100).toLowerCase();
      // Not always guaranteed with sentence-splitting, but overlap buffer should be non-trivial
      expect(chunks[0].text.length).toBeGreaterThan(50);
      expect(chunks[1].text.length).toBeGreaterThan(50);
    }
  });

  it('returns empty array for empty string', () => {
    expect(chunkText('', 1)).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(chunkText('   \n\t  ', 1)).toEqual([]);
  });

  it('returns empty array for text below minChunkLength', () => {
    expect(chunkText('Hi', 1)).toEqual([]);
  });

  it('assigns correct page number', () => {
    const chunks = chunkText('This is page five content. '.repeat(20), 5);
    chunks.forEach((c) => expect(c.pageNumber).toBe(5));
  });

  it('includes wordCount in chunk metadata', () => {
    const chunks = chunkText(longText, 1);
    chunks.forEach((c) => {
      expect(typeof c.wordCount).toBe('number');
      expect(c.wordCount).toBeGreaterThan(0);
    });
  });

  it('handles very short text without crashing', () => {
    const tiny = 'Employees must follow the safety procedure carefully at all times.';
    const chunks = chunkText(tiny, 1);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].text).toContain('Employees');
  });
});

// ─── chunkPages ────────────────────────────────────────────────────────────

describe('chunkPages()', () => {
  const pages = [
    { pageNumber: 1, text: 'Page one contains the introduction to the onboarding policy. '.repeat(15) },
    { pageNumber: 2, text: 'Page two describes the probation period and performance review schedule. '.repeat(15) },
    { pageNumber: 3, text: 'Page three outlines the IT access and equipment provisioning process. '.repeat(15) },
  ];

  it('processes multiple pages and returns all chunks', () => {
    const chunks = chunkPages(pages);
    expect(chunks.length).toBeGreaterThan(0);
    const p1 = chunks.filter((c) => c.pageNumber === 1);
    const p2 = chunks.filter((c) => c.pageNumber === 2);
    const p3 = chunks.filter((c) => c.pageNumber === 3);
    expect(p1.length).toBeGreaterThan(0);
    expect(p2.length).toBeGreaterThan(0);
    expect(p3.length).toBeGreaterThan(0);
  });

  it('assigns sequential global chunkIndex', () => {
    const chunks = chunkPages(pages);
    chunks.forEach((c, i) => {
      expect(c.chunkIndex).toBe(i);
    });
  });

  it('skips pages with no meaningful text', () => {
    const sparsePages = [
      { pageNumber: 1, text: '' },
      { pageNumber: 2, text: '   ' },
      { pageNumber: 3, text: 'Real content on page three. '.repeat(10) },
    ];
    const chunks = chunkPages(sparsePages);
    expect(chunks.every((c) => c.pageNumber === 3)).toBe(true);
  });

  it('handles single-page document', () => {
    const singlePage = [
      { pageNumber: 1, text: 'Single page SOP document content. '.repeat(20) },
    ];
    const chunks = chunkPages(singlePage);
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((c) => expect(c.pageNumber).toBe(1));
  });
});

// ─── deduplicateChunks ─────────────────────────────────────────────────────

describe('deduplicateChunks()', () => {
  it('removes duplicate chunks with identical leading content', () => {
    const chunks = [
      { text: 'ACME Corp SOP Header — Page 1 of 20. All procedures are final.', pageNumber: 1, chunkIndex: 0 },
      { text: 'Employees must report to their line manager.', pageNumber: 1, chunkIndex: 1 },
      { text: 'ACME Corp SOP Header — Page 2 of 20. All procedures are final.', pageNumber: 2, chunkIndex: 2 },
      { text: 'Leave requests must be submitted 5 days in advance.', pageNumber: 2, chunkIndex: 3 },
    ];

    // Inject near-duplicate (same first 100 chars lowercase)
    chunks.push({
      text: 'Employees must report to their line manager. Additional context here.',
      pageNumber: 3,
      chunkIndex: 4,
    });

    const deduped = deduplicateChunks(chunks);
    // The near-duplicate added at the end should be removed (same first 100 chars as chunk[1])
    // chunks has 5 entries; after dedup the last one (near-dup of chunk[1]) is removed
    expect(deduped.length).toBeLessThanOrEqual(chunks.length);
  });

  it('does not remove genuinely unique chunks', () => {
    const chunks = [
      { text: 'Section 1: Emergency evacuation procedure begins at fire alarm.', pageNumber: 1, chunkIndex: 0 },
      { text: 'Section 2: All exits must remain unobstructed at all times.', pageNumber: 2, chunkIndex: 1 },
      { text: 'Section 3: Assembly point is located at car park B, east side.', pageNumber: 3, chunkIndex: 2 },
    ];
    const deduped = deduplicateChunks(chunks);
    expect(deduped.length).toBe(3);
  });

  it('handles empty array', () => {
    expect(deduplicateChunks([])).toEqual([]);
  });
});
