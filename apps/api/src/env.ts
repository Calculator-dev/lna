import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  // Comma-separated browser origins allowed to call the API (storefront and CRM).
  CORS_ORIGINS: z.string().optional(),
  // Set when running behind a reverse proxy so rate limits use the client IP: "true" or a hop count.
  TRUST_PROXY: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  BACKBLAZE_ENDPOINT: z.string().url().optional(),
  BACKBLAZE_REGION: z.string().optional(),
  BACKBLAZE_APP_KEY: z.string().optional(),
  BACKBLAZE_BUCKET_NAME: z.string().optional(),
  BACKBLAZE_KEY_ID: z.string().optional(),
  BACKBLAZE_APPLICATION_KEY: z.string().optional(),
  BACKBLAZE_BUCKET_ID: z.string().optional(),
  BACKBLAZE_PUBLIC_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  ORDER_EMAIL_FROM: z.string().optional(),
  INQUIRY_NOTIFY_EMAIL: z.preprocess(value => value === "" ? undefined : value, z.string().email().optional()),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`)
}
export const env = parsed.data

const developmentOrigins = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]
export const corsOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(",").map(origin => origin.trim().replace(/\/$/, "")).filter(Boolean)
  : env.NODE_ENV === "production" ? [] : developmentOrigins
const proxyHops = env.TRUST_PROXY && /^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : 0
export const trustProxy = env.TRUST_PROXY === "true" ? true : proxyHops > 0 ? (_address: string, hop: number) => hop < proxyHops : false
