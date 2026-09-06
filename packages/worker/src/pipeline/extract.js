import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';

export async function extractText(buffer) {
  const data = await pdf(buffer);
  const pages = data.text.split('\f');
  const results = [];

  for (let i = 0; i < pages.length; i++) {
    const text = pages[i].trim();
    if (text.length >= 100) {
      results.push({
        page: i + 1,
        text,
        method: 'native'
      });
    } else {
      console.log(`[Worker] Page ${i + 1} has sparse text (${text.length} chars), running OCR...`);
      try {
        const ocrResult = await Tesseract.recognize(buffer, 'eng');
        results.push({
          page: i + 1,
          text: ocrResult.data.text || text,
          method: 'ocr'
        });
      } catch (ocrErr) {
        console.warn(`[Worker] OCR failed for page ${i + 1}, using native text:`, ocrErr.message);
        results.push({
          page: i + 1,
          text,
          method: 'native-fallback'
        });
      }
    }
  }

  return results;
}
