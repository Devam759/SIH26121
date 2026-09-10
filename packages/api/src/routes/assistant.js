import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { validate } from '../middleware/validate.js';
import { queryAssistant } from '../services/ragService.js';

const router = Router();

const assistantQuerySchema = z.object({
  question: z.string().min(3),
  wellId: z.string().optional().default(''),
  currentDepthM: z.number().optional().default(2800),
  formation: z.string().optional().default('Barail'),
  radiusKm: z.number().optional().default(10),
});

router.post('/query', validate(assistantQuerySchema), async (req, res, next) => {
  try {
    const result = await queryAssistant(req.body, pool);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
