import dotenv from 'dotenv';
import * as Minio from 'minio';
import pool from './db/pool.js';
import { extractText } from './pipeline/extract.js';
import { chunkPages } from './pipeline/chunk.js';
import { embedAndStore } from './pipeline/embed.js';
import { extractEvents } from './pipeline/geminiExtract.js';

dotenv.config();

let minioClient = null;
function getMinioClient() {
  if (!minioClient) {
    const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const url = new URL(endpoint);
    minioClient = new Minio.Client({
      endPoint: url.hostname,
      port: parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10),
      useSSL: url.protocol === 'https:',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }
  return minioClient;
}

async function getDocumentBuffer(bucket, key) {
  const client = getMinioClient();
  const stream = await client.getObject(bucket, key);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function processDocument(doc) {
  console.log(`[Worker] Starting processing for doc ${doc.id}: ${doc.filename}`);

  await pool.query(
    "UPDATE document SET status = 'processing' WHERE id = $1",
    [doc.id]
  );

  try {
    const bucket = process.env.MINIO_BUCKET || 'nwis-documents';
    const buffer = await getDocumentBuffer(bucket, doc.minio_key);

    // 1. Text extraction
    const pages = await extractText(buffer);
    console.log(`[Worker] Extracted ${pages.length} pages from ${doc.filename}`);

    // 2. Chunking
    const chunks = chunkPages(pages, doc.id);
    console.log(`[Worker] Created ${chunks.length} chunks`);

    // 3. Embed and store chunks
    await embedAndStore(chunks, pool);
    console.log(`[Worker] Embedded & stored ${chunks.length} chunks in pgvector`);

    // 4. Try to find referenced well in filename or text
    const wellMatch = doc.filename.match(/OIL-W-(\d+)/i) || (pages[0]?.text.match(/OIL-W-(\d+)/i));
    let wellId = null;
    if (wellMatch) {
      const wellName = wellMatch[0].toUpperCase();
      const { rows } = await pool.query('SELECT id FROM well WHERE name = $1', [wellName]);
      if (rows.length > 0) wellId = rows[0].id;
    }
    if (!wellId) {
      const { rows } = await pool.query('SELECT id FROM well LIMIT 1');
      if (rows.length > 0) wellId = rows[0].id;
    }

    // 5. Structured Event Extraction with Gemini
    let totalExtractedEvents = 0;
    for (const chunk of chunks) {
      // Look for event indicators before calling Gemini
      const textUpper = chunk.text.toUpperCase();
      if (
        textUpper.includes('DRILLING PROBLEM') ||
        textUpper.includes('MUD LOSS') ||
        textUpper.includes('KICK') ||
        textUpper.includes('STUCK PIPE') ||
        textUpper.includes('TORQUE') ||
        textUpper.includes('NPT')
      ) {
        const events = await extractEvents(chunk.text);
        for (const ev of events) {
          if (ev.depth_start_m && wellId) {
            await pool.query(`
              INSERT INTO drillingevent (
                id, well_id, event_type, depth_start_m, depth_end_m, formation,
                severity, duration_hrs, description, mitigation, source_document_id,
                review_status, is_synthetic, created_at
              ) VALUES (
                uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'EXTRACTED', FALSE, NOW()
              )
            `, [
              wellId,
              ev.event_type || 'OTHER',
              ev.depth_start_m,
              ev.depth_end_m || null,
              ev.formation || null,
              ev.severity || 'UNKNOWN',
              ev.duration_hrs || null,
              ev.description || null,
              ev.mitigation || null,
              doc.id
            ]);
            totalExtractedEvents++;
          }
        }
      }
    }
    console.log(`[Worker] Extracted ${totalExtractedEvents} drilling events from ${doc.filename}`);

    // Mark as processed
    await pool.query(`
      UPDATE document
      SET status = 'processed',
          page_count = $2,
          model_used = 'gemini-1.5-flash + text-embedding-004',
          processed_at = NOW()
      WHERE id = $1
    `, [doc.id, pages.length]);

    console.log(`[Worker] Successfully processed document ${doc.id}`);
  } catch (err) {
    console.error(`[Worker] Failed processing doc ${doc.id}:`, err);
    await pool.query(
      "UPDATE document SET status = 'failed' WHERE id = $1",
      [doc.id]
    );
  }
}

async function pollQueue() {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM document WHERE status = 'uploaded' ORDER BY uploaded_at ASC LIMIT 1"
    );

    if (rows.length > 0) {
      await processDocument(rows[0]);
    }
  } catch (err) {
    // Database may be temporarily unavailable during initial startup
  }

  setTimeout(pollQueue, 3000);
}

console.log('[NWIS Worker] Document processing worker started. Polling for uploaded PDFs...');
pollQueue();
