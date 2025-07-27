import pg from 'pg'
import fs from 'fs'
const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false, ca: undefined }
})

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('🚀 Iniciando migración a Baileys...')
    
    const migrationSQL = fs.readFileSync('./migrate-to-baileys-multitenant.sql', 'utf8')
    await client.query(migrationSQL)
    
    console.log('✅ Migración completada exitosamente!')
    console.log('')
    console.log('🎉 Tu sistema ahora usa Baileys (gratuito) en lugar de Twilio')
    console.log('📱 Cada usuario puede crear su propio bot de WhatsApp')
    console.log('🧠 Con IA integrada (ChatGPT)')
    console.log('')
    console.log('Próximo paso: Ve a Dashboard → Chatbot para configurar tu bot')
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
