'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import QRCodeDisplay from '@/components/qr-code-display'
import BusinessConfig from './components/business-config'
import { 
  MessageSquare, 
  Smartphone, 
  Settings, 
  Zap, 
  Gift, 
  QrCode,
  Phone,
  Bot,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { createUserBot, startUserBot, stopUserBot } from '@/app/actions/whatsapp-bot'
import { toast } from '@/hooks/use-toast'

interface Props {
  botConfig: any
  stats: {
    total_conversations: number
    total_messages: number
    incoming_messages: number
    outgoing_messages: number
  }
}

export default function WhatsAppBotDashboard({ botConfig, stats }: Props) {
  const [isConnected, setIsConnected] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('conexion')
  const [botStatus, setBotStatus] = useState<string>('disconnected')
  const [qrRefreshTrigger, setQrRefreshTrigger] = useState(0) // Nuevo: para controlar refresh del QR

  // Verificar estado del bot en tiempo real
  const checkBotStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status')
      const data = await response.json()
      
      if (data.success) {
        setBotStatus(data.status)
        setIsConnected(data.status === 'connected')
        setQrCode(data.qrCode)
      }
    } catch (error) {
      console.error('Error verificando estado del bot:', error)
    }
  }

  // Determinar estado del bot
  useEffect(() => {
    if (botConfig) {
      setIsConnected(botConfig.status === 'connected')
      setBotStatus(botConfig.status)
      setQrCode(botConfig.qr_code)
    }
    
    // Verificar estado cada 3 segundos
    const interval = setInterval(checkBotStatus, 3000)
    return () => clearInterval(interval)
  }, [botConfig])

  const handleCreateBot = async (formData: FormData) => {
    setIsLoading(true)
    try {
      await createUserBot({
        botName: formData.get('botName') as string,
        aiEnabled: formData.get('aiEnabled') === 'on',
        aiRole: formData.get('aiRole') as string,
        aiInstructions: formData.get('aiInstructions') as string,
        openaiApiKey: formData.get('openaiApiKey') as string
      })
      
      toast({
        title: "Bot creado exitosamente",
        description: "Tu bot de WhatsApp ha sido configurado"
      })
      
      setShowCreateForm(false)
      window.location.reload()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el bot",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateNewQR = async () => {
    setIsLoading(true)
    try {
      console.log('🔄 Generando nuevo QR...')
      
      // Generar un nuevo QR actualizando la base de datos
      const response = await fetch('/api/update-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al generar nuevo QR')
      }
      
      console.log('✅ Nuevo QR generado:', data)
      
      toast({
        title: "✅ Nuevo QR generado",
        description: `QR de ${data.qrLength} caracteres generado correctamente. ¡Escanéalo ahora!`
      })
      
      // Actualizar estado local para forzar re-render del QR
      setBotStatus('connecting')
      setQrCode(null) // Limpiar QR anterior
      
      // Triggear refresh del componente QRCodeDisplay
      setQrRefreshTrigger(prev => prev + 1)
      
      // Esperar un momento y verificar estado
      setTimeout(async () => {
        await checkBotStatus()
      }, 2000)
      
    } catch (error) {
      console.error('❌ Error generando QR:', error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo generar un nuevo QR",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopBot = async () => {
    setIsLoading(true)
    try {
      await stopUserBot()
      toast({
        title: "Bot detenido",
        description: "El bot de WhatsApp ha sido detenido"
      })
      setIsConnected(false)
      window.location.reload()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo detener el bot",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Bot className="h-8 w-8 text-green-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Chatbot de WhatsApp</h1>
          <p className="text-gray-600 text-sm sm:text-base">Automatiza la atención al cliente y mejora las ventas con inteligencia artificial</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estado */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Estado</p>
                <p className={`text-lg sm:text-2xl font-bold truncate ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
              <div className={`p-2 rounded-lg flex-shrink-0 ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                {isConnected ? (
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensajes Hoy */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Mensajes Hoy</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">{stats.total_messages}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automatizaciones */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Automatizaciones</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600 truncate">{stats.outgoing_messages}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promociones */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Promociones</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-600 truncate">2</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-2 border-b pb-2 overflow-x-auto">
          <TabsTrigger value="conexion" className="flex items-center">
            <Smartphone className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Conexión</span>
          </TabsTrigger>
          <TabsTrigger value="mensajes" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Mensajes</span>
          </TabsTrigger>
          <TabsTrigger value="mi-negocio" className="flex items-center">
            <Settings className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Mi Negocio</span>
          </TabsTrigger>
          <TabsTrigger value="promociones" className="flex items-center">
            <Gift className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Promociones</span>
          </TabsTrigger>
          <TabsTrigger value="automatizacion" className="flex items-center">
            <Bot className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Automatización</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Contenido de la pestaña Conexión */}
        <TabsContent value="conexion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Phone className="h-5 w-5" />
                Conectar WhatsApp Business
              </CardTitle>
              <p className="text-gray-600 text-sm sm:text-base">Escanea el código QR con tu WhatsApp Business para conectar tu cuenta</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    botStatus === 'connected' ? 'bg-green-500' : 
                    botStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm">Estado de WhatsApp</span>
                </div>
                <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                  {botStatus === 'connected' ? 'Conectado' : 
                   botStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
                </Badge>
              </div>

              {!botConfig ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">Para comenzar a usar el chatbot, necesitas conectar tu WhatsApp Business</p>
                  
                  <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                    <DialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Smartphone className="h-4 w-4 mr-2" />
                        Conectar WhatsApp
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl mx-4">
                      <DialogHeader>
                        <DialogTitle>Configurar Bot de WhatsApp</DialogTitle>
                      </DialogHeader>
                      
                      <form action={handleCreateBot} className="space-y-4">
                        <div>
                          <Label htmlFor="botName">Nombre del Bot</Label>
                          <Input 
                            id="botName" 
                            name="botName" 
                            placeholder="Mi Bot de Restaurante"
                            required 
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch name="aiEnabled" id="aiEnabled" />
                          <Label htmlFor="aiEnabled">Habilitar Inteligencia Artificial</Label>
                        </div>

                        <div>
                          <Label htmlFor="aiRole">Rol de la IA</Label>
                          <Input 
                            id="aiRole" 
                            name="aiRole" 
                            placeholder="Asistente de restaurante especializado en comida italiana"
                          />
                        </div>

                        <div>
                          <Label htmlFor="aiInstructions">Instrucciones para la IA</Label>
                          <Textarea 
                            id="aiInstructions" 
                            name="aiInstructions" 
                            placeholder="Eres un asistente amigable que ayuda a los clientes con pedidos, información del menú y horarios. Siempre mantén un tono profesional pero cercano..."
                            rows={4}
                            className="resize-none"
                          />
                        </div>

                        <div>
                          <Label htmlFor="openaiApiKey">API Key de OpenAI (opcional)</Label>
                          <Input 
                            id="openaiApiKey" 
                            name="openaiApiKey" 
                            type="password"
                            placeholder="sk-..."
                          />
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full">
                          {isLoading ? 'Creando...' : 'Crear Bot'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : !isConnected ? (
                <div className="text-center py-8">
                  <div className="mb-6 flex justify-center">
                    <QRCodeDisplay 
                      onRefresh={() => checkBotStatus()}
                      autoRefresh={false}
                      refreshTrigger={qrRefreshTrigger}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleGenerateNewQR} 
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? 'Generando...' : 'Generar nuevo QR'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center mb-4">
                    <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-600 mb-2">¡WhatsApp Conectado!</h3>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">Tu bot está funcionando correctamente</p>
                  
                  <Button 
                    onClick={handleStopBot} 
                    disabled={isLoading}
                    variant="destructive"
                  >
                    {isLoading ? 'Desconectando...' : 'Desconectar WhatsApp'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contenido de la pestaña Mensajes */}
        <TabsContent value="mensajes">
          <div className="py-10 text-center">
            <div className="bg-blue-50 rounded-lg p-8 max-w-2xl mx-auto">
              <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Configuración de Mensajes</h3>
              <p className="text-gray-600 mb-4">En esta sección podrás configurar mensajes automáticos, respuestas predefinidas y personalizar la forma en que tu bot se comunica.</p>
              <p className="text-sm text-blue-600">Próximamente disponible</p>
            </div>
          </div>
        </TabsContent>
        
        {/* Contenido de la pestaña Mi Negocio */}
        <TabsContent value="mi-negocio">
          <BusinessConfig userId={botConfig?.user_id || 0} />
        </TabsContent>
        
        {/* Contenido de la pestaña Promociones */}
        <TabsContent value="promociones">
          <div className="py-10 text-center">
            <div className="bg-orange-50 rounded-lg p-8 max-w-2xl mx-auto">
              <Gift className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Promociones y Campañas</h3>
              <p className="text-gray-600 mb-4">Aquí podrás crear y gestionar tus promociones, descuentos y campañas especiales para enviar a tus clientes por WhatsApp.</p>
              <p className="text-sm text-orange-600">Próximamente disponible</p>
            </div>
          </div>
        </TabsContent>
        
        {/* Contenido de la pestaña Automatización */}
        <TabsContent value="automatizacion">
          <div className="py-10 text-center">
            <div className="bg-purple-50 rounded-lg p-8 max-w-2xl mx-auto">
              <Zap className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Automatizaciones Avanzadas</h3>
              <p className="text-gray-600 mb-4">Configura flujos de conversación automáticos, recordatorios, seguimientos y otras automatizaciones para tu bot de WhatsApp.</p>
              <p className="text-sm text-purple-600">Próximamente disponible</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
