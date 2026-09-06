export function chunkPages(pages, docId) {
  const chunks = [];
  let chunkIndex = 0;

  for (const { page, text } of pages) {
    if (!text || text.trim().length === 0) continue;

    const words = text.split(/\s+/).filter(Boolean);
    const size = 380; // approx 512 tokens
    const step = 304; // 20% overlap

    for (let i = 0; i < words.length; i += step) {
      const chunkWords = words.slice(i, i + size);
      const chunkText = chunkWords.join(' ');

      // Extract rudimentary section heading if first line looks like a header
      const firstLine = chunkText.split('\n')[0] || '';
      const sectionHeading = firstLine.length < 80 && (firstLine.includes('SECTION') || firstLine.includes('Section') || firstLine.includes('='))
        ? firstLine.replace(/=/g, '').trim()
        : null;

      chunks.push({
        document_id: docId,
        chunk_index: chunkIndex++,
        page_number: page,
        section_heading: sectionHeading,
        text: chunkText,
        token_count: Math.round(chunkWords.length * 1.3),
      });

      if (i + size >= words.length) break;
    }
  }

  return chunks;
}
