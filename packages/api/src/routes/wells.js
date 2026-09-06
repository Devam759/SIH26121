import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/wells - list wells with optional geospatial radius filter
router.get('/', async (req, res, next) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lon = req.query.lon ? parseFloat(req.query.lon) : null;
    const radiusKm = req.query.radius_km ? parseFloat(req.query.radius_km) : null;
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    let query;
    let params;

    if (lat !== null && lon !== null && radiusKm !== null) {
      query = `
        SELECT id, name, api_number, latitude, longitude, status,
               total_depth_m, spud_date, basin, field, is_synthetic,
               ROUND((ST_Distance(
                 location,
                 ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
               ) / 1000)::numeric, 2) AS distance_km
        FROM well
        WHERE ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3 * 1000
        )
        ${status ? 'AND status = $6' : ''}
        ORDER BY distance_km ASC
        LIMIT $4 OFFSET $5
      `;
      params = status
        ? [lat, lon, radiusKm, limit, offset, status]
        : [lat, lon, radiusKm, limit, offset];
    } else {
      query = `
        SELECT id, name, api_number, latitude, longitude, status,
               total_depth_m, spud_date, basin, field, is_synthetic, 0.0 AS distance_km
        FROM well
        ${status ? 'WHERE status = $3' : ''}
        ORDER BY name ASC
        LIMIT $1 OFFSET $2
      `;
      params = status ? [limit, offset, status] : [limit, offset];
    }

    const { rows } = await pool.query(query, params);
    const countQuery = lat !== null && lon !== null && radiusKm !== null
      ? `SELECT COUNT(*) FROM well WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3 * 1000)`
      : `SELECT COUNT(*) FROM well`;
    const countParams = lat !== null && lon !== null && radiusKm !== null ? [lat, lon, radiusKm] : [];
    const countRes = await pool.query(countQuery, countParams);
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/wells/:id - well details
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM well WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Well not found' } });
    }
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/wells/:id/formations - well formation tops
router.get('/:id/formations', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM formation WHERE well_id = $1 ORDER BY top_depth_m ASC',
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/wells/:id/trajectory - trajectory points
router.get('/:id/trajectory', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM trajectorypoint WHERE well_id = $1 ORDER BY md_m ASC',
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/wells/:id/events - events for this well
router.get('/:id/events', async (req, res, next) => {
  try {
    const status = req.query.status;
    let query = 'SELECT * FROM drillingevent WHERE well_id = $1';
    const params = [req.params.id];

    if (status) {
      query += ' AND review_status = $2';
      params.push(status);
    }
    query += ' ORDER BY depth_start_m ASC';

    const { rows } = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
