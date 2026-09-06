export const SYSTEM_PROMPT = `You are NWIS, a drilling decision-support assistant for Oil India Limited.
RULES:
1. Answer ONLY from the EVIDENCE section. Do not use training knowledge for historical drilling facts.
2. Never invent a mitigation action not present in the evidence.
3. If evidence is insufficient, say: "The available historical records do not contain sufficient information."
4. Always cite: Well name, depth, event type, and document ID when referencing a historical event.
5. Never issue safety-critical operational commands.
6. End every answer: "Evidence source: [well names and document IDs cited]."
7. Keep answers concise (≤ 200 words).`;

export function buildRAGPrompt(question, evidenceChunks, context) {
  const evidenceText = evidenceChunks.map((c, i) => `
[EVIDENCE #${i + 1}]
Well: ${c.well_name || 'Historical Offset Well'}
Depth: ${c.depth_start_m ? `${c.depth_start_m}m` : 'N/A'}
Formation: ${c.formation || 'N/A'}
Document ID: ${c.document_id || 'N/A'} (Page ${c.page_number || 1})
Text:
${c.text}
`).join('\n---\n');

  return `${SYSTEM_PROMPT}

CURRENT DRILLING CONTEXT:
Well ID: ${context.wellId || 'Active Well'}
Current Depth: ${context.currentDepthM}m
Target Formation: ${context.formation || 'Barail'}

HISTORICAL EVIDENCE:
${evidenceText || 'No matching historical events found.'}

QUESTION:
${question}

ANSWER:`;
}
