import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let chatModel = null;
let embedModel = null;

export function getGeminiAI() {
  if (!process.env.GOOGLE_API_KEY || process.env.AI_ENABLED === 'false') {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const embedName = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';
    chatModel = genAI.getGenerativeModel({ model: modelName });
    embedModel = genAI.getGenerativeModel({ model: embedName });
  }
  return { genAI, chatModel, embedModel };
}

export async function testGeminiPing() {
  const ai = getGeminiAI();
  if (!ai) {
    return false;
  }
  try {
    const res = await ai.chatModel.generateContent('ping');
    return Boolean(res && res.response);
  } catch (err) {
    console.error('Gemini health ping failed:', err.message);
    return false;
  }
}
