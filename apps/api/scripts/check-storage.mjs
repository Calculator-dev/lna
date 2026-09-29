import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { uploadImage, imageUrl, deleteUploadedImage } from '../dist/services/backblaze.js'
const key = `products/storage-check-${randomUUID()}.webp`
let uploaded
try {
  const body = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).webp().toBuffer()
  uploaded = await uploadImage(key, body)
  const response = await fetch(await imageUrl(key), { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Preview request failed (${response.status})`)
  const returned = Buffer.from(await response.arrayBuffer())
  if (!returned.equals(body)) throw new Error('Preview contents did not match')
  console.log('PASS: Backblaze upload and private image preview')
} catch (error) {
  console.error(JSON.stringify({ storageCheck: 'failed', code: error.name, status: error.$metadata?.httpStatusCode }))
  process.exitCode = 1
} finally {
  if (uploaded) {
    try { await deleteUploadedImage(key, uploaded.VersionId); console.log('Temporary test image removed') }
    catch { console.error('Temporary image cleanup failed'); process.exitCode = 1 }
  }
}
