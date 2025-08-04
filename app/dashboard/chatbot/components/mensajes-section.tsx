'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageCircle, Search, Filter, Calendar, Phone, User, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ChatbotInteraction {
  id: number
  customer_phone: string
  incoming_message: string
  bot_response: string
  created_at: string
  customer_name?: string
  message_type?: 'incoming' | 'outgoing'
}

interface PromotionalMessage {
  id: number
  customer_phone: string
  campaign_name: string
  message_content: string
  sent_at: string
  status: 'sent' | 'delivered' | 'failed'
  customer_name?: string
}

interface WhatsAppMessage {
  id: number
  from_phone: string
  to_phone: string
  message_body: string
  message_type: string
  created_at: string
  status: string
}

export function MensajesSection() {
  const [interactions, setInteractions] = useState<ChatbotInteraction[]>([])
  const [promotionalMessages, setPromotionalMessages] = useState<PromotionalMessage[]>([])
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [messageType, setMessageType] = useState<'all' | 'chatbot' | 'promotional' | 'whatsapp'>('all')
  const [stats, setStats] = useState({
    total_interactions: 0,
    total_promotional: 0,
    total_whatsapp: 0,
    unique_customers: 0
  })

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      setLoading(true)
      
      // Load all message types in parallel
      const [chatbotRes, promotionalRes, whatsappRes, statsRes] = await Promise.all([
        fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'get_chatbot_interactions',
            limit: 100 
          })
        }),
        fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'get_promotional_messages',
            limit: 100 
          })
        }),
        fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'get_whatsapp_messages',
            limit: 100 
          })
        }),
        fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'get_message_stats' 
          })
        })
      ])

      if (chatbotRes.ok) {
        const chatbotData = await chatbotRes.json()
        setInteractions(chatbotData)
      }

      if (promotionalRes.ok) {
        const promotionalData = await promotionalRes.json()
        setPromotionalMessages(promotionalData)
      }

      if (whatsappRes.ok) {
        const whatsappData = await whatsappRes.json()
        setWhatsappMessages(whatsappData)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

    } catch (err) {
      setError('Error cargando mensajes')
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredMessages = () => {
    let allMessages: any[] = []

    if (messageType === 'all' || messageType === 'chatbot') {
      const chatbotMsgs = interactions.map(interaction => ({
        ...interaction,
        type: 'chatbot',
        display_phone: interaction.customer_phone,
        display_message: interaction.incoming_message,
        response: interaction.bot_response,
        timestamp: interaction.created_at
      }))
      allMessages = [...allMessages, ...chatbotMsgs]
    }

    if (messageType === 'all' || messageType === 'promotional') {
      const promoMsgs = promotionalMessages.map(msg => ({
        ...msg,
        type: 'promotional',
        display_phone: msg.customer_phone,
        display_message: msg.message_content,
        campaign: msg.campaign_name,
        timestamp: msg.sent_at
      }))
      allMessages = [...allMessages, ...promoMsgs]
    }

    if (messageType === 'all' || messageType === 'whatsapp') {
      const whatsappMsgs = whatsappMessages.map(msg => ({
        ...msg,
        type: 'whatsapp',
        display_phone: msg.from_phone,
        display_message: msg.message_body,
        timestamp: msg.created_at
      }))
      allMessages = [...allMessages, ...whatsappMsgs]
    }

    // Filter by search term
    if (searchTerm) {
      allMessages = allMessages.filter(msg => 
        msg.display_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.display_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sort by timestamp desc
    return allMessages.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'chatbot':
        return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'promotional':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />
      case 'whatsapp':
        return <Phone className="w-4 h-4 text-purple-500" />
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getMessageTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      chatbot: { variant: 'default', text: 'Chatbot' },
      promotional: { variant: 'secondary', text: 'Promocional' },
      whatsapp: { variant: 'outline', text: 'WhatsApp' }
    }
    const config = variants[type] || { variant: 'default', text: type }
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    )
  }

  const getStatusIcon = (message: any) => {
    if (message.type === 'promotional') {
      if (message.status === 'delivered') {
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      } else if (message.status === 'failed') {
        return <AlertCircle className="w-4 h-4 text-red-500" />
      }
    }
    return null
  }

  const filteredMessages = getFilteredMessages()

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-500">Cargando mensajes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interacciones Chatbot</CardTitle>
            <MessageCircle className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_interactions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Promocionales</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_promotional}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes WhatsApp</CardTitle>
            <Phone className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_whatsapp}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <User className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unique_customers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por teléfono, mensaje o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los mensajes</SelectItem>
            <SelectItem value="chatbot">Chatbot</SelectItem>
            <SelectItem value="promotional">Promocionales</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={loadMessages} disabled={loading}>
          <MessageCircle className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Mensajes ({filteredMessages.length})
          </CardTitle>
          <CardDescription>
            Historial completo de mensajes ordenado por fecha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center text-red-500 py-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              {error}
            </div>
          )}
          
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron mensajes</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredMessages.map((message, index) => (
                <div key={`${message.type}-${message.id}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getMessageTypeIcon(message.type)}
                      <span className="font-medium">{message.display_phone}</span>
                      {message.customer_name && (
                        <span className="text-sm text-gray-500">({message.customer_name})</span>
                      )}
                      {getMessageTypeBadge(message.type)}
                      {getStatusIcon(message)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(message.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 mb-2">
                    <strong>Mensaje:</strong> {message.display_message}
                  </div>
                  
                  {message.response && (
                    <div className="text-sm text-gray-600 bg-blue-50 rounded p-2 mt-2">
                      <strong>Respuesta bot:</strong> {message.response}
                    </div>
                  )}
                  
                  {message.campaign && (
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Campaña:</strong> {message.campaign}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}