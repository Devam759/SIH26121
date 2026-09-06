import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { assessRisk } from '../services/riskEngine.js';

const router = Router();

const assessSchema = z.object({
  wellId: z.string().uuid(),
  currentDepthM: z.number().min(0),
  formation: z.string().optional().default('Barail'),
  radiusKm: z.number().min(1).max(100).optional().default(10),
});

// POST /api/v1/risk/assess - compute deterministic risk score & factors
router.post('/assess', validate(assessSchema), async (req, res, next) => {
  try {
    const { wellId, currentDepthM, formation, radiusKm } = req.body;
    const assessment = await assessRisk({ wellId, currentDepthM, formation, radiusKm }, pool);

    // Save risk assessment to database
    const { rows: [record] } = await pool.query(`
      INSERT INTO riskassessment (
        well_id, current_depth_m, formation, radius_km, score, level, confidence,
        factors, evidence_event_ids, evidence_well_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      wellId,
      currentDepthM,
      formation,
      radiusKm,
      assessment.score,
      assessment.level,
      assessment.confidence,
      JSON.stringify(assessment.factors),
      assessment.evidence.map(e => e.id),
      assessment.evidenceWellCount
    ]);

    // If score >= 40, automatically create active alert
    if (assessment.score >= 40) {
      await pool.query(`
        INSERT INTO alert (risk_assessment_id, well_id, message, status)
        VALUES ($1, $2, $3, 'active')
      `, [
        record.id,
        wellId,
        `Proximity Risk Alert (${assessment.level}): Score ${assessment.score}/100 at depth ${currentDepthM}m (${formation} formation)`
      ]);
    }

    res.json({
      data: {
        ...assessment,
        id: record.id,
        created_at: record.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/risk/history/:wellId
router.get('/history/:wellId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM riskassessment
      WHERE well_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.params.wellId]);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
