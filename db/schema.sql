-- ==============================================================================
-- eRTMAC-NWIS Database Schema (PERN Stack)
-- SIH 26121 | Oil India Limited
-- PostgreSQL 15 + PostGIS 3 + pgvector 0.7
-- ==============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
    CREATE TYPE well_status    AS ENUM ('active','completed','abandoned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE event_type     AS ENUM ('MUD_LOSS','KICK','STUCK_PIPE','TORQUE_SPIKE',
                                        'CEMENTING_ISSUE','NPT','BHA_FAILURE','WASHOUT','OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('LOW','MEDIUM','HIGH','UNKNOWN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE review_status  AS ENUM ('EXTRACTED','REVIEWED','APPROVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE doc_status     AS ENUM ('uploaded','processing','processed','failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE risk_level     AS ENUM ('LOW','MEDIUM','HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE confidence_level AS ENUM ('LOW','MEDIUM','HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE alert_status   AS ENUM ('active','acknowledged','resolved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_role      AS ENUM ('engineer','steward','admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------------
-- 1. Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "user" (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'engineer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. Wells
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS well (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(100) NOT NULL,
  api_number     VARCHAR(50),
  latitude       DECIMAL(10,7) NOT NULL,
  longitude      DECIMAL(10,7) NOT NULL,
  location       GEOGRAPHY(Point, 4326),
  status         well_status NOT NULL DEFAULT 'completed',
  total_depth_m  DECIMAL(8,2),
  spud_date      DATE,
  basin          VARCHAR(100),
  field          VARCHAR(100),
  is_synthetic   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_well_location ON well USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_well_status ON well(status);

-- Trigger: auto-compute location from lat/lon on insert/update
CREATE OR REPLACE FUNCTION sync_well_location() RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS well_location_sync ON well;
CREATE TRIGGER well_location_sync
  BEFORE INSERT OR UPDATE OF latitude, longitude ON well
  FOR EACH ROW EXECUTE FUNCTION sync_well_location();

-- ---------------------------------------------------------------------------
-- 3. Formations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formation (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  well_id      UUID NOT NULL REFERENCES well(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  top_depth_m  DECIMAL(8,2) NOT NULL,
  base_depth_m DECIMAL(8,2) NOT NULL,
  lithology    VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_formation_well ON formation(well_id);

-- ---------------------------------------------------------------------------
-- 4. Trajectory Points
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trajectorypoint (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  well_id         UUID NOT NULL REFERENCES well(id) ON DELETE CASCADE,
  md_m            DECIMAL(8,2) NOT NULL,
  tvd_m           DECIMAL(8,2) NOT NULL,
  inclination_deg DECIMAL(5,2),
  azimuth_deg     DECIMAL(5,2)
);

CREATE INDEX IF NOT EXISTS idx_trajectory_well ON trajectorypoint(well_id);

-- ---------------------------------------------------------------------------
-- 5. Documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename        VARCHAR(255) NOT NULL,
  minio_key       VARCHAR(500) NOT NULL,
  checksum_sha256 CHAR(64),
  version         INTEGER NOT NULL DEFAULT 1,
  status          doc_status NOT NULL DEFAULT 'uploaded',
  page_count      INTEGER,
  model_used      VARCHAR(100),
  uploaded_by     UUID REFERENCES "user"(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_document_status ON document(status);

-- ---------------------------------------------------------------------------
-- 6. Document Chunks (pgvector 768 dims for text-embedding-004)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentchunk (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  page_number     INTEGER,
  section_heading VARCHAR(200),
  text            TEXT NOT NULL,
  token_count     INTEGER,
  embedding       VECTOR(768)
);

CREATE INDEX IF NOT EXISTS idx_chunk_doc ON documentchunk(document_id);
-- Note: IVFFlat index created after population or with graceful fallback
DO $$ BEGIN
    CREATE INDEX idx_chunk_embedding ON documentchunk
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
EXCEPTION WHEN OTHERS THEN null; END $$;

-- ---------------------------------------------------------------------------
-- 7. Drilling Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drillingevent (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  well_id            UUID NOT NULL REFERENCES well(id) ON DELETE CASCADE,
  event_type         event_type NOT NULL,
  depth_start_m      DECIMAL(8,2) NOT NULL,
  depth_end_m        DECIMAL(8,2),
  formation          VARCHAR(100),
  severity           severity_level NOT NULL DEFAULT 'UNKNOWN',
  duration_hrs       DECIMAL(6,2),
  description        TEXT,
  mitigation         TEXT,
  source_document_id UUID REFERENCES document(id),
  review_status      review_status NOT NULL DEFAULT 'EXTRACTED',
  reviewed_by        UUID REFERENCES "user"(id),
  reviewed_at        TIMESTAMPTZ,
  is_synthetic       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_well_depth ON drillingevent(well_id, depth_start_m);
CREATE INDEX IF NOT EXISTS idx_event_type_status ON drillingevent(event_type, review_status);

-- ---------------------------------------------------------------------------
-- 8. Risk Assessments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS riskassessment (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  well_id             UUID NOT NULL REFERENCES well(id),
  current_depth_m     DECIMAL(8,2) NOT NULL,
  formation           VARCHAR(100),
  radius_km           DECIMAL(5,2),
  score               INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  level               risk_level NOT NULL,
  confidence          confidence_level NOT NULL,
  factors             JSONB NOT NULL DEFAULT '[]',
  evidence_event_ids  UUID[],
  evidence_well_count INTEGER,
  simulated           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_well ON riskassessment(well_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 9. Alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_assessment_id  UUID NOT NULL REFERENCES riskassessment(id),
  well_id             UUID NOT NULL REFERENCES well(id),
  message             TEXT NOT NULL,
  status              alert_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_status ON alert(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. Audit Log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditlog (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID REFERENCES "user"(id),
  actor_role    VARCHAR(50),
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50),
  entity_id     UUID,
  metadata_json JSONB,
  timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON auditlog(timestamp_utc DESC);
