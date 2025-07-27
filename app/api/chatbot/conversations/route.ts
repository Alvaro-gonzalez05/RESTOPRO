import { NextRequest, NextResponse } from 'next/server'
import { getConversations } from '@/app/actions/chatbot'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const conversations = await getConversations(userId)
    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Error getting conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
