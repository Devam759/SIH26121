"""
NWIS Synthetic Data Generator
SIH 26121 | Oil India Limited | eRTMAC-NWIS

Generates:
  - 50 synthetic wells (Assam/Brahmaputra basin, OIL operational zones)
  - 200 drilling events (9 event types, realistic depth/severity distributions)
  - 150 formation intervals (Barail, Tipam, Kopili, Bhuban, Bokabil, Girujan)
  - 250 trajectory points (5 per well)
  - 5 synthetic drilling report texts (for PDF/OCR demo)

Usage:
    pip install faker psycopg2-binary python-dotenv reportlab
    python 10_NWIS_Synthetic_Data_Script.py

Output:
    - Inserts data directly into PostgreSQL (configure DATABASE_URL in .env)
    - Saves 5 synthetic PDF reports to ./synthetic_reports/

NOTE: All data is clearly marked is_synthetic=TRUE in the database.
      All PDFs include a [SYNTHETIC - DEMO DATA] header.
"""

import os
import random
import uuid
import math
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://nwis:password@localhost:5432/nwis")
OUTPUT_DIR = Path("./synthetic_reports")
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# ---------------------------------------------------------------------------
# OIL India Assam Basin — Geographic Boundaries
# Wells placed in realistic OIL operational zones
# Lakwa, Jorhat, Sibsagar, Moran, Naharkatiya areas
# ---------------------------------------------------------------------------

BASIN_ZONES = [
    # (name, center_lat, center_lon, radius_km)
    ("Lakwa",       26.852, 94.532, 15),
    ("Moran",       27.101, 94.877, 12),
    ("Naharkatiya", 27.312, 95.341, 10),
    ("Jorhat",      26.747, 94.199,  8),
    ("Geleki",      27.025, 94.651, 10),
]

# ---------------------------------------------------------------------------
# Stratigraphy — OIL Assam Basin Formations (top to base)
# ---------------------------------------------------------------------------

FORMATIONS = [
    # (name, typical_top_m, typical_base_m, lithology)
    ("Alluvium",      0,    200,  "Unconsolidated sand and silt"),
    ("Girujan",     200,    600,  "Alternating sandstone and shale"),
    ("Tipam",       600,   1400,  "Massive sandstone, good reservoir"),
    ("Bokabil",    1400,   2200,  "Shale-dominated with thin sandstone"),
    ("Bhuban",     2200,   2800,  "Interbedded sandstone and shale"),
    ("Barail",     2800,   3600,  "Tight sandstone and carbonaceous shale — primary target"),
    ("Kopili",     3600,   4200,  "Marine shale, high pressure zone"),
    ("Sylhet",     4200,   5000,  "Limestone and dolomite, naturally fractured"),
]

# ---------------------------------------------------------------------------
# Event Type Distributions
# Barail formation has deliberate clustering (for demo risk trigger)
# ---------------------------------------------------------------------------

EVENT_TYPES = [
    "MUD_LOSS", "KICK", "STUCK_PIPE", "TORQUE_SPIKE",
    "CEMENTING_ISSUE", "NPT", "BHA_FAILURE", "WASHOUT", "OTHER"
]

SEVERITY_WEIGHTS = {"LOW": 0.3, "MEDIUM": 0.45, "HIGH": 0.2, "UNKNOWN": 0.05}

# Event type probabilities per formation
FORMATION_EVENT_PROFILES = {
    "Tipam":    {"MUD_LOSS": 0.25, "NPT": 0.30, "OTHER": 0.45},
    "Bokabil":  {"STUCK_PIPE": 0.30, "TORQUE_SPIKE": 0.25, "NPT": 0.20, "OTHER": 0.25},
    "Bhuban":   {"STUCK_PIPE": 0.25, "KICK": 0.20, "MUD_LOSS": 0.20, "NPT": 0.15, "OTHER": 0.20},
    "Barail":   {"MUD_LOSS": 0.30, "KICK": 0.25, "STUCK_PIPE": 0.20, "TORQUE_SPIKE": 0.15, "NPT": 0.10},
    "Kopili":   {"KICK": 0.40, "MUD_LOSS": 0.30, "CEMENTING_ISSUE": 0.15, "OTHER": 0.15},
    "Sylhet":   {"MUD_LOSS": 0.35, "CEMENTING_ISSUE": 0.25, "BHA_FAILURE": 0.15, "WASHOUT": 0.15, "OTHER": 0.10},
    "default":  {et: 1/9 for et in EVENT_TYPES},
}

MITIGATIONS = {
    "MUD_LOSS": [
        "Pumped LCM (Lost Circulation Material) pill; reduced ECD; spotted calcium carbonate plug",
        "Reduced pump rate; set cement plug; waited for cement to set",
        "Spotted bentonite-based LCM pill; drilled blind with reduced WOB",
        "Increased mud weight to 1.18 SG; reduced flow rate to 600 LPM",
        "Spotted CaCO3 and mica LCM blend; successfully cured loss after 2 hrs",
    ],
    "KICK": [
        "Detected gain of 2.5 m3; shut-in well; circulated kick out with heavier mud (1.22 SG)",
        "Implemented drillers method; confirmed kill weight mud 1.19 SG; resumed operations",
        "Closed BOP; recorded SIDPP 42 bar, SICP 58 bar; circulated out kick in 3 hours",
        "Increased mud weight from 1.14 to 1.20 SG; confirmed well static after 6 hours",
    ],
    "STUCK_PIPE": [
        "Applied overpull 80 kN; jarred with 120 kN; worked pipe free after 4 hours",
        "Spotted oil-based pill; reciprocated string; freed pipe after 8 hours of jarring",
        "Pumped 15 m3 diesel-bentonite pill; rotated slowly; freed after 6 hours",
        "Backed off at tool joint; sidetracked from 2,780 m; original string lost in hole",
    ],
    "TORQUE_SPIKE": [
        "Reduced WOB from 120 to 80 kN; increased RPM from 80 to 120; resolved after reaming",
        "Reamed through 50 m interval; cleaned borehole; torque normalized within 1 hour",
        "Pumped sweep (high-viscosity pill); torque reduced from 18 to 11 kNm after circulation",
    ],
    "CEMENTING_ISSUE": [
        "Performed cement bond log; perforated and squeezed top perforations; re-evaluated",
        "Re-cemented liner top; pressure tested to 200 bar; integrity confirmed",
        "Placed remedial cement plug; allowed 48 hours WOC; drilled out and continued",
    ],
    "NPT": [
        "Repaired surface pump; replaced liner assembly; resumed drilling after 12 hours",
        "Replaced BHA component (MWD tool failure); redressed bit; resumed operations",
        "Conducted string inspection; replaced faulty saver sub; pressure-tested BOP",
    ],
    "BHA_FAILURE": [
        "Retrieved BHA; replaced bent motor; re-ran assembly",
        "Jarred and retrieved damaged stabilizer; redressed at surface; re-ran",
    ],
    "WASHOUT": [
        "Pulled out with washed-out bit; changed to new PDC bit; resumed drilling",
        "Detected washout via torque/pressure decline; POOH; confirmed bit damage on surface",
    ],
    "OTHER": [
        "Investigated issue; implemented corrective measures; resumed drilling",
        "Held team review; adjusted drilling parameters; monitored closely",
    ],
}

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def gen_uuid():
    return str(uuid.uuid4())

def random_coord_in_zone(zone):
    """Generate a random coordinate within zone_radius_km of zone center."""
    name, clat, clon, radius_km = zone
    angle = random.uniform(0, 2 * math.pi)
    dist_km = random.uniform(0, radius_km)
    # Approximate: 1 degree lat ≈ 111 km
    dlat = (dist_km * math.cos(angle)) / 111.0
    dlon = (dist_km * math.sin(angle)) / (111.0 * math.cos(math.radians(clat)))
    return round(clat + dlat, 7), round(clon + dlon, 7)

def get_formation_at_depth(depth_m):
    for fname, top, base, _ in FORMATIONS:
        if top <= depth_m < base:
            return fname
    return "Unknown"

def pick_event_type(formation):
    profile = FORMATION_EVENT_PROFILES.get(formation, FORMATION_EVENT_PROFILES["default"])
    types = list(profile.keys())
    weights = list(profile.values())
    return random.choices(types, weights=weights, k=1)[0]

def pick_severity():
    return random.choices(
        list(SEVERITY_WEIGHTS.keys()),
        weights=list(SEVERITY_WEIGHTS.values()),
        k=1
    )[0]

def pick_mitigation(event_type, severity):
    options = MITIGATIONS.get(event_type, MITIGATIONS["OTHER"])
    if severity == "UNKNOWN":
        return None
    return random.choice(options)

def random_date(start_year=2015, end_year=2025):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))

def now_utc():
    return datetime.now(timezone.utc).isoformat()

# ---------------------------------------------------------------------------
# Data Generation
# ---------------------------------------------------------------------------

def generate_wells(n=50):
    wells = []
    for i in range(1, n + 1):
        zone = random.choice(BASIN_ZONES)
        lat, lon = random_coord_in_zone(zone)
        total_depth = round(random.uniform(1800, 5000), 1)
        status = random.choices(
            ["completed", "abandoned", "active"],
            weights=[0.70, 0.20, 0.10], k=1
        )[0]
        # Make W-042 always the "active" demo well at a known location
        if i == 42:
            lat, lon = 26.852, 94.532
            status = "active"
            total_depth = 3200.0

        wells.append({
            "id": gen_uuid(),
            "well_number": i,
            "name": f"OIL-W-{i:03d}",
            "api_number": f"IN-AS-OIL-{i:05d}",
            "latitude": lat,
            "longitude": lon,
            "status": status,
            "total_depth_m": total_depth,
            "spud_date": str(random_date(2010, 2023)),
            "basin": "Brahmaputra",
            "field": zone[0],
            "is_synthetic": True,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        })
    return wells

def generate_formations(wells):
    formations = []
    for well in wells:
        current_top = 0.0
        for fname, form_top, form_base, lithology in FORMATIONS:
            if form_base > well["total_depth_m"]:
                actual_base = well["total_depth_m"]
            else:
                actual_base = form_base + random.uniform(-50, 50)

            if current_top >= well["total_depth_m"]:
                break

            formations.append({
                "id": gen_uuid(),
                "well_id": well["id"],
                "name": fname,
                "top_depth_m": round(current_top, 1),
                "base_depth_m": round(min(actual_base, well["total_depth_m"]), 1),
                "lithology": lithology,
            })
            current_top = actual_base
            if current_top >= well["total_depth_m"]:
                break
    return formations

def generate_trajectory_points(wells):
    points = []
    for well in wells:
        depths = [0, well["total_depth_m"] * 0.25, well["total_depth_m"] * 0.50,
                  well["total_depth_m"] * 0.75, well["total_depth_m"]]
        for md in depths:
            tvd = md * random.uniform(0.97, 1.0)  # Mostly vertical wells
            points.append({
                "id": gen_uuid(),
                "well_id": well["id"],
                "md_m": round(md, 1),
                "tvd_m": round(tvd, 1),
                "inclination_deg": round(random.uniform(0, 5), 2),
                "azimuth_deg": round(random.uniform(0, 360), 2),
            })
    return points

def generate_events(wells, n_total=200):
    """
    Generate drilling events. Deliberately clusters events in Barail formation
    (2,800-3,600 m) for nearby wells around W-042 to trigger demo risk score.
    """
    events = []
    well_42 = next(w for w in wells if w["well_number"] == 42)
    w42_lat, w42_lon = well_42["latitude"], well_42["longitude"]

    # Identify wells within 10 km of W-042 (for deliberate clustering)
    def distance_km(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
        return R * 2 * math.asin(math.sqrt(a))

    nearby_wells = [
        w for w in wells
        if w["well_number"] != 42 and
        distance_km(w42_lat, w42_lon, w["latitude"], w["longitude"]) <= 12
    ]

    # Reserve 40 events for deliberate clustering in nearby wells at Barail depths (2,700-2,900 m)
    clustered_events = []
    cluster_wells = random.sample(nearby_wells, min(8, len(nearby_wells)))
    for cw in cluster_wells:
        for _ in range(random.randint(3, 7)):
            depth = round(random.uniform(2700, 2900), 1)
            event_type = pick_event_type("Barail")
            severity = random.choices(["HIGH", "MEDIUM"], weights=[0.6, 0.4])[0]
            clustered_events.append({
                "id": gen_uuid(),
                "well_id": cw["id"],
                "event_type": event_type,
                "depth_start_m": depth,
                "depth_end_m": round(depth + random.uniform(10, 50), 1),
                "formation": "Barail",
                "severity": severity,
                "duration_hrs": round(random.uniform(2, 24), 1),
                "description": f"{event_type.replace('_', ' ').title()} encountered in Barail formation",
                "mitigation": pick_mitigation(event_type, severity),
                "review_status": "APPROVED",
                "is_synthetic": True,
                "created_at": now_utc(),
            })
        if len(clustered_events) >= 60:
            break

    # Generate remaining events randomly across all wells
    remaining = n_total - len(clustered_events)
    random_events = []
    for _ in range(remaining):
        well = random.choice(wells)
        depth = round(random.uniform(500, well["total_depth_m"] - 50), 1)
        formation = get_formation_at_depth(depth)
        event_type = pick_event_type(formation)
        severity = pick_severity()
        random_events.append({
            "id": gen_uuid(),
            "well_id": well["id"],
            "event_type": event_type,
            "depth_start_m": depth,
            "depth_end_m": round(depth + random.uniform(5, 80), 1) if random.random() > 0.3 else None,
            "formation": formation,
            "severity": severity,
            "duration_hrs": round(random.uniform(0.5, 72), 1) if random.random() > 0.2 else None,
            "description": f"{event_type.replace('_', ' ').title()} encountered at {depth} m in {formation} formation",
            "mitigation": pick_mitigation(event_type, severity),
            "review_status": random.choices(
                ["APPROVED", "REVIEWED", "EXTRACTED"],
                weights=[0.70, 0.15, 0.15]
            )[0],
            "is_synthetic": True,
            "created_at": now_utc(),
        })

    events = clustered_events + random_events
    random.shuffle(events)
    return events

def generate_synthetic_report_text(well_name, events_subset, report_num):
    """
    Generate realistic drilling report text for PDF creation.
    Embeds actual event data for OCR/extraction testing.
    """
    report_date = random_date(2018, 2024)
    spud_depth = round(random.uniform(500, 1000), 0)

    event_paragraphs = ""
    for ev in events_subset[:4]:  # Include up to 4 events per report
        mit_text = f"Mitigation: {ev['mitigation']}" if ev['mitigation'] else "Mitigation: No specific action recorded."
        event_paragraphs += f"""
Section 4.{events_subset.index(ev) + 1} — Drilling Problem Report

Event Type: {ev['event_type'].replace('_', ' ').title()}
Depth: {ev['depth_start_m']} m MD
Formation: {ev.get('formation', 'Unknown')}
Severity: {ev['severity']}
Duration: {ev.get('duration_hrs', 'N/A')} hours
Description: {ev['description']}
{mit_text}

"""

    return f"""
[SYNTHETIC – DEMO DATA] — This document is a synthetic drilling report created for SIH 2026 Hackathon demonstration purposes only.

================================================================================
OIL INDIA LIMITED — DRILLING COMPLETION REPORT
Well: {well_name}
Report No: DCR-2024-{report_num:04d}
Basin: Brahmaputra
Date: {report_date}
================================================================================

SECTION 1 — WELL SUMMARY
This report summarises the drilling operations for {well_name} in the Brahmaputra Basin.
Drilling commenced from surface at {spud_depth} m and progressed through multiple geological
formations including Tipam, Bokabil, Bhuban, Barail and Kopili.

SECTION 2 — FORMATION TOPS
The following formation tops were encountered during drilling:
  - Tipam Formation Top: {round(spud_depth + 200, 0)} m
  - Bokabil Formation Top: {round(spud_depth + 900, 0)} m
  - Bhuban Formation Top: {round(spud_depth + 1700, 0)} m
  - Barail Formation Top: {round(spud_depth + 2400, 0)} m
  - Kopili Formation Top: {round(spud_depth + 3200, 0)} m

SECTION 3 — DRILLING PERFORMANCE
Overall drilling performance was within expected parameters for this area.
Average ROP in Tipam: 8.2 m/hr. Average ROP in Barail: 3.1 m/hr.
Total NPT: {round(random.uniform(24, 120), 1)} hours ({round(random.uniform(5, 20), 1)}% of total drilling time).

SECTION 4 — DRILLING PROBLEMS AND EVENTS
The following drilling problems were encountered and documented:
{event_paragraphs}

SECTION 5 — MUD PROGRAMME
  - Surface interval: Water-based mud, 1.05 SG
  - Intermediate: Water-based mud, 1.12–1.18 SG
  - Barail interval: Oil-based mud, 1.20–1.24 SG

SECTION 6 — LESSONS LEARNED
Based on drilling experience in this well, the following recommendations are made
for future operations in this area:
  1. Increase mud weight to minimum 1.20 SG before entering Barail formation.
  2. Monitor flow check closely at formation transitions.
  3. Pre-plan LCM treatment before entering naturally fractured intervals.

================================================================================
END OF REPORT — [SYNTHETIC – DEMO DATA]
This report was generated synthetically for SIH 26121 demonstration purposes.
All well names, depths and events are fictional and do not represent actual
Oil India Limited operations.
================================================================================
"""

# ---------------------------------------------------------------------------
# SQL Generation
# ---------------------------------------------------------------------------

def generate_sql(wells, formations, trajectories, events):
    sql_lines = [
        "-- =============================================================",
        "-- NWIS Synthetic Data Seed Script",
        "-- SIH 26121 | Oil India Limited | Generated by Data Script v2",
        "-- ALL DATA IS SYNTHETIC (is_synthetic=TRUE)",
        "-- =============================================================",
        "",
        "BEGIN;",
        "",
        "-- Wells",
        "INSERT INTO well (id, name, api_number, latitude, longitude, status, total_depth_m, spud_date, basin, field, is_synthetic, created_at, updated_at) VALUES",
    ]

    well_rows = []
    for w in wells:
        well_rows.append(
            f"  ('{w['id']}', '{w['name']}', '{w['api_number']}', "
            f"{w['latitude']}, {w['longitude']}, '{w['status']}', "
            f"{w['total_depth_m']}, '{w['spud_date']}', '{w['basin']}', '{w['field']}', "
            f"TRUE, NOW(), NOW())"
        )
    sql_lines.append(",\n".join(well_rows) + ";")
    sql_lines.append("")

    # Formations
    sql_lines.append("-- Formations")
    sql_lines.append("INSERT INTO formation (id, well_id, name, top_depth_m, base_depth_m, lithology) VALUES")
    form_rows = []
    for f in formations:
        lithology = f['lithology'].replace("'", "''")
        form_rows.append(
            f"  ('{f['id']}', '{f['well_id']}', '{f['name']}', "
            f"{f['top_depth_m']}, {f['base_depth_m']}, '{lithology}')"
        )
    sql_lines.append(",\n".join(form_rows) + ";")
    sql_lines.append("")

    # Trajectory Points
    sql_lines.append("-- Trajectory Points")
    sql_lines.append("INSERT INTO trajectorypoint (id, well_id, md_m, tvd_m, inclination_deg, azimuth_deg) VALUES")
    traj_rows = []
    for t in trajectories:
        traj_rows.append(
            f"  ('{t['id']}', '{t['well_id']}', {t['md_m']}, {t['tvd_m']}, "
            f"{t['inclination_deg']}, {t['azimuth_deg']})"
        )
    sql_lines.append(",\n".join(traj_rows) + ";")
    sql_lines.append("")

    # Events
    sql_lines.append("-- Drilling Events")
    sql_lines.append(
        "INSERT INTO drillingevent (id, well_id, event_type, depth_start_m, depth_end_m, "
        "formation, severity, duration_hrs, description, mitigation, review_status, is_synthetic, created_at) VALUES"
    )
    ev_rows = []
    for ev in events:
        depth_end = f"{ev['depth_end_m']}" if ev.get("depth_end_m") else "NULL"
        formation = f"'{ev['formation']}'" if ev.get("formation") else "NULL"
        duration = f"{ev['duration_hrs']}" if ev.get("duration_hrs") else "NULL"
        desc = ev["description"].replace("'", "''")
        mitigation = f"'{ev['mitigation'].replace(chr(39), chr(39)*2)}'" if ev.get("mitigation") else "NULL"
        ev_rows.append(
            f"  ('{ev['id']}', '{ev['well_id']}', '{ev['event_type']}', "
            f"{ev['depth_start_m']}, {depth_end}, {formation}, "
            f"'{ev['severity']}', {duration}, '{desc}', {mitigation}, "
            f"'{ev['review_status']}', TRUE, NOW())"
        )
    sql_lines.append(",\n".join(ev_rows) + ";")
    sql_lines.append("")
    sql_lines.append("-- Update PostGIS geometry column from lat/lon")
    sql_lines.append("UPDATE well SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography;")
    sql_lines.append("")
    sql_lines.append("COMMIT;")
    sql_lines.append("")
    sql_lines.append("-- Verify:")
    sql_lines.append("SELECT COUNT(*) as wells FROM well;")
    sql_lines.append("SELECT COUNT(*) as formations FROM formation;")
    sql_lines.append("SELECT COUNT(*) as trajectory_points FROM trajectorypoint;")
    sql_lines.append("SELECT COUNT(*) as events FROM drillingevent;")
    sql_lines.append("SELECT COUNT(*) as approved_events FROM drillingevent WHERE review_status='APPROVED';")

    return "\n".join(sql_lines)

# ---------------------------------------------------------------------------
# PDF Generation (requires reportlab)
# ---------------------------------------------------------------------------

def generate_pdfs(wells, events):
    """Generate 5 synthetic PDF drilling reports."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.units import cm

        styles = getSampleStyleSheet()
        report_wells = random.sample(wells, 5)

        for i, well in enumerate(report_wells):
            well_events = [ev for ev in events if ev["well_id"] == well["id"]]
            approved = [ev for ev in well_events if ev["review_status"] == "APPROVED"]
            report_text = generate_synthetic_report_text(well["name"], approved[:4], i + 1)

            pdf_path = OUTPUT_DIR / f"DCR_{well['name']}_SYNTHETIC.pdf"
            doc = SimpleDocTemplate(str(pdf_path), pagesize=A4,
                                    leftMargin=2*cm, rightMargin=2*cm,
                                    topMargin=2*cm, bottomMargin=2*cm)

            story = []
            for para in report_text.split("\n"):
                if para.strip():
                    story.append(Paragraph(para.strip(), styles["Normal"]))
                    story.append(Spacer(1, 0.2*cm))

            doc.build(story)
            print(f"  Created PDF: {pdf_path}")

        print(f"\n5 synthetic PDF reports saved to {OUTPUT_DIR}/")

    except ImportError:
        print("reportlab not installed. Saving reports as .txt files instead.")
        print("Install with: pip install reportlab")

        report_wells = random.sample(wells, 5)
        for i, well in enumerate(report_wells):
            well_events = [ev for ev in events if ev["well_id"] == well["id"]]
            approved = [ev for ev in well_events if ev["review_status"] == "APPROVED"]
            report_text = generate_synthetic_report_text(well["name"], approved[:4], i + 1)
            txt_path = OUTPUT_DIR / f"DCR_{well['name']}_SYNTHETIC.txt"
            txt_path.write_text(report_text)
            print(f"  Created text report: {txt_path}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("NWIS Synthetic Data Generator — SIH 26121")
    print("=" * 60)

    print("\n[1/5] Generating 50 wells...")
    wells = generate_wells(50)
    print(f"  Generated {len(wells)} wells")

    print("\n[2/5] Generating formation intervals...")
    formations = generate_formations(wells)
    print(f"  Generated {len(formations)} formation intervals")

    print("\n[3/5] Generating trajectory points...")
    trajectories = generate_trajectory_points(wells)
    print(f"  Generated {len(trajectories)} trajectory points")

    print("\n[4/5] Generating 200 drilling events...")
    events = generate_events(wells, n_total=200)
    print(f"  Generated {len(events)} events")
    print(f"  Approved events: {sum(1 for e in events if e['review_status'] == 'APPROVED')}")
    print(f"  Clustered (Barail, near W-042): {sum(1 for e in events if e['formation'] == 'Barail' and e['review_status'] == 'APPROVED')}")

    print("\n[5/5] Generating 5 synthetic PDF drilling reports...")
    generate_pdfs(wells, events)

    # Save SQL seed file
    sql = generate_sql(wells, formations, trajectories, events)
    sql_path = Path("./synthetic_seed.sql")
    sql_path.write_text(sql)
    print(f"\nSQL seed file saved to: {sql_path}")

    # Save JSON for inspection
    json_path = Path("./synthetic_data_preview.json")
    json_path.write_text(json.dumps({
        "wells_count": len(wells),
        "formations_count": len(formations),
        "trajectories_count": len(trajectories),
        "events_count": len(events),
        "sample_wells": wells[:3],
        "sample_events": events[:5],
        "w042": next(w for w in wells if w["well_number"] == 42),
    }, indent=2, default=str))
    print(f"JSON preview saved to: {json_path}")

    print("\n" + "=" * 60)
    print("DONE. To load into PostgreSQL:")
    print("  psql $DATABASE_URL -f synthetic_seed.sql")
    print("=" * 60)
    print("\nWARNING: All data is SYNTHETIC. is_synthetic=TRUE in all records.")
    print("Never use this data to make actual drilling decisions.")

if __name__ == "__main__":
    main()
