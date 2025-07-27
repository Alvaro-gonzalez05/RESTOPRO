import { sql } from '@/lib/db'

export async function GET() {
  try {
    // Verificar estructura de bot_conversations
    const conversationsSchema = await sql(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'bot_conversations'
       ORDER BY ordinal_position`,
      []
    )

    // Verificar estructura de bot_messages
    const messagesSchema = await sql(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'bot_messages'
       ORDER BY ordinal_position`,
      []
    )

    // Verificar estructura de user_bots
    const userBotsSchema = await sql(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'user_bots'
       ORDER BY ordinal_position`,
      []
    )

    return Response.json({ 
      success: true, 
      schemas: {
        bot_conversations: conversationsSchema,
        bot_messages: messagesSchema,
        user_bots: userBotsSchema
      }
    })
  } catch (error) {
    console.error('Error obteniendo schemas:', error)
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
