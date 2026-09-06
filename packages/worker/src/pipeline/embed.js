import { GoogleGenerativeAI } from '@google/generative-ai';
import pgvector from 'pgvector/pg';

let embedModel = null;

export function getEmbedModel() {
  if (!embedModel && process.env.GOOGLE_API_KEY && process.env.AI_ENABLED !== 'false') {
    embedModel = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
      .getGenerativeModel({ model: 'gemini-embedding-001' });
  }
  return embedModel;
}

export async function embedAndStore(chunks, db) {
  const model = getEmbedModel();

  for (const c of chunks) {
    let embeddingVector = null;

    if (model) {
      try {
        const { embedding } = await model.embedContent({
          content: { role: 'user', parts: [{ text: c.text }] },
          outputDimensionality: 768,
        });
        embeddingVector = pgvector.toSql(embedding.values);
      } catch (err) {
        console.warn(`[Worker] Failed to embed chunk ${c.chunk_index}:`, err.message);
      }
    }

    await db.query(`
      INSERT INTO documentchunk (
        id, document_id, chunk_index, page_number, section_heading, text, token_count, embedding
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
    `, [
      c.document_id,
      c.chunk_index,
      c.page_number,
      c.section_heading,
      c.text,
      c.token_count,
      embeddingVector
    ]);
  }
}
