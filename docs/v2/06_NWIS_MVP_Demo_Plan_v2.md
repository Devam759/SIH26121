# MVP Scope, Execution Plan & Demo Script — v2
## eRTMAC-NWIS (Nearby Wells Intelligence System)
**Hackathon Planning Pack | SIH 26121 | Oil India Limited**
**Document Version:** 2.1 | **Date:** 06 September 2026

> **Change log from v2.0:** Backend ownership updated to Node.js + Express. Build sequence updated with npm-based tooling. Worker updated to Node.js (pdf-parse + tesseract.js).

---

## 1. MVP Definition

> **The MVP must prove one clear claim:**
> *"NWIS can recognize when the current well is entering a historically risky interval and immediately surface the offset-well evidence that explains why — with a confidence indicator and full source traceability."*

---

## 2. Prioritized Backlog

| Priority | Feature | Definition of Done | Owner |
|---|---|---|---|
| **P0** | Synthetic well/event dataset | 50 wells (Assam basin coords), 200 events, seeded in PostgreSQL | Backend/Data |
| **P0** | Interactive map | Active + nearby wells, radius filter (5/10/15/25 km), clickable well details | Frontend |
| **P0** | Historical event search | Structured filters: depth, formation, event_type, severity, pagination | Backend + Frontend |
| **P0** | Risk engine | Current depth → score + confidence + factor breakdown + evidence wells | Backend |
| **P0** | SSE simulation | Depth auto-increments 0.5 m/3 s; risk panel updates in real-time | Backend + Frontend |
| **P0** | RAG assistant | Natural-language questions with source cards and evidence trail | AI/ML + Backend |
| **P1** | PDF upload + extraction | Demo upload of ≥ 1 PDF; Gemini Flash extracts ≥ 1 event | AI/ML + Backend |
| **P1** | Review workflow | Data Steward can edit and approve extracted event in the UI | Backend + Frontend |
| **P1** | Confidence indicator | Every risk alert shows LOW/MEDIUM/HIGH confidence with evidence count | Backend + Frontend |
| **P1** | Health-check endpoint | `/api/v1/health` returns DB + AI + vector status | Backend |
| ~~P2~~ | ~~Advanced ML~~ | **Removed from scope.** No demo dependency. Belongs in the roadmap. | — |

---

## 3. Team Role Assignments

> **Assign each role to a real team member before Hour 0. Do not start without this.**

| Role | Ownership | Key Deliverables |
|---|---|---|
| **Frontend Lead** | [Name TBD] | Dashboard, Leaflet map, risk panel, alert panel, RAG assistant chat UI, document review screen, SSE `EventSource` client |
| **Backend / Data Lead** | [Name TBD] | **Node.js + Express.js** API, PostgreSQL/PostGIS schema, risk engine (pure JS), SSE endpoint, synthetic dataset seed SQL, Docker Compose |
| **AI / ML Lead** | [Name TBD] | Node.js document worker (`pdf-parse` + `tesseract.js`), `@google/generative-ai` integration, pgvector indexing, RAG orchestration, evaluation Q&A run, Ollama fallback |
| **Product / Presentation Lead** | [Name TBD] | Synthetic PDF corpus (5 reports), demo narrative, pitch deck, architecture diagram slide, README, demo recording |

**Escalation rule:** If any team member is blocked for > 30 minutes, they escalate to the full team immediately — do not wait.

---

## 4. 48-Hour Build Sequence

```
Hour 00–04  ║ SETUP
            ║ Freeze MVP scope against this doc
            ║ Agree schema; create PostgreSQL migrations (schema.sql)
            ║ Seed synthetic dataset (50 wells, 200 events via seed SQL)
            ║ Set up Docker Compose (all 5 services running — all Node.js images)
            ║ npm install in api/ and worker/ services
            ║ Test GOOGLE_API_KEY via @google/generative-ai (both generation and embedding)

Hour 04–12  ║ FOUNDATION
            ║ Backend: Express.js REST API scaffolding (/api/v1/wells, /api/v1/events, /api/v1/health)
            ║ Backend: JWT auth middleware (jsonwebtoken + bcrypt)
            ║ Frontend: Map component + well list + radius filter

Hour 10–20  ║ RISK ENGINE + SIMULATION
            ║ Backend: Risk score formula (pure JS math) + RiskAssessment storage (pg INSERT)
            ║ Backend: SSE simulator endpoint (res.write() every 3s) + risk_alert emission
            ║ Frontend: Risk panel + confidence indicator + alert feed (EventSource)

Hour 16–28  ║ DOCUMENT INTELLIGENCE
            ║ Worker: pdf-parse extraction + tesseract.js OCR fallback
            ║ Worker: Chunking (512 tok, 20% overlap) + @google/generative-ai embedding
            ║ Worker: Gemini Flash JSON mode extraction prompt → event records
            ║ Frontend: Document upload UI (multer) + extraction review screen

Hour 24–34  ║ RAG ASSISTANT
            ║ Backend: pgvector top-6 query (pg + pgvector npm) + reranking (JS)
            ║ Backend: RAG prompt assembly + @google/generative-ai generateContent()
            ║ Backend: Response validation (source citation check)
            ║ Frontend: Chat UI + source cards

Hour 32–38  ║ INTEGRATION + POLISH
            ║ End-to-end demo flow: well → risk → evidence → RAG
            ║ Add [SYNTHETIC – DEMO DATA] labels throughout UI
            ║ Test AI-outage fallback (AI_ENABLED=false — structured features must still work)
            ║ Test health-check endpoint
            ║ Fix integration bugs

Hour 38     ║ ★ FEATURE FREEZE ★
            ║ No new features after this point. Bug-fix only.

Hour 38–44  ║ DEMO PREP + TESTING
            ║ Run all 20 benchmark evaluation questions; record pass rate
            ║ Full demo script run-through ×3 (timed)
            ║ Test fallback demo flow (structured only, no RAG)
            ║ Verify Docker Compose cold-start on demo laptop
            ║ Record 2–3 minute backup video

Hour 44–48  ║ SUBMISSION
            ║ Pitch deck (≤ 10 slides)
            ║ Architecture diagram slide
            ║ README with setup + synthetic-data disclosure
            ║ Final polish, submission upload
```

---

## 5. Demo Script (Primary — AI Available)

**Setup:** Demo laptop running Docker Compose. Open browser at `http://localhost:3000`. Active well: **OIL-W-042** at **2,740 m**. SSE simulator running.

---

**Step 1 — Map & Well Selection (60 s)**
> *"NWIS shows the active well, OIL-W-042, currently drilling at 2,740 m in the Barail formation. Using a 10 km radius filter, we can instantly see 7 offset wells that have drilled through this area before."*

- Click OIL-W-042 on map → well detail panel opens with metadata, formation intervals and trajectory.
- Adjust radius slider → offset wells update on map.

**Step 2 — Risk Panel (60 s)**
> *"The risk engine has already scored this depth interval. Score: 83/100 — HIGH. But we don't just show a number. We show *why*."*

- Point to risk factor bars: depth proximity 33/35, formation match 25/25, event recurrence 15/20.
- Point to confidence indicator: *"MEDIUM confidence — based on 3 supporting offset wells."*
- Click "View Evidence" → evidence panel shows OIL-W-017 (MUD_LOSS, 2,750 m), OIL-W-021 (STUCK_PIPE, 2,800 m), OIL-W-032 (KICK, 2,730 m).

**Step 3 — Live Simulation (30 s)**
> *"Watch what happens as the well drills deeper."*

- SSE simulator auto-advances depth → risk score and alert update live.
- A new HIGH alert fires at 2,780 m → alert panel updates.

**Step 4 — RAG Assistant (90 s)**
> *"Now the engineer asks a natural-language question."*

- Type: *"What happened in nearby wells around 2,800 m?"*
- Show answer with source cards (well name, depth, event type, document reference).
- Type: *"What mitigations were used for mud loss at this depth?"*
- Show specific mitigation text with source page reference.

**Step 5 — Document Traceability (30 s)**
- Click a source card → source document viewer shows the exact page/section.
> *"Every claim traces back to a historical report. This is institutional drilling memory, not a chatbot."*

**Step 6 — Closing (30 s)**
> *"NWIS turns historical drilling reports into a live, explainable drilling memory — designed as a companion to OIL's eRTMAC, not a replacement."*

---

## 5.1 Fallback Demo Script (If RAG/AI Unavailable)

> **Use this if Gemini API is unavailable during the demo. Practice this script too.**

**Steps 1–3 are identical** — map, risk panel and live simulation do not require AI.

**Step 4 fallback — Structured Search:**
> *"Our system is designed to degrade gracefully. Even without the AI assistant, the structured evidence panel gives engineers everything they need."*

- Use the structured search panel: filter by depth 2,700–2,800 m, formation Barail → show matching events.
- Click an event → full event detail with source document reference.
> *"The AI assistant accelerates exploration, but the underlying evidence is always accessible directly."*

**Step 5:** Show the health-check panel: *"The system shows AI service as unavailable, map and search as fully operational — exactly the fail-safe behaviour we designed."*

---

## 6. Demo Logistics

| Item | Decision |
|---|---|
| Demo environment | **Docker Compose on demo laptop** (not a cloud URL — avoids connectivity risk) |
| Demo laptop spec | Min 8 GB RAM, 4 CPU cores, Docker Desktop installed and pre-warmed |
| Backup | 2–3 min screen recording of full demo flow, uploaded to Google Drive before hackathon starts |
| Internet connectivity | Required for Gemini API; pre-test Ollama fallback in case venue WiFi is unreliable |
| Browser | Chrome, full-screen, browser bookmarks hidden |
| Data labelling | `[SYNTHETIC – DEMO DATA]` badge visible in header at all times |
| Demo user | Pre-seeded `demo@oilnwis.in` / role: Engineer — login before presenting |

---

## 7. Judge-Facing Differentiators

1. **Institutional memory, not a generic chatbot** — domain-specific context (depth, formation, well ID) is injected before every retrieval.
2. **Geospatial + depth/formation context before retrieval** — Leaflet map + PostGIS radius filter used as a pre-retrieval stage.
3. **Evidence-backed AI with full source traceability** — every AI answer shows clickable source cards.
4. **Explainable risk score with confidence indicator** — not a black-box number; factor breakdown + evidence count shown.
5. **Graceful AI degradation** — structured search and map work independently of the AI layer.
6. **Designed as an eRTMAC companion** — explicitly framed as extending OIL's existing infrastructure, not replacing it.

---

## 8. Final Submission Checklist

- [ ] Working locally reproducible prototype (Docker Compose cold-start tested)
- [ ] README with setup instructions and synthetic-data disclosure
- [ ] Architecture diagram (see doc 08)
- [ ] PRD + SRS (docs 01–02)
- [ ] API/data model (doc 05)
- [ ] RAG evaluation results (20 questions run, pass rate recorded) (doc 09)
- [ ] Demo script (this document, §5)
- [ ] 2–3 minute backup recording (uploaded to Google Drive)
- [ ] Known limitations listed in README
- [ ] Roadmap: pilot-ready and production phases outlined
