// infra/functions/presign-upload.ts
import { APIGatewayProxyHandler } from 'aws-lambda'
import { randomUUID } from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * RECEIPTS_BUCKET_NAME is injected by CDK. Do NOT hardcode it.
 */
const BUCKET = process.env.RECEIPTS_BUCKET_NAME!
const s3 = new S3Client({})

/** CORS: keep * for dev; restrict in prod */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Content-Type': 'application/json',
}

/** Sanitize user file name */
function sanitizeFileName(name: string) {
  const base = name.split('/').pop()!.split('\\').pop()!
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

/**
 * Issues a pre-signed S3 PUT URL under:
 *   tmp/users/<sub>/receipts/<timestamp>_<uuid>_<safeName>
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: CORS, body: '' }
    }

    // Claims from Cognito authorizer
    const claims = (event.requestContext as any)?.authorizer?.claims as { sub?: string } | undefined
    const sub = claims?.sub
    if (!sub) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ message: 'Unauthorized' }) }
    }

    if (!event.body) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ message: 'Empty body' }) }
    }

    let fileName = ''
    let contentType = ''
    try {
      const body = JSON.parse(event.body)
      fileName = body?.fileName || ''
      contentType = body?.contentType || ''
    } catch {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ message: 'Invalid JSON body' }) }
    }

    if (!fileName || !contentType) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ message: 'fileName and contentType are required' }) }
    }

    const safeName = sanitizeFileName(fileName)

    //  place uploads under users/tmp/sub/receipts/...
    const key = `tmp/users/${sub}/receipts/${Date.now()}_${randomUUID()}_${safeName}`

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    })
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 30 })

    // Example response:
    // { uploadUrl: "https://.../tmp/users/<sub>/receipts...", key: "tmp/users/<sub>/receipts..." }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ uploadUrl, key }) }
  } catch (err) {
    console.error('[presign-upload] error:', err)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ message: 'Internal Server Error' }) }
  }
}
