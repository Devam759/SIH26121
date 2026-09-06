import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { uploadBuffer } from '../services/minioService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});

// POST /api/v1/documents/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'PDF file is required' } });
    }

    const { originalname, buffer, mimetype } = req.file;
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const objectKey = `documents/${Date.now()}_${originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload to MinIO
    const bucket = process.env.MINIO_BUCKET || 'nwis-documents';
    await uploadBuffer(bucket, objectKey, buffer, { 'Content-Type': mimetype });

    // Insert into database
    const { rows } = await pool.query(`
      INSERT INTO document (
        filename, minio_key, checksum_sha256, status, uploaded_by
      ) VALUES ($1, $2, $3, 'uploaded', $4)
      RETURNING *
    `, [originalname, objectKey, sha256, req.user.sub]);

    // Audit log
    await pool.query(`
      INSERT INTO auditlog (actor_id, actor_role, action, entity_type, entity_id, metadata_json)
      VALUES ($1, $2, 'UPLOAD_DOCUMENT', 'document', $3, $4)
    `, [req.user.sub, req.user.role, rows[0].id, JSON.stringify({ filename: originalname, size: buffer.length })]);

    res.status(201).json({
      data: rows[0],
      message: 'Document uploaded successfully and queued for processing.'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/documents
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.*, u.email as uploaded_by_email,
             (SELECT COUNT(*) FROM drillingevent WHERE source_document_id = d.id) as extracted_events_count
      FROM document d
      LEFT JOIN "user" u ON d.uploaded_by = u.id
      ORDER BY d.uploaded_at DESC
    `);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/documents/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: docs } = await pool.query('SELECT * FROM document WHERE id = $1', [req.params.id]);
    if (docs.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const { rows: events } = await pool.query(
      'SELECT * FROM drillingevent WHERE source_document_id = $1 ORDER BY depth_start_m ASC',
      [req.params.id]
    );

    res.json({
      data: {
        ...docs[0],
        events
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/documents/:id/chunks
router.get('/:id/chunks', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, document_id, chunk_index, page_number, section_heading, text, token_count FROM documentchunk WHERE document_id = $1 ORDER BY chunk_index ASC',
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
