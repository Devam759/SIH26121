# Data Model & API Specification — v2
## eRTMAC-NWIS (Nearby Wells Intelligence System)
**Hackathon Planning Pack | SIH 26121 | Oil India Limited**
**Document Version:** 2.0 | **Date:** 06 September 2026

> **Change log from v1:** Locked `event_type` as a proper enum (§1), added `/api/v1/` prefix to all routes (§3), added `GET /api/v1/wells/{id}/formations` endpoint (§3), defined SSE message schema (§4), added pagination envelope to all list endpoints (§3), added `GET /api/v1/health` endpoint (§3).

---

## 1. Core Entities

### 1.1 Well

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(100) | e.g., "OIL-W-042" |
| `api_number` | VARCHAR(50) | Optional industry identifier |
| `latitude` | DECIMAL(10,7) | WGS-84 |
| `longitude` | DECIMAL(10,7) | WGS-84 |
| `location` | GEOGRAPHY(Point, 4326) | PostGIS computed column for spatial queries |
| `status` | ENUM('active','completed','abandoned') | — |
| `total_depth_m` | DECIMAL(8,2) | Total drilled depth in metres |
| `spud_date` | DATE | Nullable |
| `basin` | VARCHAR(100) | e.g., "Brahmaputra" |
| `field` | VARCHAR(100) | e.g., "Lakwa" |
| `is_synthetic` | BOOLEAN | Always TRUE for demo data |
| `created_at` | TIMESTAMPTZ | UTC |
| `updated_at` | TIMESTAMPTZ | UTC |

**Indexes:** `GIST(location)` for PostGIS radius queries; `idx_well_status` on `status`.

---

### 1.2 Formation

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `well_id` | UUID | FK → Well |
| `name` | VARCHAR(100) | e.g., "Barail", "Tipam", "Kopili" |
| `top_depth_m` | DECIMAL(8,2) | Top of formation in metres |
| `base_depth_m` | DECIMAL(8,2) | Base of formation in metres |
| `lithology` | VARCHAR(200) | Optional brief description |

**Index:** `idx_formation_well_depth` on `(well_id, top_depth_m, base_depth_m)`.

---

### 1.3 TrajectoryPoint

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `well_id` | UUID | FK → Well |
| `md_m` | DECIMAL(8,2) | Measured depth |
| `tvd_m` | DECIMAL(8,2) | True vertical depth |
| `inclination_deg` | DECIMAL(5,2) | Optional |
| `azimuth_deg` | DECIMAL(5,2) | Optional |

> **MVP scope:** Seed at least 5 trajectory points per well (at surface, 1/4, 1/2, 3/4, total depth). Used to render a basic trajectory preview, not for wellbore collision analysis.

---

### 1.4 DrillingEvent

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `well_id` | UUID | FK → Well |
| `event_type` | ENUM | **Locked enum — see below** |
| `depth_start_m` | DECIMAL(8,2) | Required |
| `depth_end_m` | DECIMAL(8,2) | Nullable (point events) |
| `formation` | VARCHAR(100) | Nullable |
| `severity` | ENUM('LOW','MEDIUM','HIGH','UNKNOWN') | Required |
| `duration_hrs` | DECIMAL(6,2) | Nullable |
| `description` | TEXT | Short normalized summary (≤ 200 chars) |
| `mitigation` | TEXT | Nullable — historically recorded mitigation |
| `source_document_id` | UUID | FK → Document (nullable for manually entered events) |
| `source_locator` | VARCHAR(500) | Page/section reference e.g., "Page 14, Section 3.2" |
| `review_status` | ENUM('EXTRACTED','REVIEWED','APPROVED') | Default: EXTRACTED |
| `reviewed_by` | UUID | FK → User, nullable |
| `reviewed_at` | TIMESTAMPTZ | Nullable |
| `is_synthetic` | BOOLEAN | Always TRUE for demo data |
| `created_at` | TIMESTAMPTZ | UTC |

**`event_type` enum (locked):**
```sql
CREATE TYPE event_type AS ENUM (
    'MUD_LOSS',
    'KICK',
    'STUCK_PIPE',
    'TORQUE_SPIKE',
    'CEMENTING_ISSUE',
    'NPT',
    'BHA_FAILURE',
    'WASHOUT',
    'OTHER'
);
```

**Indexes:** `idx_event_well_depth` on `(well_id, depth_start_m)`; `idx_event_type_status` on `(event_type, review_status)`.

---

### 1.5 Document

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `filename` | VARCHAR(255) | Original upload filename |
| `minio_key` | VARCHAR(500) | MinIO object key |
| `checksum_sha256` | CHAR(64) | Deduplication |
| `version` | INTEGER | Default 1 |
| `status` | ENUM('uploaded','processing','processed','failed') | — |
| `page_count` | INTEGER | Nullable until processed |
| `model_used` | VARCHAR(100) | e.g., "gemini-1.5-flash-latest" |
| `prompt_version` | VARCHAR(20) | e.g., "v2.1" |
| `uploaded_by` | UUID | FK → User |
| `uploaded_at` | TIMESTAMPTZ | UTC |
| `processed_at` | TIMESTAMPTZ | Nullable |

---

### 1.6 DocumentChunk

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `document_id` | UUID | FK → Document |
| `chunk_index` | INTEGER | 0-based within document |
| `page_number` | INTEGER | Source PDF page |
| `section_heading` | VARCHAR(200) | Nullable |
| `text` | TEXT | Raw chunk text (≤ 512 tokens) |
| `token_count` | INTEGER | Actual token count |
| `embedding` | VECTOR(768) | text-embedding-004 output |

**Index:** `idx_chunk_embedding` using `ivfflat` on `embedding` with `lists=100`, `probes=10`.

---

### 1.7 RiskAssessment

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `well_id` | UUID | FK → Well |
| `current_depth_m` | DECIMAL(8,2) | Depth at time of assessment |
| `formation` | VARCHAR(100) | Current formation at assessment time |
| `radius_km` | DECIMAL(5,2) | Radius used |
| `score` | INTEGER | 0–100 |
| `level` | ENUM('LOW','MEDIUM','HIGH') | — |
| `confidence` | ENUM('LOW','MEDIUM','HIGH') | Based on supporting well count |
| `factors` | JSONB | `[{"name": "depth_proximity", "score": 33}, ...]` |
| `evidence_event_ids` | UUID[] | Array of DrillingEvent IDs used |
| `evidence_well_count` | INTEGER | Distinct wells in evidence |
| `simulated` | BOOLEAN | TRUE if triggered by SSE simulator |
| `created_at` | TIMESTAMPTZ | UTC |

---

### 1.8 Alert

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `risk_assessment_id` | UUID | FK → RiskAssessment |
| `well_id` | UUID | FK → Well |
| `message` | TEXT | Human-readable alert message |
| `status` | ENUM('active','acknowledged','resolved') | — |
| `created_at` | TIMESTAMPTZ | UTC |
| `acknowledged_at` | TIMESTAMPTZ | Nullable |

---

### 1.9 AuditLog

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `actor_id` | UUID | FK → User (nullable for system actions) |
| `actor_role` | VARCHAR(50) | Denormalized for read performance |
| `action` | VARCHAR(100) | e.g., `document.upload`, `event.approved`, `assistant.query` |
| `entity_type` | VARCHAR(50) | e.g., `document`, `event`, `alert` |
| `entity_id` | UUID | Nullable |
| `metadata_json` | JSONB | Action-specific metadata (model version, prompt version, etc.) |
| `timestamp_utc` | TIMESTAMPTZ | UTC |

---

## 2. Relationship Summary

```
Well ─── 1:N ──► Formation
Well ─── 1:N ──► TrajectoryPoint
Well ─── 1:N ──► DrillingEvent ◄── N:1 ─── Document ─── 1:N ──► DocumentChunk
Well ─── 1:N ──► RiskAssessment ─── 1:N ──► Alert
RiskAssessment ── references ──► DrillingEvent[] (via evidence_event_ids)
```

---

## 3. REST API — Full Specification

> All routes are prefixed `/api/v1/`. All responses wrapped in:
> ```json
> { "data": ..., "meta": { "timestamp_utc": "..." } }
> ```
> List responses also include:
> ```json
> { "data": [...], "meta": { "total": 142, "page": 1, "limit": 20, "pages": 8, "timestamp_utc": "..." } }
> ```

### 3.1 System

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | None | Service status (DB, AI, vector index) |

### 3.2 Auth

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/login` | None | Returns access + refresh JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh token | Returns new access token |
| POST | `/api/v1/auth/logout` | Access token | Invalidates refresh token |

### 3.3 Wells

| Method | Endpoint | Auth | Query Params | Purpose |
|---|---|---|---|---|
| GET | `/api/v1/wells` | Engineer+ | `lat`, `lon`, `radius_km`, `status`, `page`, `limit` | Nearby wells (PostGIS radius) |
| GET | `/api/v1/wells/{id}` | Engineer+ | — | Well detail |
| GET | `/api/v1/wells/{id}/events` | Engineer+ | `depth_min`, `depth_max`, `event_type`, `severity`, `formation`, `status`, `page`, `limit` | Historical events for well |
| GET | `/api/v1/wells/{id}/formations` | Engineer+ | — | Formation intervals for well *(New in v2)* |
| GET | `/api/v1/wells/{id}/trajectory` | Engineer+ | — | Trajectory points |
| GET | `/api/v1/wells/{id}/alerts` | Engineer+ | `page`, `limit` | Risk alerts for well |
| POST | `/api/v1/wells` | Admin | — | Create well |
| PATCH | `/api/v1/wells/{id}` | Steward+ | — | Update well metadata |

### 3.4 Events

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/events/{id}` | Engineer+ | Event detail |
| PATCH | `/api/v1/events/{id}` | Steward+ | Review/edit/approve event |
| DELETE | `/api/v1/events/{id}` | Admin | Delete event (audit logged) |

### 3.5 Documents

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/documents` | Steward+ | Upload document (multipart/form-data) |
| GET | `/api/v1/documents` | Steward+ | List documents (`page`, `limit`) |
| GET | `/api/v1/documents/{id}` | Steward+ | Document status and metadata |
| POST | `/api/v1/documents/{id}/process` | Steward+ | Trigger extraction pipeline |
| GET | `/api/v1/documents/{id}/events` | Steward+ | Extracted events for review |
| GET | `/api/v1/documents/{id}/chunks` | Admin | View chunks (debug) |

### 3.6 Search & AI

| Method | Endpoint | Auth | Body | Purpose |
|---|---|---|---|---|
| POST | `/api/v1/search` | Engineer+ | `{ query, well_id?, depth_min?, depth_max?, formation?, event_type?, radius_km?, page, limit }` | Structured + semantic search |
| POST | `/api/v1/assistant/query` | Engineer+ | `{ question, well_id, current_depth_m?, formation?, radius_km? }` | RAG question answering |

### 3.7 Risk

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/risk/assess` | Engineer+ | Compute risk score for well/depth |
| GET | `/api/v1/risk/history?well_id=` | Engineer+ | Past risk assessments |

### 3.8 Alerts

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/alerts?well_id=&status=` | Engineer+ | Active/historical alerts |
| PATCH | `/api/v1/alerts/{id}` | Engineer+ | Acknowledge/resolve alert |

### 3.9 Real-time Stream (SSE)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/stream/live/{well_id}` | Engineer+ | SSE depth stream |

---

## 4. SSE Message Schema

The SSE stream emits two event types:

**`depth_update`** — emitted every 3 seconds:
```json
{
  "event": "depth_update",
  "data": {
    "well_id": "3f7c1a2b-...",
    "current_depth_m": 2741.5,
    "timestamp_utc": "2026-09-06T09:23:11Z",
    "simulated": true
  }
}
```

**`risk_alert`** — emitted when risk threshold crossed:
```json
{
  "event": "risk_alert",
  "data": {
    "well_id": "3f7c1a2b-...",
    "risk_assessment_id": "a1b2c3d4-...",
    "score": 83,
    "level": "HIGH",
    "confidence": "MEDIUM",
    "current_depth_m": 2741.5,
    "factors": [
      {"name": "depth_proximity", "score": 33},
      {"name": "formation_match", "score": 25},
      {"name": "event_recurrence", "score": 15},
      {"name": "context_score", "score": 10}
    ],
    "evidence_wells": ["OIL-W-017", "OIL-W-021", "OIL-W-032"],
    "alert_message": "HIGH risk interval detected: 3 nearby wells experienced MUD_LOSS and KICK events at similar depth.",
    "timestamp_utc": "2026-09-06T09:23:14Z",
    "simulated": true
  }
}
```

---

## 5. Example Request/Response Pairs

### Risk Assessment Request

```json
POST /api/v1/risk/assess
Authorization: Bearer <token>
Content-Type: application/json

{
  "well_id": "3f7c1a2b-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
  "current_depth_m": 2740.0,
  "formation": "Barail",
  "radius_km": 10
}
```

### Risk Assessment Response

```json
{
  "data": {
    "risk_assessment_id": "a1b2c3d4-...",
    "score": 83,
    "level": "HIGH",
    "confidence": "MEDIUM",
    "evidence_well_count": 3,
    "factors": [
      {"name": "depth_proximity", "score": 33, "max": 35, "description": "Nearest event 10 m from current depth"},
      {"name": "formation_match", "score": 25, "max": 25, "description": "2 wells in Barail formation"},
      {"name": "event_recurrence", "score": 15, "max": 20, "description": "3 events across nearby wells"},
      {"name": "context_score", "score": 10, "max": 20, "description": "2 distinct event types observed"}
    ],
    "evidence": [
      {"well_id": "OIL-W-017", "event_id": "...", "event_type": "MUD_LOSS", "depth_m": 2750, "severity": "HIGH"},
      {"well_id": "OIL-W-021", "event_id": "...", "event_type": "STUCK_PIPE", "depth_m": 2800, "severity": "MEDIUM"},
      {"well_id": "OIL-W-032", "event_id": "...", "event_type": "KICK", "depth_m": 2730, "severity": "HIGH"}
    ],
    "disclaimer": "Decision-support signal only. Review source evidence before taking action.",
    "synthetic_data": true
  },
  "meta": { "timestamp_utc": "2026-09-06T09:23:14Z" }
}
```

---

## 6. API Rules

1. Validate all well and document identifiers server-side; return 404 for missing, 403 for unauthorized.
2. Never accept client-provided `risk_score`, `level`, `confidence`, or `evidence_ids` — always compute server-side.
3. Store all timestamps in UTC; render local time (IST, UTC+5:30) in the UI.
4. Return structured error responses: `{ "error": { "code": "WELL_NOT_FOUND", "message": "...", "request_id": "..." } }`.
5. Apply pagination to all list endpoints; never return unbounded lists.
6. Document upload: validate MIME type must be `application/pdf`; return 415 otherwise.
7. Rate limit AI endpoints: 10 requests/minute per authenticated user.
8. All endpoints require authentication except `/api/v1/health` and `/api/v1/auth/*`.
