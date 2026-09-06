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
    chatModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    embedModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
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
