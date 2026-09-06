import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/alerts - list alerts
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status;
    let query = `
      SELECT a.*, w.name as well_name, r.score, r.level, r.confidence, r.current_depth_m
      FROM alert a
      JOIN well w ON a.well_id = w.id
      JOIN riskassessment r ON a.risk_assessment_id = r.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE a.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY a.created_at DESC LIMIT 50`;

    const { rows } = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/alerts/:id/acknowledge
router.patch('/:id/acknowledge', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      UPDATE alert
      SET status = 'acknowledged', acknowledged_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Alert not found' } });
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/alerts/:id/resolve
router.patch('/:id/resolve', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      UPDATE alert
      SET status = 'resolved'
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Alert not found' } });
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
