import fs from 'fs'
import path from 'path'

export interface StorageUploadResult {
  url: string
  path: string
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
  // R2 via Cloudflare requer @aws-sdk/client-s3
  // Por ora usa fallback local; instalar o SDK para habilitar R2 em produção
  console.warn('[Storage] R2 não disponível, usando storage local como fallback')
  return saveToLocal(imageUrl, orgId, pedidoId, filename)
}

export function getImageBuffer(filePath: string): Buffer | null {
  const fullPath = filePath.startsWith('/uploads')
    ? path.join(process.cwd(), 'public', filePath)
    : filePath
  if (!fs.existsSync(fullPath)) return null
  return fs.readFileSync(fullPath)
}
