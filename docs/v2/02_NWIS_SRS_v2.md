# Software Requirements Specification — v2
## eRTMAC-NWIS (Nearby Wells Intelligence System)
**Hackathon Planning Pack | SIH 26121 | Oil India Limited**
**Document Version:** 2.1 | **Date:** 06 September 2026

> **Change log from v2.0:** Backend migrated from Python/FastAPI to **Node.js + Express.js**. Auth spec updated to `jsonwebtoken` + `bcrypt` (npm). Validation updated to Zod.

---

## 1. System Overview

eRTMAC-NWIS is a web-based decision-support application composed of:

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js / React | Dashboard, map, charts, alert panel, AI assistant, document review |
| API | **Node.js 20 + Express.js** | REST endpoints, risk engine, auth middleware, SSE stream handler |
| Relational DB | PostgreSQL 15 + PostGIS + pgvector | Wells, events, formations, trajectories, alerts, users, audit, embeddings |
| DB Client | `pg` (node-postgres) + `pgvector` npm | Parameterized SQL queries; PostGIS and pgvector extension support |
| Document Store | MinIO (S3-compatible) | Raw PDF files |
| Worker | **Node.js worker service** | PDF extraction (`pdf-parse`), OCR (`tesseract.js`), chunking, embedding |
| AI Service | Google AI Studio via `@google/generative-ai` (npm) | Extraction, RAG, risk explanation |
| Real-time | SSE via Node.js `res.write()` | Current depth simulation |

---

## 2. Actors

| Actor | Permissions |
|---|---|
| Engineer | View wells/events/formations, search, ask AI questions, inspect alerts/evidence |
| Data Steward | All Engineer permissions + upload documents, review/edit/approve extracted records |
| Administrator | All Data Steward permissions + manage users, configuration, thresholds, model settings, audit logs |
| System (internal) | Background document processing, SSE stream generation, risk re-evaluation |

---

## 3. Detailed Requirements

### 3.1 Authentication & Access

**Technology commitment:** JSON Web Tokens (JWT) using **`jsonwebtoken`** npm package on the Node.js backend.

- JWT access token: 60-minute expiry (`JWT_EXPIRES_IN=60m`).
- JWT refresh token: 7-day expiry, stored in `httpOnly` cookie.
- Passwords hashed with **`bcrypt`** npm package (min cost factor 12).
- RBAC enforced via Express middleware: `requireRole('engineer' | 'steward' | 'admin')`.
- Secrets (JWT secret, API keys) stored in `.env`; never committed to version control.
- CORS configured via **`cors`** npm; allows only the frontend origin.
- Request validation via **`zod`** schemas on all incoming request bodies.

**Hackathon simplification:** For the MVP demo, seed one account per role. Do not implement email verification.

### 3.2 Well Management

- Create/read/update approved well metadata.
- Store: `id`, `name`, `api_number`, `latitude`, `longitude`, `status` (active/completed/abandoned), `total_depth_m`, `spud_date`, `basin`, `field`.
- Geospatial queries use PostGIS `ST_DWithin` with EPSG:4326 coordinates.
- Update well status requires Administrator or Data Steward role.

### 3.3 Event Management

- Create/read/update drilling events with: `event_type` (locked enum), `depth_start_m`, `depth_end_m`, `formation`, `severity`, `duration_hrs`, `mitigation`, `source_document_id`, `review_status`.
- `event_type` enum values: `MUD_LOSS | KICK | STUCK_PIPE | TORQUE_SPIKE | CEMENTING_ISSUE | NPT | BHA_FAILURE | WASHOUT | OTHER`
- Track review status: `EXTRACTED → REVIEWED → APPROVED`.
- **Pagination required:** `GET /api/v1/wells/{id}/events?page=1&limit=20` — default limit 20, max 100.
- Only `APPROVED` events are used in risk calculation and RAG retrieval.
- Event queries use parameterized SQL via `pg`: `SELECT * FROM drillingevent WHERE well_id=$1 AND depth_start_m BETWEEN $2 AND $3`.

### 3.4 Document Intelligence

- Accept PDF files up to 50 MB via **`multer`** middleware (streams to MinIO via `multer-s3`).
- Extract text using **`pdf-parse`** npm; invoke **`tesseract.js`** OCR if extracted text < 100 characters/page.
- Chunk text: 512 tokens per chunk, 20% overlap, retaining page number and document section in chunk metadata.
- Extract structured events using `@google/generative-ai` with JSON response schema (defined in doc 04); store JSON result.
- Embed each chunk using `text-embedding-004` via `@google/generative-ai` SDK (768-dimension); store in pgvector via `pg` + `pgvector` npm.
- **Pagination required:** `GET /api/v1/documents?page=1&limit=10`.
- Document processing is asynchronous; status polled via `GET /api/v1/documents/{id}`.

### 3.5 Search & RAG

- Structured search: filter events by `well_id`, `radius_km`, `depth_min`, `depth_max`, `formation`, `event_type`, `severity`.
- Semantic search: top-K=6 chunks by cosine similarity over pgvector index, then reranked by metadata match score.
- RAG answer generation: construct prompt from top-6 retrieved chunks; generate via Gemini Flash; validate answer cites retrieved evidence.
- Return source IDs, document references and source card data with every answer.
- **AI outage independence:** The frontend calls `/api/v1/wells`, `/api/v1/events`, `/api/v1/search` independently of `/api/v1/assistant/query`. A failure of the AI service must not affect map, event list or structured search functionality. The frontend must handle a 503 from the assistant endpoint gracefully and show a "AI assistant unavailable — structured search still active" banner.

### 3.6 Correlation & Risk

- Filter wells by PostGIS radius.
- Depth proximity: match events within ±100 m of current depth (configurable).
- Formation match: exact or fuzzy match on formation name.
- Risk score formula (see Architecture doc for full specification):
  ```
  score = clip(w1*depth_score + w2*formation_score + w3*recurrence_score + w4*context_score, 0, 100)
  ```
- Confidence indicator based on number of supporting evidence wells: 1 = LOW, 2–3 = MEDIUM, ≥ 4 = HIGH.
- Risk weights are configurable via Administrator panel; defaults stored in `config` table.

### 3.7 Alerting

- Generate alert when risk score ≥ 70 (HIGH) or ≥ 40 (MEDIUM).
- Record: `alert_id`, `well_id`, `current_depth_m`, `risk_score`, `risk_level`, `confidence`, `factors[]`, `evidence_ids[]`, `timestamp_utc`, `status`.
- Alerts pushed to frontend via SSE alongside depth updates.
- Alert history accessible via `GET /api/v1/alerts?well_id=`.

### 3.8 Audit

- Log all events: document ingestion, extraction start/complete, extraction approval, search queries, assistant queries, risk assessments, alert generations, user login/logout.
- Audit record fields: `id`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `metadata_json`, `timestamp_utc`.
- Audit logs are read-only; no delete or update endpoint.
- Audit log access restricted to Administrator role.

### 3.9 Health Check *(New in v2)*

- `GET /api/v1/health` — publicly accessible, no auth required.
- Returns:
  ```json
  {
    "status": "ok" | "degraded" | "down",
    "database": "ok" | "error",
    "ai_service": "ok" | "error" | "unavailable",
    "vector_index": "ok" | "error",
    "timestamp_utc": "2026-09-06T15:00:00Z"
  }
  ```
- Used by frontend to display the "AI assistant unavailable" banner (§3.5).
- Used by demo judges to verify service readiness.

---

## 4. Business Rules

| ID | Rule |
|---|---|
| BR-01 | A historical record cannot be used in risk calculation or RAG retrieval until its `review_status` is `APPROVED`. |
| BR-02 | AI-generated recommendations must be framed as decision support and accompanied by retrieved evidence. |
| BR-03 | A missing or errored AI response must not hide available structured data (map, events, search). |
| BR-04 | Depth correlation must state the ±window used; do not imply exact equivalence between wells. |
| BR-05 | Synthetic demo data must be visibly labelled `[SYNTHETIC – DEMO DATA]` in the application at all times during judging. |
| BR-06 | Risk scores are advisory signals only; the system must never present them as autonomous drilling instructions. |
| BR-07 | The confidence indicator must accurately reflect the number of supporting evidence wells, not be a fixed value. |
| BR-08 | All timestamps are stored in UTC and rendered in IST (UTC+5:30) in the UI. |

---

## 5. Acceptance Criteria

| ID | Acceptance Test |
|---|---|
| AC-01 | Selecting an active well updates the map marker, nearby-well list and well detail panel. |
| AC-02 | Changing the radius slider changes the offset-well set on the map within 2 seconds. |
| AC-03 | A sample PDF can be uploaded, processed and produces at least one reviewable structured event. |
| AC-04 | A natural-language question returns relevant evidence and ≥ 1 source card with document/well reference. |
| AC-05 | Advancing the simulated current depth changes the risk score and, when threshold is crossed, generates a new alert. |
| AC-06 | Every displayed alert includes: risk score, risk level, confidence band, ≥ 1 factor score, ≥ 1 evidence well reference. |
| AC-07 | When the AI service is unavailable (simulated by setting `AI_ENABLED=false`), map, structured search and event pages remain fully functional. |
| AC-08 *(New)* | `GET /api/v1/health` returns HTTP 200 with valid JSON including `database`, `ai_service` and `vector_index` status fields. |
| AC-09 *(New)* | `GET /api/v1/wells/{id}/events?page=2&limit=10` returns the correct page of events with `total`, `page`, `limit` in the response envelope. |
