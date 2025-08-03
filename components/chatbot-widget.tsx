'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Clock,
  Phone,
  Settings,
  Zap,
  BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Message {
  id: number
  text: string
  timestamp: Date
  isFromBot: boolean
  isAI?: boolean
  role?: 'user' | 'model' // Add role property
}

interface Conversation {
  id: number
  customerPhone: string
  customerName?: string
  lastMessage: string
  lastMessageTimestamp: Date
  messageCount: number
  status: string
}

interface ChatbotProps {
  userId: number
  isOpen: boolean
  onClose: () => void
}

export default function ChatbotWidget({ userId, isOpen, onClose }: ChatbotProps) {
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversations and check WhatsApp status
  useEffect(() => {
    if (isOpen) {
      loadConversations()
      checkWhatsAppStatus()
    }
  }, [isOpen, userId])

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/chatbot/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', userId })
      })
      
      if (response.ok) {
        const data = await response.json()
        setConnectionStatus(data?.is_connected ? 'connected' : 'disconnected')
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
    }
  }

  const loadConversationMessages = async (conversationId: number) => {
    try {
      const response = await fetch('/api/chatbot/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, userId })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          text: msg.message_text,
          timestamp: new Date(msg.timestamp),
          isFromBot: msg.is_from_bot,
          isAI: msg.ai_response_used
        })))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setIsLoading(true)
    try {
      // Add message to UI immediately
      const tempMessage: Message = {
        id: Date.now(),
        text: newMessage,
        timestamp: new Date(),
        isFromBot: false
      }
      setMessages(prev => [...prev, tempMessage])

      // Send to API
      const conversation = conversations.find(c => c.id === selectedConversation)
      if (conversation) {
        const response = await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            userId,
            customerPhone: conversation.customerPhone,
            messageText: newMessage
          })
        })

        if (response.ok) {
          setNewMessage('')
          // Reload messages to get the saved version
          setTimeout(() => loadConversationMessages(selectedConversation), 500)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConversationSelect = (conversationId: number) => {
    setSelectedConversation(conversationId)
    loadConversationMessages(conversationId)
  }

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const message = e.target.value
    setNewMessage(message)

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      if (message.trim() !== '') {
        // Aquí podrías mostrar un indicador de "escribiendo..." si quisieras
      }
    }, 500)
  }

  const sendTestMessage = async () => {
    if (!newMessage.trim()) return

    const messageToSend = newMessage
    setNewMessage('')
    setIsLoading(true)

    try {
      // Añadir mensaje del usuario a la UI
      const userMessage: Message = {
        id: Date.now(),
        text: messageToSend,
        timestamp: new Date(),
        isFromBot: false,
        role: 'user'
      }
      setMessages(prev => [...prev, userMessage])

      // Llamar al nuevo endpoint de la API
      const response = await fetch('/api/chatbot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          from: 'test-chat-widget' // Identificador para el chat de prueba
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
    <div className="fixed right-4 bottom-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border z-50">
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chatbot de WhatsApp
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              ✕
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-300' : 
              connectionStatus === 'connecting' ? 'bg-yellow-300' : 'bg-red-300'
            }`} />
            <span>
              {connectionStatus === 'connected' ? 'Conectado' : 
               connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
              <TabsTrigger value="chat" className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="conversations" className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Conversaciones
              </TabsTrigger>
              <TabsTrigger value="automation" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                Auto
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Stats
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col p-4">
              <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 mb-4 border rounded-lg p-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Inicia una conversación o prueba el chatbot</p>
                      <p className="text-sm mt-1">Los mensajes aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-2 ${
                            message.isFromBot ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          {message.isFromBot && (
                            <Avatar className="h-7 w-7 mt-1">
                              <AvatarFallback className="bg-green-100 text-green-700">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              message.isFromBot
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-green-600 text-white'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs opacity-70">
                                {format(message.timestamp, 'HH:mm', { locale: es })}
                              </span>
                              {message.isAI && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  IA
                                </Badge>
                              )}
                            </div>
                          </div>

                          {!message.isFromBot && (
                            <Avatar className="h-7 w-7 mt-1">
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-2 justify-start">
                          <Avatar className="h-7 w-7 mt-1">
                            <AvatarFallback className="bg-green-100 text-green-700">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={handleNewMessageChange}
                    placeholder="Escribe un mensaje..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (selectedConversation) {
                          sendMessage()
                        } else {
                          sendTestMessage()
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={selectedConversation ? sendMessage : sendTestMessage}
                    disabled={isLoading || !newMessage.trim()}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {!selectedConversation && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Modo demo - Selecciona una conversación para enviar por WhatsApp
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="conversations" className="flex-1 p-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Conversaciones Activas</h3>
                  <Badge variant="secondary">{conversations.length}</Badge>
                </div>
                
                <ScrollArea className="h-[400px]">
                  {conversations.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Phone className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay conversaciones activas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedConversation === conversation.id
                              ? 'bg-green-50 border-green-200'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleConversationSelect(conversation.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {conversation.customerName || conversation.customerPhone}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {conversation.messageCount} msgs
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 truncate mb-1">
                            {conversation.lastMessage}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {format(new Date(conversation.lastMessageTimestamp && !isNaN(new Date(conversation.lastMessageTimestamp).getTime()) ? conversation.lastMessageTimestamp : new Date()), 'dd/MM HH:mm', { locale: es })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="automation" className="flex-1 p-4">
              <div className="text-center text-gray-500 py-8">
                <Zap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Configuración de automatizaciones</p>
                <p className="text-sm mt-1">Próximamente disponible</p>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="flex-1 p-4">
              <div className="text-center text-gray-500 py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Estadísticas del chatbot</p>
                <p className="text-sm mt-1">Próximamente disponible</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
