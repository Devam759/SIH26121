import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// GET /api/v1/events - list events with flexible filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      well_id,
      event_type,
      review_status,
      severity,
      formation,
      depth_min,
      depth_max,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let pIdx = 1;

    if (well_id) {
      conditions.push(`de.well_id = $${pIdx++}`);
      params.push(well_id);
    }
    if (event_type) {
      conditions.push(`de.event_type = $${pIdx++}`);
      params.push(event_type);
    }
    if (review_status) {
      conditions.push(`de.review_status = $${pIdx++}`);
      params.push(review_status);
    }
    if (severity) {
      conditions.push(`de.severity = $${pIdx++}`);
      params.push(severity);
    }
    if (formation) {
      conditions.push(`de.formation = $${pIdx++}`);
      params.push(formation);
    }
    if (depth_min) {
      conditions.push(`de.depth_start_m >= $${pIdx++}`);
      params.push(parseFloat(depth_min));
    }
    if (depth_max) {
      conditions.push(`de.depth_start_m <= $${pIdx++}`);
      params.push(parseFloat(depth_max));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT de.*, w.name as well_name, w.latitude, w.longitude
      FROM drillingevent de
      JOIN well w ON de.well_id = w.id
      ${whereClause}
      ORDER BY de.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
    params.push(limitNum, offset);

    const { rows } = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(*)
      FROM drillingevent de
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params.slice(0, conditions.length));
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/events/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT de.*, w.name as well_name
      FROM drillingevent de
      JOIN well w ON de.well_id = w.id
      WHERE de.id = $1
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

const patchEventSchema = z.object({
  review_status: z.enum(['EXTRACTED', 'REVIEWED', 'APPROVED']).optional(),
  event_type: z.enum(['MUD_LOSS', 'KICK', 'STUCK_PIPE', 'TORQUE_SPIKE', 'CEMENTING_ISSUE', 'NPT', 'BHA_FAILURE', 'WASHOUT', 'OTHER']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']).optional(),
  description: z.string().optional(),
  mitigation: z.string().optional(),
  formation: z.string().optional(),
  depth_start_m: z.number().optional(),
  depth_end_m: z.number().nullable().optional(),
});

// PATCH /api/v1/events/:id (Requires auth)
router.patch('/:id', authenticate, validate(patchEventSchema), async (req, res, next) => {
  try {
    const updates = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }

    if (req.body.review_status) {
      fields.push(`reviewed_by = $${idx++}`);
      values.push(req.user.sub);
      fields.push(`reviewed_at = NOW()`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: { code: 'EMPTY_PAYLOAD', message: 'No fields provided to update' } });
    }

    values.push(req.params.id);
    const query = `
      UPDATE drillingevent
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }

    // Write audit log
    await pool.query(`
      INSERT INTO auditlog (actor_id, actor_role, action, entity_type, entity_id, metadata_json)
      VALUES ($1, $2, 'UPDATE_EVENT', 'drillingevent', $3, $4)
    `, [req.user.sub, req.user.role, req.params.id, JSON.stringify(updates)]);

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
