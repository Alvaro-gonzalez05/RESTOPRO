import pg from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' });

const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false, ca: undefined }
})

async function runSingleMigration(migrationFilePath) {
  const client = await pool.connect()
  try {
    console.log(`🚀 Iniciando migración: ${migrationFilePath}...`)
    
    const migrationSQL = fs.readFileSync(migrationFilePath, 'utf8')
    await client.query(migrationSQL)
    
    console.log(`✅ Migración ${migrationFilePath} completada exitosamente!`);
    
  } catch (error) {
    console.error(`❌ Error en migración ${migrationFilePath}:`, error.message)
  } finally {
    client.release()
    await pool.end()
  }
}

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error("Uso: node run-single-migration.mjs <ruta_al_archivo_sql>");
  process.exit(1);
}

runSingleMigration(migrationFile);