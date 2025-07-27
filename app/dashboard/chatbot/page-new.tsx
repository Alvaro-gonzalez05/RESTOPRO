import { requireAuth } from '@/lib/auth'
import { sql } from '@/lib/db'
import WhatsAppBotDashboard from './whatsapp-dashboard'

export const dynamic = 'force-dynamic'

export default async function ChatbotPage() {
  const user = await requireAuth()

  // Obtener configuración del bot del usuario
  const botConfig = await sql(
    'SELECT * FROM user_bots WHERE user_id = $1',
    [user.id]
  )

  // Obtener estadísticas del bot
  const stats = await sql(`
    SELECT 
      COUNT(DISTINCT bc.phone_number) as total_conversations,
      COUNT(bm.id) as total_messages,
      COUNT(CASE WHEN bm.message_type = 'incoming' THEN 1 END) as incoming_messages,
      COUNT(CASE WHEN bm.message_type = 'outgoing' THEN 1 END) as outgoing_messages
    FROM bot_conversations bc
    LEFT JOIN bot_messages bm ON bc.id = bm.conversation_id
    WHERE bc.user_id = $1
  `, [user.id])

  const botStats = stats[0] || {
    total_conversations: 0,
    total_messages: 0,
    incoming_messages: 0,
    outgoing_messages: 0
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <WhatsAppBotDashboard 
        botConfig={botConfig[0] || null}
        stats={botStats}
      />
    </div>
  )
}
