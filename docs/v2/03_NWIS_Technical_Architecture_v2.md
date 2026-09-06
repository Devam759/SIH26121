# Technical Architecture & Implementation Design — v2
## eRTMAC-NWIS (Nearby Wells Intelligence System)
**Hackathon Planning Pack | SIH 26121 | Oil India Limited**
**Document Version:** 2.1 | **Date:** 06 September 2026

> **Change log from v2.0:** Migrated backend from Python/FastAPI to **Node.js + Express.js** (PERN stack). PostgreSQL + PostGIS + pgvector unchanged. All Python packages replaced with npm equivalents. Architecture diagram updated.

---

## 1. Architecture Principles

1. **Evidence-first AI:** Historical claims come from retrieved records, not model memory.
2. **Modular adapters:** Real eRTMAC integration can replace the SSE simulator without redesigning the domain layer.
3. **Human-in-the-loop:** Extracted knowledge is reviewable and auditable before use.
4. **Fail-safe UX:** Structured data (map, events, search) remains available when AI services fail.
5. **Explainability over black-box prediction:** Risk score formula is documented, configurable and shown to reviewers.
6. **API versioning from day one:** All routes prefixed `/api/v1/` to demonstrate production hygiene.

---

## 2. Logical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USERS                                       │
│   Drilling Engineer      Data Steward      Administrator            │
└────────────┬────────────────────┬───────────────────────┬───────────┘
             │ REST/HTTP          │ REST/HTTP              │ REST/HTTP
             ▼                   ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FRONTEND — Next.js / React                        │
│  Map View  │  Alert Panel  │  RAG Assistant  │  Document Review     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST/HTTP + SSE (EventSource)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND — Python FastAPI                               │
│  REST API  │  Risk Engine  │  Auth Middleware  │  SSE Handler       │
└─────┬──────────────────────┬──────────────────────────┬────────────┘
      │ SQL (asyncpg)        │ REST (httpx)             │ gRPC/HTTP
      ▼                      ▼                          ▼
┌──────────────┐   ┌──────────────────┐    ┌─────────────────────────┐
│ PostgreSQL   │   │  MinIO (S3)      │    │   AI Orchestrator       │
│ + PostGIS    │   │  Raw PDFs        │    │   Gemini Flash (LLM)    │
│ + pgvector   │   └────────┬─────────┘    │   text-embedding-004    │
│              │            │ REST         │   RAG Pipeline          │
│ Wells        │   ┌────────▼─────────┐    │   Extraction Prompts    │
│ Events       │◄──│  Document Worker │    └─────────────────────────┘
│ Formations   │   │  PyMuPDF + OCR   │
│ Audit Logs   │   │  Chunking        │
│ Embeddings   │   │  Embedding       │
└──────────────┘   └──────────────────┘

EXTERNAL (MVP only):
  SSE Simulator ──SSE──► FastAPI SSE Handler
  (depth auto-increments 0.5 m / 3 s)
```

### Layer Technology Decisions

| Layer | Technology | Decision Rationale |
|---|---|---|
| Frontend | Next.js 14 + React + Tailwind CSS | App Router for server components, fast iteration |
| Map | Leaflet.js + OpenStreetMap tiles | Free tiles, no API key required for demo |
| **Backend** | **Node.js 20 + Express.js** | Team knows JS; same-language full-stack; excellent SSE and streaming support |
| Relational DB | PostgreSQL 15 + PostGIS 3 + **pgvector 0.7** | **Committed: single container eliminates a separate vector service** |
| DB Client | `pg` (node-postgres) + `pgvector` npm | Raw SQL with PostGIS/pgvector support; no ORM overhead for demo |
| Document storage | MinIO | S3-compatible, runs in Docker, no cloud account needed |
| PDF extraction | `pdf-parse` npm | Pure JS PDF text extraction; no native binary dependency |
| OCR | `tesseract.js` npm | JavaScript wrapper for Tesseract; runs in Node.js worker |
| AI — generation | **Google Gemini 1.5 Flash** via `@google/generative-ai` npm | Free tier, 1M token context, low latency (~2–4 s) |
| AI — embeddings | **text-embedding-004** (768 dim) via same npm SDK | Same API key, free tier, strong retrieval quality |
| Real-time | **SSE (Server-Sent Events)** via `res.write()` | Simpler in Node.js than Python; unidirectional depth stream needs no WebSocket |

---

## 3. Data Flow

```
Upload Flow:
  [User] → POST /api/v1/documents → multer middleware → [MinIO: store PDF]
         → POST /api/v1/documents/{id}/process
         → [Node.js Worker] pdf-parse extract / tesseract.js OCR
         → Normalize text → Chunk (512 tok, 20% overlap)
         → @google/generative-ai extraction (JSON mode) → DrillingEvent records (status=EXTRACTED)
         → text-embedding-004 → pgvector embeddings stored via pg INSERT
         → [UI] Data Steward reviews → PATCH /api/v1/events/{id} → status=APPROVED

Query Flow:
  [User] → POST /api/v1/assistant/query { question, well_id, depth, radius_km }
         → Parse intent (extract depth/formation/event filters)
         → Structured filter: SQL via pg WHERE depth_start BETWEEN $1 AND $2 AND formation=$3
         → Vector filter: pgvector cosine similarity top-6 via pg query
         → Rerank: score = 0.6*vector_sim + 0.25*formation_match + 0.15*depth_proximity
         → Build prompt with top-6 chunks + system instructions
         → @google/generative-ai generateContent()
         → Validate: response must cite evidence IDs
         → Return { answer, source_cards[], evidence_ids[] }

Risk Flow (SSE-triggered):
  [SSE Simulator] → POST /api/v1/risk/assess { well_id, current_depth_m, formation, radius_km }
                 → Retrieve APPROVED nearby events within depth ±100 m (pg + PostGIS)
                 → Compute risk score (formula below — pure JS math)
                 → Store RiskAssessment via pg INSERT
                 → If score ≥ threshold → create Alert
                 → Push via Node.js SSE res.write() to subscribed frontend EventSources
```

---

## 4. Risk Engine Design

### 4.1 Score Formula

```
risk_score = clip(
    w1 * depth_score(d) +
    w2 * formation_score(f) +
    w3 * recurrence_score(r) +
    w4 * context_score(c),
    0, 100
)
```

**Default weights** (configurable via Administrator panel, stored in `config` table):

| Factor | Default Weight | Max Contribution | Calculation |
|---|---|---|---|
| `w1` depth_score | 0.35 | 35 | `max(0, 35 × (1 - min_depth_delta_m / 200))` where `min_depth_delta_m` = minimum depth distance between current depth and any nearby event |
| `w2` formation_score | 0.25 | 25 | `25` if current formation exactly matches ≥1 event formation; `12` if fuzzy match (Levenshtein ≤ 2); `0` otherwise |
| `w3` recurrence_score | 0.20 | 20 | `min(20, 5 × count_of_matching_events_in_window)` — capped at 4 events |
| `w4` context_score | 0.20 | 20 | Reserved for future ML feature. For MVP: `10` if ≥ 2 different event types observed at similar depth; `0` otherwise |

**Normalization:** Each component already bounded 0–100 in its max. Sum is bounded by `clip(..., 0, 100)`.

**Confidence:**
```python
n_supporting_wells = count distinct well_ids in supporting evidence
confidence = "LOW" if n < 2 else "MEDIUM" if n <= 3 else "HIGH"
```

### 4.2 Example Calculation

```
Current: W-042 at 2,740 m, Formation: "Barail"
Nearby approved events matching depth window [2,640–2,840 m]:
  - W-017/E-103: MUD_LOSS at 2,760 m, Barail, delta=20 m
  - W-021/E-221: STUCK_PIPE at 2,800 m, Barail, delta=60 m
  - W-032/E-087: KICK at 2,750 m, Barail_Lower, delta=10 m

depth_score  = 35 × (1 - 10/200) = 35 × 0.95 = 33.25
formation_score = 25 (exact Barail match in W-017 and W-021)
recurrence_score = min(20, 5×3) = 15
context_score = 10 (2 event types: MUD_LOSS + STUCK_PIPE)

risk_score = 33.25 + 25 + 15 + 10 = 83.25 → clipped = 83 → HIGH
confidence = MEDIUM (3 events but only 3 distinct wells)
```

---

## 5. Middleware & Cross-Cutting Concerns

### 5.1 Express.js Middleware Stack (in order)

```js
// server.js / app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json, urlencoded } from 'express';

const app = express();

// Security headers
app.use(helmet());

// CORS — frontend origin only
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));

// Body parsing — max 1 MB JSON (PDFs uploaded via multer, not JSON)
app.use(json({ limit: '1mb' }));
app.use(urlencoded({ extended: true }));

// General rate limit: 60 req/min per IP
app.use(rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true }));

// AI assistant rate limit: 10 req/min per user (applied at route level)
export const aiRateLimit = rateLimit({ windowMs: 60_000, max: 10 });
```

### 5.2 File Upload

```js
import multer from 'multer';
import multerS3 from 'multer-s3';  // streams directly to MinIO

const upload = multer({
  storage: multerS3({ s3: minioClient, bucket: 'nwis-documents', key: (req, file, cb) => cb(null, `${uuid()}/${file.originalname}`) }),
  limits: { fileSize: 52 * 1024 * 1024 },  // 52 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files accepted'));
    cb(null, true);
  },
});
```

### 5.3 Request Validation

- All request bodies validated with **Zod** schemas: `z.object({ well_id: z.string().uuid(), ... })`.
- Validation middleware applies schema before route handler; returns 422 on failure.
- Never accept client-provided `evidence_ids` or `risk_scores`; always compute server-side.
- Document upload: MIME type validated by `multer` fileFilter.

---

## 6. Failure Modes & Controls

| Failure | Control |
|---|---|
| OCR extraction wrong | Keep source preview; require Data Steward review before APPROVED status |
| LLM hallucination | Ground historical claims in retrieved evidence; validate response cites evidence IDs; show source cards |
| Too few nearby wells | Return `confidence=LOW`; show "Insufficient historical evidence (n=1 well)" |
| Conflicting records | Show multiple records; mark with `[CONFLICT]` badge; do not silently resolve |
| Live stream unavailable | Use last known depth state; display `[SIMULATED – LAST KNOWN STATE]` badge |
| Wrong risk score | Expose all factor scores and confidence; prohibit autonomous action |
| AI service 503 | Frontend health-check (`/api/v1/health`) detects `ai_service: error`; shows banner; structured features unaffected |
| pgvector query timeout | Fall back to PostgreSQL full-text search (`tsvector`) on event `description` field |

---

## 7. Deployment Topology

### Docker Compose Services (5 containers)

```yaml
services:
  frontend:         # Next.js — port 3000  (node:20-alpine)
  api:              # Node.js + Express — port 8000  (node:20-alpine)
  db:               # PostgreSQL 15 + PostGIS + pgvector — port 5432
  minio:            # MinIO — ports 9000 (API), 9001 (console)
  worker:           # Node.js document worker — no external port  (node:20-alpine)
```

**Startup order:** `db` → `minio` → `api` (depends_on: db, minio) → `worker` (depends_on: api, db) → `frontend` (depends_on: api)

**npm packages — API service:**
```
express, cors, helmet, express-rate-limit, multer, multer-s3,
jsonwebtoken, bcrypt, zod, pg, pgvector, @aws-sdk/client-s3,
@google/generative-ai, uuid, dotenv
```

**npm packages — Worker service:**
```
pdf-parse, tesseract.js, @google/generative-ai, pg, pgvector,
@aws-sdk/client-s3, uuid, dotenv
```

**Environment variables** (stored in `.env`, referenced in `docker-compose.yml`):
```
DATABASE_URL=postgresql://nwis:password@db:5432/nwis
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
GOOGLE_API_KEY=...           # Gemini Flash + text-embedding-004
JWT_SECRET=...
JWT_EXPIRES_IN=60m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Demo laptop requirements:** 8 GB RAM, 4 CPU cores, Docker Desktop. All services run comfortably within 4 GB RAM.
