# Product Requirements Document — v2
## eRTMAC-NWIS (Nearby Wells Intelligence System)
**Hackathon Planning Pack | SIH 26121 | Oil India Limited**
**Document Version:** 2.0 | **Date:** 06 September 2026
**Source:** OIL Problem Statement 26121 — *AI-Powered Offset Well Knowledge and Decision Support Platform for Drilling Operations*

> **Change log from v1:** Added success-metric measurement methodology (§9), specified simulated-stream implementation (§7/FR-12), flagged primary demo persona (§4), added AI response latency SLA (§8), added confidence indicator requirement (§7/FR-14).

---

## 1. Executive Summary

eRTMAC-NWIS is a decision-support platform that gives drilling personnel fast, evidence-backed access to offset-well knowledge while a well is being drilled. The platform combines geospatial well discovery, structured historical events, document intelligence, depth/formation correlation, risk scoring, and an evidence-backed AI assistant.

The hackathon MVP demonstrates the full workflow end-to-end using a realistic **synthetic dataset** (50 wells, 200 events, 5 sample PDF reports) covering Oil India's Assam/Brahmaputra basin operational zone. All synthetic records are clearly labelled in the UI.

**Primary claim the MVP proves:**
> *"NWIS can recognize when the current well is entering a historically risky interval and immediately surface the offset-well evidence that explains why."*

---

## 2. Problem Statement Traceability

| Source Requirement (SIH 26121) | MVP Interpretation | FR Reference |
|---|---|---|
| Nearby wells on a geospatial map | Interactive map with active well, radius filter, well details and event overlays | FR-01, FR-02 |
| Instant historical knowledge access | Natural-language search across extracted events and indexed documents | FR-07, FR-08 |
| Correlation across depth/formation | Depth-window and formation matching across offset wells | FR-09 |
| Proactive risk identification | Explainable risk score (0–100) with confidence band and factor breakdown | FR-10, FR-14 |
| Real-time alerts/recommendations | SSE-based live depth feed that updates risk, confidence and evidence cards | FR-11, FR-12 |
| AI/NLP/OCR document extraction | Upload PDF → text/OCR → structured event extraction → searchable repository | FR-04, FR-05, FR-06 |
| User-friendly dashboard | Single-page dashboard reachable in ≤ 3 interactions to "why am I at risk?" | FR-03 |

---

## 3. Product Vision

> Prevent avoidable surprises by making historical offset-well experience available, explainable and trustworthy at the exact moment a drilling engineer needs it.

---

## 4. Users & Jobs-to-be-Done

> **Primary demo persona: Drilling Engineer** — all demo flows must work seamlessly for this persona without needing the others.

| User | Primary Need | MVP Job | Demo Priority |
|---|---|---|---|
| **Drilling Engineer** *(Primary)* | Understand nearby historical behaviour before/in an active interval | Select well → inspect risk → view evidence → ask AI question | **P0 — all demo flows** |
| Geologist / Subsurface Engineer | Compare formation-specific behaviour | Filter events by formation/depth and inspect offset evidence | P1 — secondary demo |
| Field/Office Operations Team | Quickly find lessons learned and prior mitigations | Search events/documents and review source snippets | P1 — secondary demo |
| Administrator / Data Steward | Keep extracted knowledge trustworthy | Upload documents, review extracted records, correct fields, re-index | P1 — admin demo |

---

## 5. Product Scope

### 5.1 In Scope for Hackathon MVP

- Well and event repository with geospatial metadata (synthetic data: 50 wells, Assam/Brahmaputra basin coordinates)
- Interactive 2D map of active and offset wells with configurable radius filter
- Historical drilling-event dataset (200 events across event types: mud loss, kick, stuck pipe, torque spike, cementing issue, NPT)
- PDF ingestion with PyMuPDF text extraction and Tesseract OCR fallback
- AI-assisted extraction using Gemini 1.5 Flash with structured JSON output
- Semantic retrieval / RAG assistant (Gemini Flash generation + text-embedding-004 embeddings) with source attribution
- Depth-window and formation correlation engine
- Explainable risk score (0–100) with confidence indicator and factor breakdown
- SSE-based simulated real-time depth stream (depth auto-increments 0.5 m every 3 seconds)
- Audit-friendly evidence panel linking every alert to supporting historical records
- Health-check endpoint reporting service and AI availability status

### 5.2 Explicitly Out of Scope for MVP

- Direct production integration with OIL internal eRTMAC systems
- Safety-critical autonomous control of drilling equipment
- Claims of production-grade predictive accuracy
- Training a foundation model from scratch
- Full 3D reservoir modelling
- Automated approval of drilling actions
- WITSML or LAS file format ingestion

---

## 6. Core User Journeys

1. Engineer opens the dashboard and selects active well **W-042** (currently at 2,740 m).
2. The system displays **7 nearby wells** within the selected 10 km radius on the map.
3. The engineer sees the **risk panel**: score 82/100 (HIGH), confidence: Medium (3 wells), with factor bars.
4. The engineer selects depth interval 2,700–2,800 m; historical events are correlated to that window.
5. The engineer asks: *"What happened in nearby wells around 2,800 m?"*
6. The assistant returns a concise answer with well IDs, depths, event types, mitigations, and clickable source cards.
7. As the simulated current depth advances, the risk score, confidence indicator and alert panel update automatically via SSE.

---

## 7. Functional Requirements

| ID | Feature | Requirement |
|---|---|---|
| FR-01 | Well map | System shall display wells using latitude/longitude and identify the active well with a distinct marker. |
| FR-02 | Radius filter | User shall select a radius (5/10/15/25 km) and see matching offset wells update on the map in real time. |
| FR-03 | Well profile | System shall show well metadata, trajectory summary, formations and historical events on well selection. |
| FR-04 | Document ingestion | User shall upload drilling documents in PDF format via the document upload interface. |
| FR-05 | OCR fallback | System shall invoke Tesseract OCR for scanned/image-only documents when PyMuPDF text extraction yields < 100 characters per page. |
| FR-06 | Event extraction | System shall extract structured drilling events using a Gemini Flash extraction prompt and preserve source-document linkage. |
| FR-07 | Semantic search | User shall search historical knowledge using natural language; results shall return within 5 seconds on demo hardware. |
| FR-08 | Evidence-backed answers | AI answers shall cite the historical records/documents used, displayed as source cards beside each response. |
| FR-09 | Correlation | System shall compare current depth (±100 m window) and formation against nearby historical records. |
| FR-10 | Risk score | System shall compute a 0–100 risk score using a documented weighted formula with factor breakdown (depth proximity, formation match, event recurrence, context similarity). |
| FR-11 | Alerts | System shall raise HIGH/MEDIUM/LOW alerts when risk score crosses configured thresholds (HIGH ≥ 70, MEDIUM ≥ 40). |
| FR-12 | Simulation stream | System shall expose a Server-Sent Events (SSE) endpoint that simulates current-depth progression (0.5 m/3 s) for the active well. The stream message schema is: `{"well_id": str, "current_depth_m": float, "timestamp": ISO8601, "simulated": true}`. |
| FR-13 | Human review | Extracted records shall be reviewable and editable by a Data Steward before being treated as approved knowledge. |
| FR-14 | Confidence indicator | Every risk alert shall display a confidence band (Low/Medium/High) based on the number of supporting evidence wells (1 = Low, 2–3 = Medium, ≥ 4 = High). |

---

## 8. Non-Functional Requirements

| Area | Target | Notes |
|---|---|---|
| Performance — structured queries | < 2 seconds | Map load, event list, structured search |
| Performance — AI assistant | < 10 seconds | RAG query on demo hardware (Gemini Flash) |
| Performance — risk score | < 3 seconds | On simulated depth update via SSE |
| Explainability | Every risk alert shows factor scores and supporting historical wells/events | Non-negotiable for judging |
| Reliability | AI failure must not block access to map, events, structured search | AC-07 |
| Security | JWT auth, secret management via env vars, no sensitive data in client logs | — |
| Auditability | Persist document version, extraction time, model version, reviewer status, source IDs | — |
| Usability | A drilling engineer reaches "why am I at risk?" in ≤ 3 interactions from the main dashboard | — |
| Data labelling | All synthetic/demo data must be visibly labelled `[SYNTHETIC – DEMO DATA]` in the UI | SIH judging requirement |

---

## 9. Success Metrics & Measurement Methodology

| Metric | Hackathon Target | Measurement Method |
|---|---|---|
| Relevant evidence retrieval | ≥ 80% of demo queries return ≥ 1 relevant record | Run all 20 benchmark questions from `09_NWIS_Evaluation_Questions.md`; count hits |
| Source attribution | 100% of AI factual claims in demo trace to stored records | Manual review of source cards for each demo answer |
| Extraction quality | ≥ 85% field accuracy on the curated demo corpus after human review | Compare AI-extracted fields against hand-labelled ground truth for 5 sample PDFs |
| Alert usefulness | Each demo alert has an explicit explanation and ≥ 1 historical precedent | Verify in evidence panel for all 3 demo alert scenarios |
| Demo completion | End-to-end workflow: well selection → alert → evidence → AI question | Full run-through of demo script (doc 06) in Hours 40–44 |
| Confidence accuracy | Confidence indicator correctly reflects evidence count | Verify for at least 3 alert instances |

---

## 10. Assumptions & Constraints

- The supplied problem statement provides no dataset link; the MVP uses synthetic data representing OIL's Assam/Brahmaputra operational zone.
- Real OIL data may contain confidential operational information and must remain within approved environments.
- Risk scores are decision-support signals, not autonomous drilling instructions.
- Geological terminology and extraction rules will be refined with a domain expert when available.
- LLM provider: **Google Gemini 1.5 Flash** (free tier). Embedding model: **text-embedding-004**. Both via Google AI Studio API key stored in `.env`.
- Simulated depth stream uses the Python SSE endpoint; no real telemetry integration.

---

## 11. Release Strategy

| Phase | Scope |
|---|---|
| **Prototype (MVP)** | Synthetic data + map + search + RAG + risk + confidence indicator + SSE simulation |
| **Pilot-ready** | Replace synthetic data with approved OIL sources; stricter validation and access controls; WITSML adapter |
| **Production** | Integrate approved eRTMAC streams, governance, model validation, operational sign-off, on-premise LLM |
