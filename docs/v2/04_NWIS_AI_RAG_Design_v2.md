# AI / NLP / OCR / RAG Design — v2
## eRTMAC-NWIS (Nearby Wells Intelligence System)
**Hackathon Planning Pack | SIH 26121 | Oil India Limited**
**Document Version:** 2.1 | **Date:** 06 September 2026

> **Change log from v2.0:** All AI SDK references migrated from Python to **`@google/generative-ai` (npm)**. Code examples rewritten in JavaScript/Node.js. Ollama fallback updated to use `ollama` npm package.

---

## 1. AI Objectives

1. Convert unstructured drilling reports into searchable, structured knowledge.
2. Retrieve the most relevant historical evidence for a given drilling context.
3. Generate evidence-backed answers to engineer questions (never fabricate facts).
4. Support an explainable risk score rather than autonomous operational control.

---

## 2. Model Selections

### 2.1 Primary Stack (Google AI Studio — Free Tier)

| Role | Model | npm Package | Rationale |
|---|---|---|---|
| **Text generation / RAG** | `gemini-1.5-flash-latest` | `@google/generative-ai` | Free tier, 1M token context, ~2–4 s response time, strong instruction following |
| **Structured extraction** | `gemini-1.5-flash-latest` | `@google/generative-ai` | JSON mode (`responseMimeType: 'application/json'`) for reliable structured output |
| **Embeddings** | `text-embedding-004` | `@google/generative-ai` | 768-dimension, free tier, strong retrieval benchmark scores, same API key |

**Basic usage (Node.js):**
```js
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Generation
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
const result = await model.generateContent(prompt);
const text = result.response.text();

// Embeddings
const embedModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
const { embedding } = await embedModel.embedContent(chunkText);
const vector = embedding.values;  // float32[768]
```

> **Note:** A valid `GOOGLE_API_KEY` from [Google AI Studio](https://aistudio.google.com) is required. Verify the key works with both models before Hour 0 of the hackathon.

---

## 3. Document Processing Pipeline

```
Upload Flow (Node.js Worker):
  PDF Upload
      │
      ▼
  [1] Assign document_id, version, checksum (SHA-256); store in MinIO via @aws-sdk/client-s3
      │
      ▼
  [2] pdf-parse text extraction
      │  If text < 100 chars/page → tesseract.js OCR (300 DPI, PSM 3)
      │
      ▼
  [3] Normalization (JS string processing)
      │  - Standardize depth units → metres (detect ft, convert: 1 ft = 0.3048 m)
      │  - Normalize date formats → ISO 8601
      │  - Normalize formation names (trim whitespace, Title Case)
      │  - Strip headers/footers using page boundary heuristics
      │
      ▼
  [4] Chunking (pure JS)
      │  Chunk size: 512 tokens (≈ 380 words)
      │  Overlap: 20% = 102 tokens (≈ 76 words)
      │  Metadata per chunk: { document_id, page_number, chunk_index, section_heading }
      │
      ▼
  [5] Structured Extraction (@google/generative-ai, JSON mode)
      │  model.generateContent() with responseMimeType: 'application/json'
      │  Output: array of DrillingEvent candidates per chunk
      │
      ▼
  [6] Embedding (text-embedding-004 via @google/generative-ai)
      │  embedModel.embedContent(chunkText) → vector float32[768]
      │  Store in pgvector via pg: INSERT INTO documentchunk (embedding) VALUES ($1::vector)
      │
      ▼
  [7] Send extracted DrillingEvent records to human review queue
      │  status = EXTRACTED
      │  Data Steward reviews → REVIEWED → APPROVED
```

---

## 4. RAG Strategy

### 4.1 Query Understanding

Extract from the user's natural-language question:
- `well_id` — mentioned explicitly (e.g., "Well-17") or inferred from active well context
- `depth_m` — numeric depth mention (e.g., "around 2,800 m")
- `depth_window_m` — default ±100 m if not specified
- `formation` — formation name if mentioned
- `event_type` — event category if mentioned (e.g., "mud loss", "stuck pipe")
- `query_intent` — `depth_lookup | event_lookup | mitigation_lookup | comparison | adversarial`

### 4.2 Candidate Retrieval

```js
// Step 1: Structured pre-filter (SQL via pg)
const { rows: candidates } = await db.query(`
  SELECT dc.id, dc.text, dc.document_id, dc.page_number
  FROM documentchunk dc
  JOIN drillingevent de ON dc.document_id = de.source_document_id
  JOIN well w ON de.well_id = w.id
  WHERE de.review_status = 'APPROVED'
    AND ST_DWithin(w.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
    AND de.depth_start_m BETWEEN $4 AND $5
`, [activeLon, activeLat, radiusM, depthMin, depthMax]);

// Step 2: Vector similarity (pgvector via pg)
const queryEmbedding = await embedModel.embedContent(userQuestion);
const vector = queryEmbedding.embedding.values;
const candidateIds = candidates.map(c => c.id);

const { rows: top10 } = await db.query(`
  SELECT id, text, 1 - (embedding <=> $1::vector) AS similarity
  FROM documentchunk
  WHERE id = ANY($2)
  ORDER BY embedding <=> $1::vector
  LIMIT 10
`, [`[${vector.join(',')}]`, candidateIds]);
```

### 4.3 Reranking

```js
function rerankScore(chunk, queryCtx) {
  const vectorSim    = chunk.similarity;                           // 0–1
  const depthMatch   = depthProximityScore(chunk, queryCtx.depthM); // 0–1
  const formationHit = chunk.formation === queryCtx.formation ? 1.0 : 0.0;
  return (0.60 * vectorSim) + (0.25 * depthMatch) + (0.15 * formationHit);
}
const top6 = top10.sort((a, b) => rerankScore(b, ctx) - rerankScore(a, ctx)).slice(0, 6);
```

### 4.4 Context Window Management

- Top-6 chunks at 512 tokens each = max 3,072 tokens of context.
- Gemini Flash 1.5 has 1M token context — no truncation needed at demo scale.
- For safety: if total chunk tokens > 4,000, summarize lowest-scoring chunks to 150 tokens each.

### 4.5 Answer Generation

```js
// Assemble context string from top-6 chunks
const evidenceContext = top6.map((c, i) =>
  `[${i+1}] Well: ${c.well_name}, Depth: ${c.depth}m, Doc: ${c.document_id}, Page: ${c.page}\n${c.text}`
).join('\n---\n');

const prompt = `${SYSTEM_PROMPT}\n\nEVIDENCE:\n${evidenceContext}\n\nUSER QUESTION: ${question}\nCURRENT CONTEXT: Active Well ${wellId} at ${depthM}m, Formation: ${formation}`;

const result = await model.generateContent(prompt);
const answer = result.response.text();
```

### 4.6 Response Validation

Before returning the answer:
1. Check that the response references at least one evidence source ID.
2. If the response contains a specific depth/event claim, verify a matching chunk exists.
3. If validation fails → return: *"Insufficient evidence in historical records to answer this question reliably."*

### 4.7 Presentation

- Display answer text prominently.
- Below the answer: source cards (one per cited chunk) showing: well name, depth, event type, document name, page number.
- Show retrieval count: *"Based on 6 retrieved records from 3 wells."*

---

## 5. System Prompt Contract

```
You are NWIS (Nearby Wells Intelligence System), a drilling decision-support assistant for Oil India Limited.

RULES — follow all of these without exception:
1. Answer ONLY from the EVIDENCE provided above. Do not use your training knowledge to state historical facts.
2. Clearly distinguish observed facts (from evidence) from inference (your reasoning).
3. NEVER invent a mitigation strategy. If no mitigation is in the evidence, say so explicitly.
4. If the evidence is insufficient to answer the question, respond: "The available historical records do not contain sufficient information to answer this question. I found [N] records but none match the specific query."
5. Always include the Well ID, depth range, and event type when referring to a historical event.
6. Reference source documents by their document ID and page number.
7. NEVER provide instructions that could directly command drilling equipment or personnel to take safety-critical actions.
8. Keep answers concise (≤ 200 words for single questions). Use bullet points for multi-event answers.
9. End every answer with: "Evidence source: [list of Well IDs and Document IDs used]."
```

---

## 6. Structured Extraction Prompt Template

```js
// Structured extraction using @google/generative-ai JSON mode
const extractionModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  generationConfig: { responseMimeType: 'application/json' },
});

const extractionPrompt = `
You are a drilling data extraction assistant. Extract structured drilling events from the following text excerpt.

For each drilling event found, return a JSON object:
{
  "event_type": one of [MUD_LOSS, KICK, STUCK_PIPE, TORQUE_SPIKE, CEMENTING_ISSUE, NPT, BHA_FAILURE, WASHOUT, OTHER],
  "depth_start_m": number or null,
  "depth_end_m": number or null,
  "formation": string or null,
  "severity": one of [LOW, MEDIUM, HIGH, UNKNOWN],
  "duration_hrs": number or null,
  "description": "short factual summary (\u2264 50 words)",
  "mitigation": "recorded mitigation or null",
  "confidence": one of [HIGH, MEDIUM, LOW]
}

Return a JSON array. If no events found, return [].
Convert all depths to metres (1 ft = 0.3048 m). Do not infer information not in the text.

TEXT:
\"\"\"${chunkText}\"\"\"
`;

const result = await extractionModel.generateContent(extractionPrompt);
const events = JSON.parse(result.response.text());
```

---

## 7. Evaluation Benchmark — 20 Questions

> These questions are run against the synthetic dataset to validate retrieval quality before the demo. See `09_NWIS_Evaluation_Questions.md` for the full set with expected answers.

**Category distribution:**

| Category | Count | Purpose |
|---|---|---|
| Depth lookup | 5 | Retrieve events at a specific depth range |
| Event lookup | 4 | Find events by type across wells |
| Mitigation lookup | 4 | Find what was done to resolve an event |
| Comparison | 4 | Compare conditions across wells |
| Adversarial | 3 | Verify system says "insufficient evidence" correctly |
| **Total** | **20** | — |

**Pass criteria:** ≥ 80% of non-adversarial questions return ≥ 1 relevant record. 100% of adversarial questions should return an "insufficient evidence" response (not a fabricated answer).

---

## 8. AI Safety & Trust

| Concern | Control |
|---|---|
| Autonomous decision making | System prompt rule 7; UI labels all output as "Decision Support — Not an Instruction" |
| Data privacy | Do not send synthetic/real OIL document text to any external API not listed in §2. All AI calls go to Google AI Studio only. |
| Auditability | Record: `model_name`, `model_version`, `prompt_version`, `retrieval_ids[]`, `timestamp_utc` for every AI call |
| Demo data labelling | All synthetic records labelled `[SYNTHETIC – DEMO DATA]` in extraction results and source cards |
| Hallucination | Response validation (§4.6) rejects uncited factual claims |
| Bias in extraction | Human review step (Data Steward) catches systematic extraction errors before records reach APPROVED status |
