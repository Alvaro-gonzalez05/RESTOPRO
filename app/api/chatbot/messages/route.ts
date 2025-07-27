import { NextRequest, NextResponse } from 'next/server'
import { getConversationMessages } from '@/app/actions/chatbot'

export async function POST(request: NextRequest) {
  try {
    const { conversationId, userId } = await request.json()
    
    if (!conversationId || !userId) {
      return NextResponse.json({ error: 'Conversation ID and User ID are required' }, { status: 400 })
    }

    const messages = await getConversationMessages(conversationId, userId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error getting messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
