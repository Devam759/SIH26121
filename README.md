# eRTMAC-NWIS — Nearby Wells Intelligence System
### Smart India Hackathon 2026 | Problem Statement ID: 26121 | Oil India Limited
**Theme:** Smart Automation | **Category:** Software (AI / Data Analytics / Upstream Oil & Gas)

[![Stack](https://img.shields.io/badge/Stack-PERN-red.svg)](https://github.com/Devam759/SIH26121)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%20%2B%20PostGIS-336791.svg?logo=postgresql&logoColor=white)](https://postgis.net/)
[![pgvector](https://img.shields.io/badge/pgvector-0.8.6%20(768--dim)-4169E1.svg)](https://github.com/pgvector/pgvector)
[![Gemini](https://img.shields.io/badge/Google%20AI-Gemini%203.6%20Flash-4285F4.svg?logo=google&logoColor=white)](https://aistudio.google.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)

---

> [!IMPORTANT]
> **[SYNTHETIC – DEMO DATA NOTICE]**
> All well profiles, trajectories, geological formations, sensor telemetry streams, and operational incident logs in this repository are synthetic datasets created strictly for demonstration purposes in Smart India Hackathon 2026. Never use synthetic parameters for actual field drilling operations.

---

## 1. Executive Summary & Problem Context

**Oil India Limited (OIL)** operates the digital real-time monitoring system (**eRTMAC**) to monitor active rigs across operational areas in the Assam/Brahmaputra Basin. However, drilling decisions in geologically complex formations (e.g., Barail coal/shale sequences, Tipam sands) require more than live active well telemetry—they require institutional memory from historical and nearby offset wells drilled in the same reservoir.

Historically, this critical intelligence remained trapped across thousands of Well Completion Reports (WCRs), Daily Drilling Reports (DDRs), and fragmented experience.

### What eRTMAC-NWIS Delivers:
**eRTMAC-NWIS** acts as an autonomous, AI-enabled offset well decision-support copilot running alongside eRTMAC:
* **Geospatial Proximity Surveillance:** Spatially scans offset wells within an adjustable radius ($5\text{--}25\text{ km}$) relative to active drill bit coordinates using PostGIS.
* **Live eRTMAC Telemetry Ingestion:** Streams simulated real-time drilling sensor feeds (**ROP**, **WOB**, **RPM**, **Torque**, **Mud Weight**, **SPP**, and **Total Gas**) with automated kick/anomaly detection.
* **Subsurface Stratigraphic Tracking:** Visualizes real-time drill bit progression across the geological column of the Assam Basin (*Alluvium $\to$ Dhekiajuli $\to$ Tipam $\to$ Surma $\to$ Barail $\to$ Kopili*).
* **Deterministic Proximity Hazard Engine:** Evaluates a 4-factor risk model ($0\text{--}100$) and triggers proactive alerts when approaching depths/formations where offset wells encountered kicks, stuck pipe, or lost circulation.
* **Grounded AI Assistant (RAG with Anti-Hallucination):** Powered by **Google Gemini 3.6 Flash** and `gemini-embedding-001` with `pgvector`, providing cited mitigations directly from historical well dossiers.
* **Automated Document Ingestion & Verification (OCR + NLP):** Document extraction pipeline (`pdf-parse`, OCR, and Gemini entity structuring) with human-in-the-loop Data Steward approval workflows.
* **Pre-Spud Hazard Brief Generator:** One-click generation of official OIL-formatted operational briefing sheets for morning pre-spud and casing handover meetings.

---

## 2. Architecture & PERN Stack

```
                              [ Browser / Field Rig Client ]
                                             |
                         (HTTP / Next.js 14 Dashboard :3000)
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
      [ Next.js 14 Frontend ]                                [ Express API Backend :8000 ]
     - Industrial OIL Theme (#ED1C24)                       - REST Endpoints (/api/v1)
     - ESRI World Dark Gray Map                             - SSE Streaming Manager
     - Subsurface Stratigraphy Column                       - Deterministic Risk Engine
     - Live eRTMAC Telemetry Strip                          - Gemini 3.6 Flash Client
                   |                                                   |
                   +-------------------------+-------------------------+
                                             |
                         (Internal Docker Network: Bridge)
                                             |
         +-----------------------------------+-----------------------------------+
         |                                   |                                   |
[ PostgreSQL 15 + PostGIS + pgvector ]     [ MinIO Object Storage :9000 ]    [ Background Worker ]
 - 50 Assam Basin Wells (Spatial)           - WCR & DDR PDF Reports           - OCR & Text Parser
 - 200 Drilling Events (Barail Focus)       - Secure S3 API Buckets           - Embedding Generator
 - 768-dim Vector Embeddings                                                  - Document Extraction
```

### Technology Matrix

| Layer | Component | Version / Specification | Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js | `14.2.4` (App Router, React 18, TypeScript) | High-performance modular dashboard, zero client-side lag |
| **Styling** | Tailwind CSS | `3.4.4` (Oil India Brand Palette) | Industrial mission control palette: `#ED1C24` Red, `#EAA824` Gold, `#0F1216` Charcoal |
| **Mapping** | Leaflet.js | `1.9.4` + ESRI World Dark Gray Canvas | Fast, key-less dark canvas tiles without third-party watermarks |
| **Backend** | Node.js / Express | Node `20-alpine` + Express `4.19` | Low-latency I/O, native Server-Sent Events (SSE) streaming |
| **Database** | PostgreSQL + PostGIS | Postgres `15` + PostGIS `3.4` | Spatial proximity querying with `ST_DWithin` and indexing |
| **Vector Engine** | pgvector | `0.8.6` (`vector(768)`) | High-speed HNSW/IVFFlat cosine similarity search for RAG |
| **GenAI / LLM** | Google AI Studio | `gemini-3.6-flash` | Latest high-speed multimodal reasoning model with strict citations |
| **Embeddings** | Google AI Studio | `gemini-embedding-001` (768-dim) | Semantic chunk vectorization aligned with `pgvector` |
| **Storage** | MinIO | `RELEASE.2024-06` | S3-compatible on-premise document storage for WCR/DDR PDFs |

---

## 3. Four-Factor Proximity Risk Engine

Rather than relying on black-box predictions, NWIS computes an explainable, deterministic hazard score ($0\text{--}100$) based on petroleum engineering principles:

$$\text{Hazard Score} = S_{\text{depth}} + S_{\text{formation}} + S_{\text{recurrence}} + S_{\text{context}}$$

```
+-------------------------------------------------------------------------------+
| FACTOR 1: Depth Proximity (0 - 35 pts)                                        |
| Window: +/- 100 meters of active bit depth                                    |
| Points decay inversely with depth separation: max(0, 35 - 0.35 * delta_m)     |
+-------------------------------------------------------------------------------+
| FACTOR 2: Formation Match (0 - 25 pts)                                        |
| 25 pts if offset incident occurred within the exact active formation (Barail) |
+-------------------------------------------------------------------------------+
| FACTOR 3: Event Recurrence (0 - 20 pts)                                       |
| 5 pts per unique offset well reporting incidents at depth window (max 20)      |
+-------------------------------------------------------------------------------+
| FACTOR 4: Incident Severity Context (0 - 20 pts)                              |
| High severity (Blowout, Uncontrolled Kick) = 20 pts; Mud Loss = 10 pts       |
+-------------------------------------------------------------------------------+
```

* **Score $\ge 70$ (HIGH RISK):** Red audible and visual alert; triggers mandatory drilling precautions.
* **Score $40\text{--}69$ (MEDIUM RISK):** Amber alert; flags offset mud weight requirements.
* **Score $< 40$ (LOW RISK):** Normal drilling operational envelope.

---

## 4. Quick Start (Run Locally with Docker)

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows with WSL2 backend, macOS, or Linux)
* A free Google AI Studio API Key from [aistudio.google.com](https://aistudio.google.com)

### 1. Clone the Repository
```bash
git clone https://github.com/Devam759/SIH26121.git
cd SIH26121
```

### 2. Configure `.env`
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://nwis:password@db:5432/nwis
POSTGRES_PASSWORD=password
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=nwis-documents
GOOGLE_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY_HERE
JWT_SECRET=development_super_secret_jwt_key_assambasin_oil_india_2026_rtmac
JWT_EXPIRES_IN=60m
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=8000
AI_ENABLED=true
```

### 3. Launch All 5 Containers
```bash
docker compose up -d
```

Docker will automatically build and start:
1. `nwis-db`: PostgreSQL 15 + PostGIS 3.4 + pgvector 0.8.6 (Seeds 50 wells & 200 events)
2. `nwis-minio`: Local S3 object store
3. `nwis-api`: Express.js backend & SSE streaming server
4. `nwis-worker`: Background OCR & vector embedding pipeline
5. `nwis-frontend`: Next.js 14 Mission Control dashboard

### 4. Verify Running Services
```bash
docker ps
```
* **Frontend Console:** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
* **Backend Health Check:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
* **MinIO Storage Dashboard:** [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)

---

## 5. Demo Credentials

The database is pre-seeded with 3 authenticated role profiles for evaluation:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Drilling Engineer** | `engineer@oilindia.in` | `password123` | Active operations dashboard, live risk telemetry, RAG assistant queries, pre-spud briefs |
| **Data Steward** | `steward@oilindia.in` | `password123` | Document ingestion workspace, OCR validation, human-in-the-loop review queue |
| **Superintendent / Admin** | `admin@oilindia.in` | `password123` | System oversight, spatial radius overrides, and full audit logs |

---

## 6. Evaluator Demonstration Walkthrough

When presenting to hackathon evaluators, follow this recommended sequence:

### Step 1: Open the Mission Control Dashboard
Navigate to **[http://localhost:3000/dashboard](http://localhost:3000/dashboard)**.
* Point out the **Oil India Limited official corporate branding** (`#ED1C24` Crimson, `#EAA824` Petroleum Gold, and `#0F1216` Industrial Matte).
* Note the **eRTMAC WITSML Sensor Telemetry Strip** displaying live ROP ($14.5\text{ m/hr}$), WOB ($12.5\text{ tonnes}$), RPM ($110$), Torque ($18.2\text{ kN}\cdot\text{m}$), and Mud Weight ($1.16\text{ SG}$).

### Step 2: Observe Real-Time Drill Bit Progression & Influx Anomaly
* Watch the **Live SSE Simulation** increment depth (+0.5m every 3s).
* Watch the **Subsurface Lithology Column** track the drill bit descending into the **Barail Formation (2,600m -- 3,200m)**.
* When depth enters 2,780m -- 2,820m:
  * **Gas Units spike** from $34\text{ units}$ to **$170+\text{ units}$**.
  * A red **Sensor Anomaly Alert** banner triggers on the telemetry strip.
  * The Proximity Risk Score climbs to **89 / 100 (HIGH RISK)**, citing 6 nearby offset wells that suffered kicks and lost circulation.

### Step 3: Inspect Offset Well Incident Dossiers
* Click on any offset well on the basin map (e.g., `OIL-W-002` or `OIL-W-040`) or in the historical evidence list.
* The **Well Technical Profile Modal** displays total depth, target formation, and a chronological incident history detailing previous mud loss mitigations (*"Increased mud weight to 1.18 SG; pumped 25 bbl mica pill"*).

### Step 4: Generate the Official Pre-Spud Hazard Brief
* Click **"Pre-Spud Brief"** in the top navigation ribbon.
* Shows an official **Oil India Limited Directorate of Operations** hazard appraisal sheet complete with risk breakdown, offset correlation matrix, and mandatory drilling precautions (casing depths, kill mud reserve, and pit volume alarm limits).
* Click **"Print / Export PDF"** to demonstrate browser print-readiness.

### Step 5: Showcase the AI/OCR Extraction Pipeline
* Switch to the **"Data Steward"** tab.
* Click **"Demo: Ingest Sample Barail WCR (PDF)"**.
* Demonstrates the live 4-stage automated extraction workflow:
  1. `MinIO S3 Ingestion`
  2. `Text & OCR Extraction`
  3. `Gemini 3.6 Flash Entity Structuring`
  4. `pgvector 768-dim Embeddings`
* Extracted events appear in the review queue for one-click **"Approve"** action by human stewards.

### Step 6: Query the Grounded RAG Assistant
* In the AI Assistant side panel, ask:
  > *"What drilling hazards exist in the Barail formation around 2800m and what mitigations worked?"*
* The assistant synthesizes verified historical evidence with source citations and strict anti-hallucination guardrails.

---

## 7. REST API Endpoints Reference

All endpoints are prefixed with `/api/v1`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health (`database: ok`, `ai_service: ok`) |
| `POST` | `/auth/login` | Authenticate with email/password; returns JWT |
| `GET` | `/wells` | Geospatial search (`?lat=26.85&lon=94.53&radius_km=10`) |
| `GET` | `/wells/:id` | Individual well details, field, total depth |
| `GET` | `/wells/:id/events` | Historical drilling incidents for specified well |
| `GET` | `/wells/:id/formations` | Formation tops and geological intervals |
| `POST` | `/risk/assess` | Compute 4-factor risk score & evidence for given depth |
| `GET` | `/stream/live/:wellId` | Server-Sent Events (SSE) real-time drilling stream |
| `POST` | `/assistant/query` | Authenticated RAG query with Gemini 3.6 Flash |
| `POST` | `/documents/upload` | Ingest WCR/DDR PDF to MinIO and queue for extraction |
| `GET` | `/events` | Query drilling events (`?review_status=EXTRACTED`) |
| `PATCH` | `/events/:id` | Update event status (`APPROVED` / `REJECTED`) |

---

## 8. Directory Layout

```
SIH PROJECT/
├── docker-compose.yml              # Multi-container orchestrator
├── .env.example                    # Environment variable template
├── db/
│   ├── Dockerfile                  # PostGIS + pgvector custom PostgreSQL build
│   ├── schema.sql                  # Relational, spatial, and vector schema
│   └── seed.sql                    # 50 Assam wells, 200 incidents, 298 formation intervals
├── packages/
│   ├── api/                        # Express.js REST & SSE Backend
│   │   ├── src/
│   │   │   ├── routes/             # Health, Auth, Wells, Risk, Stream, Assistant, Docs
│   │   │   ├── services/           # RiskEngine, RAGService, MinIOService, SSEManager
│   │   │   └── ai/                 # Gemini 3.6 Flash & embedding clients
│   │   └── Dockerfile
│   ├── frontend/                   # Next.js 14 Mission Control Dashboard
│   │   ├── app/                    # App Router (layout, dashboard page, globals)
│   │   ├── components/
│   │   │   ├── Telemetry/          # ERTMACTelemetryStrip.tsx
│   │   │   ├── Subsurface/         # LithologyColumn.tsx
│   │   │   ├── Map/                # WellMap.tsx, WellDetailModal.tsx
│   │   │   ├── Risk/               # RiskPanel.tsx, HazardBriefModal.tsx
│   │   │   ├── Assistant/          # ChatPanel.tsx
│   │   │   └── Documents/          # DocumentUploader.tsx, ReviewTable.tsx
│   │   ├── hooks/                  # useSSE.ts real-time streaming hook
│   │   └── Dockerfile
│   └── worker/                     # Async PDF processing & vector indexing pipeline
│       └── src/
│           ├── pipeline/           # pdfExtract, geminiExtract, embed (pgvector)
│           └── worker.js
└── scripts/
    └── generate_seed.py            # Synthetic dataset generator for Assam Basin
```

---

## 9. Security, Reliability & Compliance

* **No Plaintext Passwords:** Passwords hashed with `bcryptjs` (salt rounds: 10).
* **Role-Based Access Control (RBAC):** Distinct permissions for Engineers, Stewards, and Admins enforced via JWT.
* **Strict Anti-Hallucination Guardrails:** AI Assistant answers strictly from grounded vector search results; explicitly declares when evidence is absent.
* **Sanitized Inputs:** All incoming payloads validated via `zod` schemas; SQL injection prevented via parameterized PostgreSQL queries.
* **Zero External Paid Map Dependencies:** Free, dark ESRI canvas map tiles without rate limits or commercial watermarks.

---

## 10. Contributors & Acknowledgements

Developed for **Smart India Hackathon 2026** under Problem Statement **SIH 26121** for **Oil India Limited (OIL)**.
* **Organization:** Oil India Limited (A Maharatna CPSE)
* **Theme:** Smart Automation (Upstream Petroleum & Drilling Operations)
