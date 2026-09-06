import pgvector from 'pgvector/pg';
import { getGeminiAI } from '../ai/gemini.js';
import { buildRAGPrompt } from '../ai/prompts.js';

export async function queryAssistant({ question, wellId, currentDepthM = 2800, formation = 'Barail', radiusKm = 10 }, db) {
  const ai = getGeminiAI();
  if (!ai) {
    return {
      answer: 'AI Assistant is currently offline or disabled. Please use the structured search and risk panel.',
      sourceCards: [],
      degraded: true,
    };
  }

  // 1. Fetch active well coordinates
  const { rows: [well] } = await db.query(
    'SELECT id, name, latitude, longitude FROM well WHERE id = $1',
    [wellId]
  );

  if (!well) {
    return {
      answer: 'The specified well could not be found in active records.',
      sourceCards: [],
    };
  }

  // 2. Structured pre-filter: find candidate document chunks from offset wells within radius and depth range
  const { rows: candidates } = await db.query(`
    SELECT DISTINCT dc.id
    FROM documentchunk dc
    JOIN drillingevent de ON dc.document_id = de.source_document_id
    JOIN well w ON de.well_id = w.id
    WHERE de.review_status = 'APPROVED'
      AND w.id != $1
      AND ST_DWithin(
        w.location,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        $4 * 1000
      )
      AND de.depth_start_m BETWEEN $5 AND $6
  `, [
    wellId,
    well.longitude,
    well.latitude,
    radiusKm,
    currentDepthM - 300,
    currentDepthM + 300
  ]);

  // If no structured candidates, fallback to any approved event chunks near the well
  let candidateIds = candidates.map(c => c.id);
  if (candidateIds.length === 0) {
    const { rows: fallbackChunks } = await db.query(`
      SELECT DISTINCT dc.id
      FROM documentchunk dc
      JOIN drillingevent de ON dc.document_id = de.source_document_id
      JOIN well w ON de.well_id = w.id
      WHERE de.review_status = 'APPROVED'
      LIMIT 30
    `);
    candidateIds = fallbackChunks.map(c => c.id);
  }

  if (candidateIds.length === 0) {
    return {
      answer: 'The available historical records do not contain relevant evidence for this query.',
      sourceCards: []
    };
  }

  // 3. Generate query embedding & retrieve Top 10 by cosine similarity
  let queryEmbedding;
  try {
    const embedRes = await ai.embedModel.embedContent({
      content: { role: 'user', parts: [{ text: question }] },
      outputDimensionality: 768,
    });
    queryEmbedding = embedRes.embedding.values;
  } catch (err) {
    console.error('Failed to embed question:', err.message);
    return {
      answer: 'Unable to process semantic search at this time.',
      sourceCards: []
    };
  }

  const { rows: top10 } = await db.query(`
    SELECT dc.*, w.name as well_name, de.depth_start_m, de.formation, de.event_type,
           1 - (dc.embedding <=> $1::vector) as similarity
    FROM documentchunk dc
    LEFT JOIN drillingevent de ON dc.document_id = de.source_document_id
    LEFT JOIN well w ON de.well_id = w.id
    WHERE dc.id = ANY($2)
    ORDER BY dc.embedding <=> $1::vector ASC
    LIMIT 10
  `, [pgvector.toSql(queryEmbedding), candidateIds]);

  if (top10.length === 0) {
    return {
      answer: 'The available historical records do not contain sufficient information to answer this query.',
      sourceCards: []
    };
  }

  // 4. Rerank candidates: 0.60*similarity + 0.25*depthProximity + 0.15*formationMatch
  const scored = top10.map(c => {
    const depthDelta = Math.abs((Number(c.depth_start_m) || currentDepthM) - currentDepthM);
    const depthProximity = Math.max(0, 1 - depthDelta / 300);
    const formationMatch = c.formation === formation ? 1 : 0;
    const similarity = Math.max(0, Number(c.similarity) || 0);
    const rerankScore = (0.60 * similarity) + (0.25 * depthProximity) + (0.15 * formationMatch);
    return { ...c, rerankScore };
  });

  scored.sort((a, b) => b.rerankScore - a.rerankScore);
  const top6 = scored.slice(0, 6);

  // 5. Generate grounded answer
  const prompt = buildRAGPrompt(question, top6, {
    wellId,
    wellName: well.name,
    currentDepthM,
    formation
  });

  const genResult = await ai.chatModel.generateContent(prompt);
  const rawAnswer = genResult.response.text();

  // 6. Hallucination check: ensure well names or documents are cited
  const validEvidence = top6.filter(c => c.well_name && rawAnswer.includes(c.well_name));
  let finalAnswer = rawAnswer;

  if (validEvidence.length === 0 && !rawAnswer.toLowerCase().includes('insufficient')) {
    finalAnswer = 'The available historical records do not contain sufficient verified evidence to answer this question reliably.';
  }

  return {
    answer: finalAnswer,
    sourceCards: top6.map(c => ({
      wellName: c.well_name || 'Offset Well',
      depthM: c.depth_start_m ? Number(c.depth_start_m) : null,
      formation: c.formation || 'Unknown',
      eventType: c.event_type || 'INCIDENT',
      documentId: c.document_id,
      page: c.page_number || 1,
      snippet: c.text ? c.text.slice(0, 180) + '...' : '',
      similarity: c.similarity ? Math.round(c.similarity * 100) : null,
    }))
  };
}
