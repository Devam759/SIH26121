import pg from 'pg';
import pgvector from 'pgvector/pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', async (client) => {
  try {
    await pgvector.registerType(client);
  } catch (err) {
    // Ignore if type not registered yet
  }
});

export default pool;
