import fs from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

export interface StorageUploadResult {
  url: string
  path: string
}

// Singleton R2/S3 client
let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

export async function saveImageFromUrl(
  imageUrl: string,
  orgId: string,
  pedidoId: string,
  filename: string,
): Promise<StorageUploadResult> {
  const useR2 = process.env.STORAGE_PROVIDER === 'r2'

  if (useR2) {
    return saveToR2(imageUrl, orgId, pedidoId, filename)
  }
  return saveToLocal(imageUrl, orgId, pedidoId, filename)
}

async function saveToLocal(
  imageUrl: string,
  orgId: string,
  pedidoId: string,
  filename: string,
): Promise<StorageUploadResult> {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'foto-ia', orgId, pedidoId)
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, filename)
  const response = await fetch(imageUrl)
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  const publicPath = `/uploads/foto-ia/${orgId}/${pedidoId}/${filename}`
  return { url: publicPath, path: filePath }
}

async function saveToR2(
  imageUrl: string,
  orgId: string,
  pedidoId: string,
  filename: string,
): Promise<StorageUploadResult> {
  const response = await fetch(imageUrl)
  const buffer = Buffer.from(await response.arrayBuffer())
  const key = `foto-ia/${orgId}/${pedidoId}/${filename}`

  const client = getS3Client()
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: response.headers.get('content-type') || 'image/png',
  }))

  const publicUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : key

  return { url: publicUrl, path: key }
}

export function getImageBuffer(filePath: string): Buffer | null {
  // R2 paths are not local — return null for non-local paths
  if (process.env.STORAGE_PROVIDER === 'r2' && !filePath.startsWith('/uploads')) {
    return null
  }

  const fullPath = filePath.startsWith('/uploads')
    ? path.join(process.cwd(), 'public', filePath)
    : filePath
  if (!fs.existsSync(fullPath)) return null
  return fs.readFileSync(fullPath)
}

export async function getImageBufferFromR2(key: string): Promise<Buffer | null> {
  try {
    const client = getS3Client()
    const result = await client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }))
    if (!result.Body) return null
    const bytes = await result.Body.transformToByteArray()
    return Buffer.from(bytes)
  } catch {
    return null
  }
}
