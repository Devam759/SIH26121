import { GoogleGenerativeAI } from '@google/generative-ai';

let extractionModel = null;

export function getExtractionModel() {
  if (!extractionModel && process.env.GOOGLE_API_KEY && process.env.AI_ENABLED !== 'false') {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    extractionModel = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });
  }
  return extractionModel;
}

export async function extractEvents(chunkText) {
  const model = getExtractionModel();
  if (!model) {
    return [];
  }

  const prompt = `You are an expert petroleum engineer analyzing historical drilling completion and daily drilling reports.
Extract all drilling events, incidents, or problems described in the text.

Return a JSON array of objects with the following schema:
[
  {
    "event_type": "MUD_LOSS" | "KICK" | "STUCK_PIPE" | "TORQUE_SPIKE" | "CEMENTING_ISSUE" | "NPT" | "BHA_FAILURE" | "WASHOUT" | "OTHER",
    "depth_start_m": number (convert feet to metres if needed, float),
    "depth_end_m": number or null,
    "formation": string or null (e.g. "Barail", "Tipam", "Bhuban", "Kopili", "Bokabil"),
    "severity": "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN",
    "duration_hrs": number or null,
    "description": string (concise summary ≤ 50 words),
    "mitigation": string or null (action taken to resolve or prevent),
    "confidence": "HIGH" | "MEDIUM" | "LOW"
  }
]

If NO drilling events or problems are found, return an empty array [].
Do NOT guess or fabricate depths. Only extract facts present in the text.

TEXT TO ANALYZE:
"""
${chunkText}
"""`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[Worker] Gemini extraction error:', err.message);
    return [];
  }
}
