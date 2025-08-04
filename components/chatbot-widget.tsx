'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Message {
  id: number
  text: string
  timestamp: Date
  isFromBot: boolean
  isAI?: boolean
  role?: 'user' | 'model'
}

interface ChatbotProps {
  userId: number
  isOpen: boolean
  onClose: () => void
}

export default function ChatbotWidget({ userId, isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Generate consistent test phone number for this session
  const [testPhoneNumber] = useState(() => `test-${Math.random().toString(36).substr(2, 9)}`)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
  }

  const sendTestMessage = async () => {
    if (!newMessage.trim()) return

    const messageToSend = newMessage
    setNewMessage('')
    setIsLoading(true)

    try {
      // Add user message to UI
      const userMessage: Message = {
        id: Date.now(),
        text: messageToSend,
        timestamp: new Date(),
        isFromBot: false,
        role: 'user'
      }
      setMessages(prev => [...prev, userMessage])

      // Call API with consistent test phone number
      const response = await fetch('/api/chatbot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          from: testPhoneNumber
        })
      })

      if (response.ok) {
        const data = await response.json()
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: data.response,
          timestamp: new Date(),
          isFromBot: true,
          isAI: true,
          role: 'model'
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        const errorData = await response.json()
        const errorMessage: Message = {
          id: Date.now() + 1,
          text: `Error: ${errorData.error || 'No se pudo obtener respuesta.'}`,
          timestamp: new Date(),
          isFromBot: true,
          isAI: false,
          role: 'model'
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error sending test message:', error)
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Error: No se pudo conectar con el servidor.',
        timestamp: new Date(),
        isFromBot: true,
        isAI: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 md:right-4 md:bottom-4 md:top-auto md:left-auto w-full h-full md:w-96 md:h-[600px] bg-white md:rounded-lg shadow-2xl border z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white md:rounded-t-lg flex-shrink-0 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span className="font-semibold">Chat de Prueba</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            ✕
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm mt-2 opacity-90">
          <div className="w-2 h-2 rounded-full bg-green-300" />
          <span>Prueba el chatbot aquí</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Bot className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">¡Hola! Soy tu asistente virtual</p>
                <p className="text-sm mt-2">Escribe un mensaje para probar el chatbot</p>
                <p className="text-xs mt-2 text-gray-400">Ejemplo: "Quiero pedir una hamburguesa"</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.isFromBot ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {message.isFromBot && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                        message.isFromBot
                          ? 'bg-white text-gray-800 shadow-sm'
                          : 'bg-green-600 text-white'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs opacity-70">
                          {format(message.timestamp, 'HH:mm', { locale: es })}
                        </span>
                        {message.isAI && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            IA
                          </Badge>
                        )}
                      </div>
                    </div>

                    {!message.isFromBot && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-green-100 text-green-700">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <div className="flex gap-3">
            <Input
              value={newMessage}
              onChange={handleNewMessageChange}
              placeholder="Escribe tu mensaje aquí..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendTestMessage()
                }
              }}
              className="flex-1 rounded-full border-gray-300 focus:border-green-500 focus:ring-green-500"
              disabled={isLoading}
            />
            <Button
              onClick={sendTestMessage}
              disabled={isLoading || !newMessage.trim()}
              size="sm"
              className="bg-green-600 hover:bg-green-700 rounded-full h-10 w-10 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 Prueba decir: "Quiero pedir algo", "¿Qué productos tienes?", "Mis puntos"
          </p>
        </div>
      </div>
    </div>
  )
}