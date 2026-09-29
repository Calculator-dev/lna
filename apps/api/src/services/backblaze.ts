import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "../env.js"

let client: S3Client | undefined
export function storage() {
  const secret = env.BACKBLAZE_APP_KEY || env.BACKBLAZE_APPLICATION_KEY
  if (!env.BACKBLAZE_ENDPOINT || !env.BACKBLAZE_REGION || !env.BACKBLAZE_KEY_ID || !secret || !env.BACKBLAZE_BUCKET_NAME) {
    throw Object.assign(new Error("Image storage is not configured"), { statusCode: 503 })
  }
  client ??= new S3Client({
    endpoint: env.BACKBLAZE_ENDPOINT, region: env.BACKBLAZE_REGION, forcePathStyle: true,
    credentials: { accessKeyId: env.BACKBLAZE_KEY_ID, secretAccessKey: secret },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED", maxAttempts: 2,
  })
  return { client, bucket: env.BACKBLAZE_BUCKET_NAME }
}
export async function uploadImage(storageKey: string, body: Buffer) {
  const { client, bucket } = storage()
  return client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: body, ContentType: "image/webp", CacheControl: "max-age=31536000" }), { abortSignal: AbortSignal.timeout(30000) })
}
export async function deleteUploadedImage(storageKey: string, versionId?: string) {
  const { client, bucket } = storage()
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey, VersionId: versionId }), { abortSignal: AbortSignal.timeout(15000) })
}
export async function imageUrl(storageKey: string) {
  const { client, bucket } = storage()
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: storageKey }), { expiresIn: 3600 })
}
export function permanentImageUrl(storageKey: string) {
  const { bucket } = storage()
  return `${env.BACKBLAZE_ENDPOINT!.replace(/\/$/, "")}/${encodeURIComponent(bucket)}/${storageKey.split("/").map(encodeURIComponent).join("/")}`
}
