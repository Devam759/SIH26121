import { getGeminiAI } from '../ai/gemini.js';

export async function generateEmbedding(text) {
  const ai = getGeminiAI();
  if (!ai || !ai.embedModel) {
    throw new Error('Embedding model not available');
  }
  const result = await ai.embedModel.embedContent(text);
  return result.embedding.values;
}
