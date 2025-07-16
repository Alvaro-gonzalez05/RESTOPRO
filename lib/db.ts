import { neon } from "@neondatabase/serverless"

// Use the provided DATABASE_URL or fallback to environment variable
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://neondb_owner:npg_iDefZaSH83dB@ep-green-tree-adyy0bos-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

export const sql = neon(DATABASE_URL)
