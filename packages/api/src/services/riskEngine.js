export async function assessRisk({ wellId, currentDepthM, formation = 'Barail', radiusKm = 10 }, db) {
  // 1. Get reference well coordinates
  const { rows: [well] } = await db.query(
    'SELECT id, name, latitude, longitude FROM well WHERE id = $1',
    [wellId]
  );

  if (!well) {
    throw new Error(`Well with id ${wellId} not found`);
  }

  // 2. Query historical approved events in nearby offset wells within depth window
  const { rows: events } = await db.query(`
    SELECT de.*, w.name as well_name, ABS(de.depth_start_m - $1) as depth_delta
    FROM drillingevent de
    JOIN well w ON de.well_id = w.id
    WHERE de.review_status = 'APPROVED'
      AND de.well_id != $2
      AND ST_DWithin(
        w.location,
        ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
        $5 * 1000
      )
      AND de.depth_start_m BETWEEN $6 AND $7
    ORDER BY depth_delta ASC
  `, [
    currentDepthM,
    wellId,
    well.longitude,
    well.latitude,
    radiusKm,
    currentDepthM - 100,
    currentDepthM + 100
  ]);

  if (events.length === 0) {
    return {
      score: 0,
      level: 'LOW',
      confidence: 'LOW',
      factors: [
        { name: 'depth_proximity',  score: 0, max: 35 },
        { name: 'formation_match',  score: 0, max: 25 },
        { name: 'event_recurrence', score: 0, max: 20 },
        { name: 'context_score',    score: 0, max: 20 },
      ],
      evidence: [],
      evidenceWellCount: 0,
    };
  }

  // Factor 1: Depth proximity (0-35 pts)
  const minDelta = Math.min(...events.map(e => Number(e.depth_delta)));
  const depthScore = Math.round(35 * (1 - Math.min(minDelta, 200) / 200));

  // Factor 2: Formation match (0 or 25 pts)
  const formationScore = events.some(e => e.formation === formation) ? 25 : 0;

  // Factor 3: Event recurrence (0-20 pts)
  const recurrenceScore = Math.min(20, 5 * events.length);

  // Factor 4: Context score - multiple distinct event types (0-20 pts)
  const uniqueEventTypes = new Set(events.map(e => e.event_type));
  const contextScore = uniqueEventTypes.size >= 2 ? 10 : 0;

  const score = Math.min(100, depthScore + formationScore + recurrenceScore + contextScore);
  const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';

  const uniqueWells = new Set(events.map(e => e.well_id)).size;
  const confidence = uniqueWells >= 4 ? 'HIGH' : uniqueWells >= 2 ? 'MEDIUM' : 'LOW';

  return {
    score,
    level,
    confidence,
    factors: [
      { name: 'depth_proximity',  score: depthScore,      max: 35 },
      { name: 'formation_match',  score: formationScore,  max: 25 },
      { name: 'event_recurrence', score: recurrenceScore, max: 20 },
      { name: 'context_score',    score: contextScore,    max: 20 },
    ],
    evidence: events.slice(0, 5).map(e => ({
      id: e.id,
      well_id: e.well_id,
      well_name: e.well_name,
      event_type: e.event_type,
      depth_m: Number(e.depth_start_m),
      formation: e.formation,
      severity: e.severity,
      description: e.description,
      mitigation: e.mitigation
    })),
    evidenceWellCount: uniqueWells,
  };
}
