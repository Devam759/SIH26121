import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET /api/v1/search - structured & full-text query across events & chunks
router.get('/', async (req, res, next) => {
  try {
    const { q, formation, event_type, well_id, depth_min, depth_max, radius_km, lat, lon } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (q) {
      conditions.push(`(
        de.description ILIKE $${idx} OR
        de.mitigation ILIKE $${idx} OR
        w.name ILIKE $${idx}
      )`);
      params.push(`%${q}%`);
      idx++;
    }

    if (formation) {
      conditions.push(`de.formation = $${idx++}`);
      params.push(formation);
    }

    if (event_type) {
      conditions.push(`de.event_type = $${idx++}`);
      params.push(event_type);
    }

    if (well_id) {
      conditions.push(`de.well_id = $${idx++}`);
      params.push(well_id);
    }

    if (depth_min) {
      conditions.push(`de.depth_start_m >= $${idx++}`);
      params.push(parseFloat(depth_min));
    }

    if (depth_max) {
      conditions.push(`de.depth_start_m <= $${idx++}`);
      params.push(parseFloat(depth_max));
    }

    if (lat && lon && radius_km) {
      conditions.push(`ST_DWithin(
        w.location,
        ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)::geography,
        $${idx++} * 1000
      )`);
      params.push(parseFloat(lon), parseFloat(lat), parseFloat(radius_km));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT de.*, w.name as well_name, w.latitude, w.longitude
      FROM drillingevent de
      JOIN well w ON de.well_id = w.id
      ${whereClause}
      ORDER BY de.created_at DESC
      LIMIT 50
    `;

    const { rows } = await pool.query(query, params);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

export default router;
