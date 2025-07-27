import { NextRequest, NextResponse } from 'next/server'
import { getChatbotMessages, createChatbotMessage, updateChatbotMessage, deleteChatbotMessage } from '@/app/actions/chatbot'

export async function POST(request: NextRequest) {
  try {
    const { action, userId, messageId, data } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    switch (action) {
      case 'get':
        const messages = await getChatbotMessages(userId)
        return NextResponse.json(messages)

      case 'create':
        if (!data) {
          return NextResponse.json({ error: 'Data is required' }, { status: 400 })
        }
        const createResult = await createChatbotMessage({
          userId,
          category: data.category,
          triggerKeywords: data.triggerKeywords,
          messageText: data.messageText
        })
        
        if (createResult.success) {
          return NextResponse.json(createResult.message)
        } else {
          return NextResponse.json({ error: createResult.error }, { status: 400 })
        }

      case 'update':
        if (!messageId || !data) {
          return NextResponse.json({ error: 'Message ID and data are required' }, { status: 400 })
        }
        const updateResult = await updateChatbotMessage(messageId, {
          category: data.category,
          triggerKeywords: data.triggerKeywords,
          messageText: data.messageText,
          isActive: data.isActive
        })
        
        if (updateResult.success) {
          return NextResponse.json(updateResult.message)
        } else {
          return NextResponse.json({ error: updateResult.error }, { status: 400 })
        }

      case 'delete':
        if (!messageId) {
          return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
        }
        const deleteResult = await deleteChatbotMessage(messageId)
        
        if (deleteResult.success) {
          return NextResponse.json({ success: true })
        } else {
          return NextResponse.json({ error: deleteResult.error }, { status: 400 })
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Messages config API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
