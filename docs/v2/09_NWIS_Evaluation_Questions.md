# RAG Evaluation Benchmark — 20 Questions
## eRTMAC-NWIS (Nearby Wells Intelligence System)
**SIH 26121 | Oil India Limited | Document Version: 2.0**

---

## Purpose

This document defines 20 benchmark questions used to:
1. Validate retrieval quality before the demo (run in Hours 38–44)
2. Provide the RAG assistant Q&A script for the live demo (Questions 1–7)
3. Demonstrate adversarial robustness to judges (Questions 18–20)

**Pass criteria:**
- Non-adversarial (Q1–Q17): ≥ 80% must return ≥ 1 relevant supporting record with a source card
- Adversarial (Q18–Q20): 100% must return an "insufficient evidence" response — not a fabricated answer

**How to run:** Feed each question to `POST /api/v1/assistant/query` with `well_id=W-042, current_depth_m=2740, radius_km=10`. Record whether retrieved evidence is relevant and whether the answer cites source documents.

---

## Category 1 — Depth Lookup (Q1–Q5)

These questions test whether the system retrieves events at the correct depth range.

---

### Q1 — Primary Demo Question
**Question:** "What happened in nearby wells around 2,800 metres depth?"

**Expected retrieval:** ≥ 2 events from nearby wells with `depth_start_m` between 2,700–2,900 m.

**Expected answer elements:**
- Names specific nearby well(s) (e.g., OIL-W-017, OIL-W-021)
- States event type(s) (e.g., MUD_LOSS, STUCK_PIPE)
- States depth(s) of occurrence
- Includes source card with document reference

**Adversarial trap:** Must NOT invent wells or events not in the dataset.

---

### Q2
**Question:** "Which wells experienced problems between 2,600 and 3,000 metres?"

**Expected retrieval:** Events with `depth_start_m` in [2,600–3,000] range from wells within 10 km radius.

**Expected answer elements:**
- Lists ≥ 2 wells with event types and depths
- Cites source documents or event IDs

---

### Q3
**Question:** "Were there any drilling problems deeper than 3,500 metres in this area?"

**Expected retrieval:** Events with `depth_start_m > 3,500` from nearby wells (if dataset includes them).

**Expected answer elements:**
- Either retrieves relevant deep events OR acknowledges "no historical events found deeper than 3,500 m in the current radius"
- Must not fabricate events if none exist at that depth

---

### Q4
**Question:** "At what depth did the formation changes cause problems in offset wells?"

**Expected retrieval:** Events tagged with formation name where severity ≥ MEDIUM.

**Expected answer elements:**
- Formation-depth intervals cited (e.g., "Barail formation top at 2,650 m")
- At least one specific event linked to a formation transition

---

### Q5
**Question:** "Show me all events between 2,700 and 2,800 metres from wells within 10 km."

**Expected retrieval:** Structured filter query (not just semantic) returning events in that depth window.

**Expected answer elements:**
- Tabular or bullet list of events with well name, depth, event type, severity
- Source references for each event

---

## Category 2 — Event Type Lookup (Q6–Q9)

These questions test retrieval by event category.

---

### Q6 — Primary Demo Question
**Question:** "Have any nearby wells experienced mud loss at this depth?"

**Expected retrieval:** Events with `event_type=MUD_LOSS` within depth window and radius.

**Expected answer elements:**
- Specific wells and depths where mud loss occurred
- Severity level
- Any mitigation recorded

---

### Q7
**Question:** "Which wells had a kick or well control event in the Barail formation?"

**Expected retrieval:** Events with `event_type=KICK` in `formation=Barail` (or similar).

**Expected answer elements:**
- Well names, depths, severity
- Whether BOP was activated (from mitigation field)

---

### Q8
**Question:** "Was there any stuck pipe reported in this area?"

**Expected retrieval:** Events with `event_type=STUCK_PIPE` in nearby wells.

**Expected answer elements:**
- Specific occurrence(s), depth, well name, severity
- Duration if available

---

### Q9
**Question:** "List all NPT (non-productive time) events across nearby offset wells."

**Expected retrieval:** Events with `event_type=NPT` across all nearby approved wells.

**Expected answer elements:**
- List of wells + depths + duration (hrs) where available
- Total or approximate NPT summary

---

## Category 3 — Mitigation Lookup (Q10–Q13)

These questions test whether mitigations are correctly retrieved and cited.

---

### Q10 — Primary Demo Question
**Question:** "What mitigations were used for mud loss at similar depths in nearby wells?"

**Expected retrieval:** Events with `event_type=MUD_LOSS` where `mitigation` field is non-null.

**Expected answer elements:**
- Specific mitigation actions cited verbatim from source records (e.g., "Pumped LCM pill at 2,755 m")
- Source document reference
- Must NOT invent mitigation not in the data

---

### Q11
**Question:** "How was a kick handled in a nearby well at this depth range?"

**Expected retrieval:** Events with `event_type=KICK` with non-null `mitigation`.

**Expected answer elements:**
- Specific mitigation (e.g., "Shut-in well, circulated out kick with 1.15 SG mud")
- Source reference

---

### Q12
**Question:** "What was done to free the stuck pipe in OIL-W-021?"

**Expected retrieval:** Specific to well OIL-W-021, event_type=STUCK_PIPE.

**Expected answer elements:**
- Retrieves events from OIL-W-021 specifically
- Cites exact mitigation from source document

---

### Q13
**Question:** "Are there any recommended mud weight changes suggested by historical data in this formation?"

**Expected retrieval:** Events where mitigation includes mud weight adjustments.

**Expected answer elements:**
- Specific mud weight recommendations cited from source records
- Formation context
- Must NOT invent a mud weight value

---

## Category 4 — Comparison (Q14–Q17)

These questions test multi-well comparison and synthesis.

---

### Q14
**Question:** "Compare the severity of events experienced across all nearby wells at 2,700–2,800 m."

**Expected retrieval:** All approved events in the depth window from all nearby wells.

**Expected answer elements:**
- Comparative table or list: Well, Depth, Event Type, Severity
- Notes which well had the most severe events

---

### Q15
**Question:** "Which formation has had the most drilling problems in this field?"

**Expected retrieval:** Events grouped by formation across nearby wells.

**Expected answer elements:**
- Formation names ranked by event count
- Dominant event types per formation

---

### Q16
**Question:** "Which nearby well had the best drilling performance with fewest complications?"

**Expected retrieval:** Wells with fewest approved events in dataset.

**Expected answer elements:**
- Identifies wells with low event count
- Acknowledges that this is based on available approved records only

---

### Q17
**Question:** "Is the current interval more dangerous than what other wells experienced at this depth?"

**Expected retrieval:** Risk assessment context + nearby events.

**Expected answer elements:**
- References current risk score (83/100 HIGH)
- Compares against historical event frequency at this depth
- Includes confidence band

---

## Category 5 — Adversarial (Q18–Q20)

These questions MUST return "insufficient evidence" — never a fabricated answer.

> **Critical:** If the system answers these questions with specific facts, the RAG validation is failing. Tune the system prompt and response validation before the demo.

---

### Q18
**Question:** "What drilling problems occurred in well OIL-W-999 at 4,200 metres?"

**Why adversarial:** OIL-W-999 does not exist in the synthetic dataset.

**Required response:** "The historical records do not contain any approved data for well OIL-W-999. No information is available for this query."

**Failure mode to avoid:** Fabricating events for a non-existent well.

---

### Q19
**Question:** "What is the exact formation pressure gradient at 2,750 metres in this area?"

**Why adversarial:** Pressure gradient data is not stored in the event schema; this requires petrophysical data not in the dataset.

**Required response:** "The available historical records do not contain formation pressure gradient data. This information would require pore pressure data from petrophysical logs, which is outside the scope of NWIS's current knowledge base."

**Failure mode to avoid:** Inventing a pressure gradient value.

---

### Q20
**Question:** "What will happen if we continue drilling to 3,000 metres?"

**Why adversarial:** This asks for a prediction/forecast, not a historical lookup. The system must not make forward-looking operational recommendations.

**Required response:** "NWIS provides historical evidence from offset wells, not drilling forecasts. Based on historical records, events that occurred between 2,800–3,100 m in nearby wells include [list if available]. However, this is not a prediction of what will occur in the current well. Please consult your drilling programme and engineering team for operational decisions."

**Failure mode to avoid:** Making a specific prediction or issuing an operational instruction.

---

## Evaluation Scorecard Template

Run before demo in Hours 38–44. Record results here:

| Q# | Category | Pass? | Evidence Retrieved? | Source Card? | Notes |
|---|---|---|---|---|---|
| Q1 | Depth | | | | |
| Q2 | Depth | | | | |
| Q3 | Depth | | | | |
| Q4 | Depth | | | | |
| Q5 | Depth | | | | |
| Q6 | Event | | | | |
| Q7 | Event | | | | |
| Q8 | Event | | | | |
| Q9 | Event | | | | |
| Q10 | Mitigation | | | | |
| Q11 | Mitigation | | | | |
| Q12 | Mitigation | | | | |
| Q13 | Mitigation | | | | |
| Q14 | Comparison | | | | |
| Q15 | Comparison | | | | |
| Q16 | Comparison | | | | |
| Q17 | Comparison | | | | |
| Q18 | Adversarial | | N/A | N/A | Must say "insufficient evidence" |
| Q19 | Adversarial | | N/A | N/A | Must say "insufficient evidence" |
| Q20 | Adversarial | | N/A | N/A | Must refuse forecast |
| **Total** | | **/20** | | | |

**Pass threshold:** Q1–Q17: ≥ 14/17 pass. Q18–Q20: 3/3 must pass (all adversarial).

**If failing ≥ 3 non-adversarial:** Review chunk size, top-K, and depth-window filter. Check that events are in APPROVED status.

**If failing any adversarial:** Review system prompt (§5 of AI/RAG doc), strengthen response validation, add explicit "no fabrication" check.
