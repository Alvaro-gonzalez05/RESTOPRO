import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Verificar qué tablas nuevas existen
    const tables = await sql(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_bots', 'bot_conversations', 'bot_messages')
      ORDER BY table_name
    `)

    // Verificar si las tablas de Twilio fueron eliminadas
    const twilioTables = await sql(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('twilio_credentials', 'whatsapp_api_credentials')
    `)

    // Verificar si la columna user_id fue agregada a chatbot_messages
    const chatbotColumns = await sql(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chatbot_messages' 
      AND table_schema = 'public'
      AND column_name = 'user_id'
    `)

    // Verificar si users tiene clave primaria
    const usersPK = await sql(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
      AND constraint_type = 'PRIMARY KEY'
      AND table_schema = 'public'
    `)

    return NextResponse.json({
      success: true,
      status: {
        newTables: tables.map(t => t.table_name),
        twilioTablesRemoved: twilioTables.length === 0,
        chatbotMessagesHasUserId: chatbotColumns.length > 0,
        usersHasPrimaryKey: usersPK.length > 0,
        message: tables.length === 3 ? '✅ Migración completa exitosa!' : '⚠️ Migración parcial'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}
