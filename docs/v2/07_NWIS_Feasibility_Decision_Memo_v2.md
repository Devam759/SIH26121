# Selection & Feasibility Decision Memo — v2
## eRTMAC-NWIS (Nearby Wells Intelligence System)
**Hackathon Planning Pack | SIH 26121 | Oil India Limited**
**Document Version:** 2.1 | **Date:** 06 September 2026

> **Change log from v2.0:** Tech stack updated to PERN (PostgreSQL + Express + React + Node.js). Tech fit reassessed for a JavaScript-first team.

---

## Recommendation

**Proceed with Problem Statement SIH 26121.**

The problem is highly feasible as a software prototype using the committed stack (Next.js + FastAPI + PostgreSQL/PostGIS/pgvector + Gemini Flash). The full production scope is not realistic for a hackathon without approved OIL data, domain support and eRTMAC integration access — but the MVP is well within reach in 48 hours if the team holds the scope defined in document 06.

---

## Feasibility Scorecard

| Dimension | Assessment | v2.1 Update |
|---|---|---|
| Product feasibility | **High** for MVP; medium/low for full production | Unchanged |
| Technical fit | **Strong** — **PERN stack (PostgreSQL + Express + React + Node.js)** is a proven modern stack; full JavaScript team = faster iteration | Updated: Python/FastAPI replaced with Node.js/Express |
| Data risk | **Managed** — synthetic dataset strategy defined (§4); no real data dependency for MVP | Resolved in v2 |
| AI feasibility | **High** for extraction/RAG; `@google/generative-ai` npm works natively in Node.js | Confirmed for JS stack |
| Integration feasibility | **Low** during hackathon — no eRTMAC integration; SSE simulator used | Unchanged; clearly scoped out |
| Selection potential | **High** — demo proves a single compelling "history repeats here" workflow | Unchanged |

---

## 3. Tech Stack & AI Provider (Committed)

**Full-stack language: JavaScript / Node.js** (PERN stack)

| Component | Technology | Package / Notes |
|---|---|---|
| Backend API | Node.js 20 + Express.js | `express`, `cors`, `helmet`, `express-rate-limit` |
| Auth | `jsonwebtoken` + `bcrypt` npm | 60-min access token, 7-day refresh |
| Database client | `pg` (node-postgres) + `pgvector` npm | Raw SQL; PostGIS + pgvector extensions |
| File upload | `multer` + `multer-s3` npm | Streams PDFs directly to MinIO |
| Validation | `zod` npm | Schema validation on all request bodies |
| PDF extraction | `pdf-parse` npm | Pure JS, no native binary |
| OCR | `tesseract.js` npm | JS Tesseract wrapper |
| AI — Generation | `@google/generative-ai` npm → Gemini 1.5 Flash | Free tier |
| AI — Embeddings | `@google/generative-ai` npm → text-embedding-004 | 768-dim, free tier |

**Pre-hackathon test required:** Obtain a `GOOGLE_API_KEY` from [Google AI Studio](https://aistudio.google.com) and verify it works with `@google/generative-ai` for both `gemini-1.5-flash-latest` and `text-embedding-004` before Hour 0.

---

## 4. Data Strategy (Resolved)

The SIH 26121 problem statement provides **no dataset link**. The following synthetic data strategy addresses this risk:

| Asset | Volume | Content |
|---|---|---|
| Wells | 50 | Assam/Brahmaputra basin coordinates; realistic well names (OIL-W-001 to OIL-W-050); mix of active/completed |
| Drilling Events | 200 | Spread across all 9 event types; depth range 500–5,000 m; realistic severity and duration distributions |
| Formations | 150 | Barail, Tipam, Kopili, Bhuban, Bokabil, Girujan — OIL's actual Assam basin stratigraphy |
| PDF Reports | 5 | Synthetic drilling completion reports with embedded event narratives; tested with OCR pipeline |
| Trajectory Points | 250 (5 per well) | Simple vertical wells for MVP; provides trajectory preview |

**Deliberate clustering:** The synthetic dataset includes intentional event clusters at specific depth intervals (2,600–2,850 m in the Barail formation) so that the demo reliably triggers HIGH risk when W-042 drills through this interval. This is documented in the data generation script (`10_NWIS_Synthetic_Data_Script.py`).

**UI labelling:** All synthetic records are tagged `is_synthetic=TRUE` in the database and displayed with `[SYNTHETIC – DEMO DATA]` labels throughout the UI.

---

## 5. What Must Be True to Be Competitive

- [ ] Demo shows a **meaningful event pattern**, not only a chatbot response.
- [ ] Every alert has **visible evidence** (well IDs, depth, event type, source document).
- [ ] Risk score is **explainable** (factor bars, weights shown).
- [ ] System **degrades gracefully** when AI is unavailable (fallback demo script practiced).
- [ ] Team is **honest** about synthetic data and prototype limitations — never imply fabricated records are real OIL operations.
- [ ] **Confidence indicator** is shown on every risk alert — differentiates from competitors showing a single unexplained number.

---

## 6. Do Not Overbuild

The following are **explicitly prohibited** as dependencies for selection:

| Prohibited dependency | Why |
|---|---|
| Direct eRTMAC API integration | No approved interface available; SSE simulator is sufficient |
| Production-grade predictive accuracy | Weighted rule-based formula is honest and demonstrable; ML claims without validation are a liability |
| Automated drilling control | Never in scope; safety-critical; legal risk |
| Real OIL operational data | No approved access; synthetic data is the correct approach |
| Training a custom LLM | Weeks of compute; Gemini Flash is superior for this use case |
| Full 3D reservoir modelling | Not in problem statement; out of scope |

These belong in the **pilot-ready and production roadmap** (PRD §11), not the hackathon MVP.

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gemini API rate-limited during live demo | Low | Critical | Pre-generate canned answers for 7 demo questions; Ollama fallback tested and ready |
| Synthetic dataset not realistic enough to trigger risk patterns | Medium | High | Deliberate event clustering at 2,600–2,850 m in dataset; verify risk engine fires in Hours 38–44 |
| RAG returns irrelevant chunks during demo | Medium | High | Run 20 evaluation questions in Hours 38–44; tune top-K and chunk size if needed |
| Docker Compose fails to start on demo laptop | Low | Critical | Cold-start test performed at Hour 40 and Hour 46; backup recording ready |
| pgvector index slow on first query (IVF warm-up) | Low | Medium | Run a warm-up query at application startup |
| Team member blocked > 30 min | Medium | High | Escalation rule: raise immediately; redistribute task; do not silently fall behind |
