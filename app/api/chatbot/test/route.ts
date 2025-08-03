
import { NextRequest, NextResponse } from 'next/server'
import { processIncomingMessage } from '@/app/actions/chatbot-ai'
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userId = user.id

  try {
    const body = await req.json()
    const { message, from } = body

    if (!message || !from) {
      return NextResponse.json({ error: 'Message and from are required' }, { status: 400 })
    }

    const result = await processIncomingMessage(userId, from, message)

    if (result.success) {
      return NextResponse.json({ response: result.response })
    } else {
      return NextResponse.json({ error: result.error || 'Failed to process message' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in test chat API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
