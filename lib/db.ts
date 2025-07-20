import pg from 'pg'
const { Pool } = pg

// Use the provided DATABASE_URL or fallback to environment variable
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

// Desactivar verificación SSL para desarrollo
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

// Create a connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : {
    rejectUnauthorized: false
  }
})

// Function to execute SQL queries compatible with Neon's interface
export const sql = async (query: string, params?: any[]) => {
  const client = await pool.connect()
  try {
    const result = await client.query(query, params)
    return result.rows
  } finally {
    client.release()
  }
}
