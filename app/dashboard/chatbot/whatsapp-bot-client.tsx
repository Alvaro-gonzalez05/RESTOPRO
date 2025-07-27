'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Bot, MessageSquare, Settings, Smartphone, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import QRCode from 'react-qr-code'
import {
  createUserBot,
  startUserBot,
  stopUserBot,
  getUserBotStatus,
  updateUserBotConfig,
  getUserBotConversations
} from '@/app/actions/whatsapp-bot'

interface BotStatus {
  id: number
  bot_name: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  qr_code?: string
  ai_enabled: boolean
  ai_role: string
  ai_instructions: string
  phone_number?: string
  created_at: string
  updated_at: string
}

interface BotConfig {
  botName: string
  aiEnabled: boolean
  aiRole: string
  aiInstructions: string
  openaiApiKey: string
}

export default function WhatsAppBotDashboard() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [config, setConfig] = useState<BotConfig>({
    botName: 'Mi Bot de WhatsApp',
    aiEnabled: true,
    aiRole: 'Eres un asistente virtual amigable y profesional de restaurante.',
    aiInstructions: 'Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante. Mantén un tono cálido y profesional.',
    openaiApiKey: ''
  })

  useEffect(() => {
    loadBotStatus()
    loadConversations()
  }, [])

  const loadBotStatus = async () => {
    try {
      const result = await getUserBotStatus()
      if (result.success) {
        setBotStatus(result.data)
        setConfig({
          botName: result.data.bot_name,
          aiEnabled: result.data.ai_enabled,
          aiRole: result.data.ai_role,
          aiInstructions: result.data.ai_instructions,
          openaiApiKey: '' // No cargar la API key por seguridad
        })
      }
    } catch (error) {
      console.error('Error cargando estado del bot:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConversations = async () => {
    try {
      const result = await getUserBotConversations()
      if (result.success) {
        setConversations(result.data || [])
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error)
    }
  }

  const handleCreateBot = async () => {
    if (!config.openaiApiKey.trim()) {
      toast({
        title: "Error",
        description: "Debes proporcionar una API Key de OpenAI",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    try {
      const result = await createUserBot(config)
      if (result.success) {
        toast({
          title: "Bot creado",
          description: "Tu bot de WhatsApp ha sido creado exitosamente"
        })
        loadBotStatus()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al crear el bot",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  const handleStartBot = async () => {
    try {
      const result = await startUserBot()
      if (result.success) {
        toast({
          title: "Bot iniciado",
          description: "Tu bot está iniciando. Escanea el código QR para conectar."
        })
        loadBotStatus()
        // Refrescar estado cada 5 segundos mientras está conectando
        const interval = setInterval(() => {
          loadBotStatus()
        }, 5000)
        
        // Limpiar interval después de 2 minutos
        setTimeout(() => clearInterval(interval), 120000)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al iniciar el bot",
        variant: "destructive"
      })
    }
  }

  const handleStopBot = async () => {
    try {
      const result = await stopUserBot()
      if (result.success) {
        toast({
          title: "Bot detenido",
          description: "Tu bot ha sido detenido"
        })
        loadBotStatus()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al detener el bot",
        variant: "destructive"
      })
    }
  }

  const handleUpdateConfig = async () => {
    try {
      const result = await updateUserBotConfig(config)
      if (result.success) {
        toast({
          title: "Configuración actualizada",
          description: "La configuración del bot ha sido actualizada"
        })
        loadBotStatus()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la configuración",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Conectado</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800">Conectando...</Badge>
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-800">Desconectado</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconocido</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold">Bot de WhatsApp con IA</h1>
          <p className="text-gray-600">
            Automatiza tu atención al cliente con un bot inteligente powered by ChatGPT
          </p>
        </div>
      </div>

      {!botStatus ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Configurar tu Bot
            </CardTitle>
            <CardDescription>
              Configura tu bot de WhatsApp con inteligencia artificial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>¡Nueva experiencia!</strong> Ahora usamos Baileys (gratuito) en lugar de Twilio. 
                Solo necesitas escanear un código QR para conectar tu WhatsApp.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="botName">Nombre del Bot</Label>
                <Input
                  id="botName"
                  value={config.botName}
                  onChange={(e) => setConfig(prev => ({ ...prev, botName: e.target.value }))}
                  placeholder="Mi Bot de WhatsApp"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="aiEnabled"
                  checked={config.aiEnabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aiEnabled: checked }))}
                />
                <Label htmlFor="aiEnabled">Habilitar Inteligencia Artificial (ChatGPT)</Label>
              </div>

              {config.aiEnabled && (
                <>
                  <div>
                    <Label htmlFor="apiKey">API Key de OpenAI *</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={config.openaiApiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      placeholder="sk-..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Obtén tu API key en{' '}
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        OpenAI Platform
                      </a>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="aiRole">Rol de la IA</Label>
                    <Input
                      id="aiRole"
                      value={config.aiRole}
                      onChange={(e) => setConfig(prev => ({ ...prev, aiRole: e.target.value }))}
                      placeholder="Eres un asistente virtual amigable..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="aiInstructions">Instrucciones para la IA</Label>
                    <Textarea
                      id="aiInstructions"
                      value={config.aiInstructions}
                      onChange={(e) => setConfig(prev => ({ ...prev, aiInstructions: e.target.value }))}
                      placeholder="Responde de manera cordial..."
                      rows={4}
                    />
                  </div>
                </>
              )}

              <Button onClick={handleCreateBot} disabled={creating} className="w-full">
                {creating ? 'Creando...' : 'Crear Bot'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Estado
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversaciones
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Estado del Bot
                    {getStatusBadge(botStatus.status)}
                  </CardTitle>
                  <CardDescription>
                    {botStatus.bot_name} • Última actualización: {new Date(botStatus.updated_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {botStatus.phone_number && (
                    <div>
                      <Label>Número de WhatsApp</Label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                        {botStatus.phone_number}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {botStatus.status === 'disconnected' && (
                      <Button onClick={handleStartBot} className="flex-1">
                        Iniciar Bot
                      </Button>
                    )}
                    {botStatus.status === 'connected' && (
                      <Button onClick={handleStopBot} variant="destructive" className="flex-1">
                        Detener Bot
                      </Button>
                    )}
                    <Button onClick={loadBotStatus} variant="outline">
                      Actualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {botStatus.qr_code && botStatus.status === 'connecting' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Código QR</CardTitle>
                    <CardDescription>
                      Escanea este código con WhatsApp para conectar tu bot
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCode value={botStatus.qr_code} size={200} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="conversations">
            <Card>
              <CardHeader>
                <CardTitle>Conversaciones Recientes</CardTitle>
                <CardDescription>
                  Historial de conversaciones de tu bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay conversaciones aún. Inicia tu bot para comenzar a recibir mensajes.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv: any) => (
                      <div key={conv.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{conv.contact_name || conv.contact_number}</p>
                          <p className="text-sm text-gray-500">{conv.last_message}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{conv.message_count} mensajes</Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(conv.last_message_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Bot</CardTitle>
                <CardDescription>
                  Personaliza el comportamiento de tu bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="updateBotName">Nombre del Bot</Label>
                  <Input
                    id="updateBotName"
                    value={config.botName}
                    onChange={(e) => setConfig(prev => ({ ...prev, botName: e.target.value }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="updateAiEnabled"
                    checked={config.aiEnabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aiEnabled: checked }))}
                  />
                  <Label htmlFor="updateAiEnabled">Habilitar IA</Label>
                </div>

                {config.aiEnabled && (
                  <>
                    <div>
                      <Label htmlFor="updateApiKey">Nueva API Key de OpenAI (opcional)</Label>
                      <Input
                        id="updateApiKey"
                        type="password"
                        value={config.openaiApiKey}
                        onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                        placeholder="Dejar vacío para mantener la actual"
                      />
                    </div>

                    <div>
                      <Label htmlFor="updateAiRole">Rol de la IA</Label>
                      <Input
                        id="updateAiRole"
                        value={config.aiRole}
                        onChange={(e) => setConfig(prev => ({ ...prev, aiRole: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="updateAiInstructions">Instrucciones para la IA</Label>
                      <Textarea
                        id="updateAiInstructions"
                        value={config.aiInstructions}
                        onChange={(e) => setConfig(prev => ({ ...prev, aiInstructions: e.target.value }))}
                        rows={4}
                      />
                    </div>
                  </>
                )}

                <Button onClick={handleUpdateConfig} className="w-full">
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
