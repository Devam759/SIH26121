import dotenv from 'dotenv';
import { createApp } from './app.js';
import pool from './db/pool.js';
import { ensureBucket } from './services/minioService.js';

dotenv.config();

const PORT = process.env.PORT || 8000;
const app = createApp();

async function start() {
  try {
    // Check DB connection
    await pool.query('SELECT 1');
    console.log('[NWIS API] Connected to PostgreSQL');

    // Ensure MinIO bucket
    try {
      await ensureBucket();
      console.log('[NWIS API] MinIO storage bucket verified');
    } catch (err) {
      console.warn('[NWIS API] Warning: MinIO connection not ready:', err.message);
    }

    app.listen(PORT, () => {
      console.log(`[NWIS API] Server running on http://localhost:${PORT}`);
      console.log(`[NWIS API] Health check: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (err) {
    console.error('[NWIS API] Failed to start server:', err);
    process.exit(1);
  }
}

start();
