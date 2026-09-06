import * as Minio from 'minio';

let minioClient = null;

export function getMinioClient() {
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

export async function ensureBucket(bucketName = process.env.MINIO_BUCKET || 'nwis-documents') {
  const client = getMinioClient();
  const exists = await client.bucketExists(bucketName).catch(() => false);
  if (!exists) {
    await client.makeBucket(bucketName, 'us-east-1');
  }
  return bucketName;
}

export async function uploadBuffer(bucketName, objectName, buffer, meta = {}) {
  const client = getMinioClient();
  await ensureBucket(bucketName);
  return client.putObject(bucketName, objectName, buffer, buffer.length, meta);
}

export async function getObjectStream(bucketName, objectName) {
  const client = getMinioClient();
  return client.getObject(bucketName, objectName);
}
