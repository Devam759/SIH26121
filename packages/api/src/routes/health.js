import { Router } from 'express';
import pool from '../db/pool.js';
import { testGeminiPing } from '../ai/gemini.js';

const router = Router();

router.get('/', async (req, res) => {
  const dbOk = await pool.query('SELECT 1').then(() => 'ok').catch(() => 'error');
  const aiOk = await testGeminiPing().then(ok => ok ? 'ok' : 'degraded').catch(() => 'error');

  const status = dbOk === 'ok' && (aiOk === 'ok' || process.env.AI_ENABLED === 'false')
    ? 'ok'
    : 'degraded';

  res.json({
    data: {
      status,
      database: dbOk,
      ai_service: aiOk,
      timestamp: new Date().toISOString(),
      version: '2.1.0'
    }
  });
});

export default router;
