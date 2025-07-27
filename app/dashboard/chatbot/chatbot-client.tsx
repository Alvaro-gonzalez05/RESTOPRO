'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageCircle, 
  Phone,
  Settings,
  Zap,
  BarChart3,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Database
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { saveTwilioCredentials, getTwilioCredentials, verifyTwilioCredentials, sendMessage } from '@/app/actions/twilio'
import MessagesConfig from './components/messages-config'
import BusinessConfig from './components/business-config'
import AutomationConfig from './components/automation-config'
// import BusinessConfig from './components/business-config'

interface ChatbotPageProps {
  userId: number
}

interface TwilioConfig {
  account_sid: string
  auth_token: string
  whatsapp_number: string
  webhook_url: string
}

export default function ChatbotClient({ userId }: ChatbotPageProps) {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [whatsappInfo, setWhatsappInfo] = useState<any>(null)
  const [config, setConfig] = useState<TwilioConfig>({
    account_sid: '',
    auth_token: '',
    whatsapp_number: '',
    webhook_url: '',
  })
  const [showTokens, setShowTokens] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [stats, setStats] = useState({
    messagesHoy: 24,
    automatizaciones: 3,
    promociones: 2
  })

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/twilio/webhook` : ''

  useEffect(() => {
    loadCredentials()
  }, [userId])

  const loadCredentials = async () => {
    try {
      const credentials = await getTwilioCredentials(userId)
      if (credentials) {
        setConfig({
          account_sid: credentials.account_sid || '',
          auth_token: credentials.auth_token || '',
          whatsapp_number: credentials.whatsapp_number || '',
          webhook_url: credentials.webhook_url || '',
        })
        setConnectionStatus('disconnected')
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Error loading credentials:', error)
      setConnectionStatus('error')
    }
  }

  const setupDatabase = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/setup-database', { method: 'POST' })
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Éxito",
          description: "Base de datos configurada correctamente",
        })
        setNeedsSetup(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al configurar base de datos",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al configurar base de datos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Texto copiado al portapapeles",
    })
  }

  const testConnection = async () => {
    setIsLoading(true)
    setConnectionStatus('connecting')
    
    try {
      const result = await verifyTwilioCredentials(userId)
      
      if (result.success) {
        setConnectionStatus('connected')
        toast({
          title: "Éxito",
          description: "Conexión exitosa con Twilio",
        })
      } else {
        setConnectionStatus('error')
        toast({
          title: "Error",
          description: result.message || "Error al conectar con Twilio",
          variant: "destructive",
        })
      }
    } catch (error) {
      setConnectionStatus('error')
      toast({
        title: "Error",
        description: "Error al probar conexión",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfiguration = async () => {
    if (!config.account_sid || !config.auth_token || !config.whatsapp_number) {
      toast({
        title: "Error",
        description: "Los campos Account SID, Auth Token y Número de WhatsApp son obligatorios",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    try {
      const result = await saveTwilioCredentials({
        user_id: userId,
        account_sid: config.account_sid,
        auth_token: config.auth_token,
        whatsapp_number: config.whatsapp_number,
      })
      
      if (result.success) {
        toast({
          title: "Éxito",
          description: "Configuración guardada exitosamente",
        })
        await loadCredentials() // Recargar credenciales
        
        // Probar conexión automáticamente después de guardar
        if (config.account_sid && config.auth_token) {
          setTimeout(() => testConnection(), 1000)
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Error al guardar configuración",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar configuración",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendTestMessage = async () => {
    console.log('sendTestMessage called with:', { testPhone, testMessage, userId })
    
    if (!testPhone || !testMessage) {
      toast({
        title: "Error",
        description: "Ingresa un número de teléfono y mensaje",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    try {
      console.log('Calling sendMessage with:', { userId, testPhone, testMessage })
      const result = await sendMessage(userId, testPhone, testMessage)
      console.log('sendMessage result:', result)
      
      if (result.success) {
        toast({
          title: "Éxito",
          description: "Mensaje enviado correctamente",
        })
        setTestMessage('')
        setTestPhone('')
      } else {
        toast({
          title: "Error",
          description: result.message || "Error al enviar mensaje",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al enviar mensaje",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addDemoConversation = async () => {
    try {
      const demoPhones = [
        { phone: '1234567890', name: 'María García' },
        { phone: '0987654321', name: 'Juan Pérez' },
        { phone: '1122334455', name: 'Ana López' },
        { phone: '5566778899', name: 'Carlos Rodríguez' }
      ]
      
      const randomDemo = demoPhones[Math.floor(Math.random() * demoPhones.length)]
      
      // Simular agregación de conversación demo
      setStats(prev => ({ ...prev, messagesHoy: prev.messagesHoy + 1 }))
      
      toast({
        title: "Conversación Demo Agregada",
        description: `Nueva conversación con ${randomDemo.name}`,
      })
    } catch (error) {
      console.error('Error adding demo conversation:', error)
    }
  }

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-500" />,
          text: 'Conectado',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'connecting':
        return {
          icon: <AlertCircle className="h-6 w-6 text-yellow-500" />,
          text: 'Conectando...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        }
      case 'error':
        return {
          icon: <XCircle className="h-6 w-6 text-red-500" />,
          text: 'Error de Conexión',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      default:
        return {
          icon: <XCircle className="h-6 w-6 text-gray-500" />,
          text: 'Desconectado',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const statusInfo = getStatusInfo()

  if (needsSetup) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Configuración Inicial Requerida
            </CardTitle>
            <CardDescription>
              Es necesario configurar la base de datos antes de continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={setupDatabase} disabled={isLoading}>
              {isLoading ? 'Configurando...' : 'Configurar Base de Datos'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            Chatbot de WhatsApp con Twilio
          </h1>
          <p className="text-gray-600 mt-2">
            Automatiza la atención al cliente con WhatsApp usando Twilio API
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Estado</p>
                <p className={`text-2xl font-bold ${statusInfo.color}`}>
                  {statusInfo.text}
                </p>
              </div>
              {statusInfo.icon}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mensajes Hoy</p>
                <p className="text-2xl font-bold text-blue-600">{stats.messagesHoy}</p>
              </div>
              <MessageCircle className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Automatizaciones</p>
                <p className="text-2xl font-bold text-purple-600">{stats.automatizaciones}</p>
              </div>
              <Zap className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promociones</p>
                <p className="text-2xl font-bold text-orange-600">{stats.promociones}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración del Chatbot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="api-config" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="api-config">
                <Smartphone className="h-4 w-4 mr-1" />
                API Config
              </TabsTrigger>
              <TabsTrigger value="webhook">
                <ExternalLink className="h-4 w-4 mr-1" />
                Webhook
              </TabsTrigger>
              <TabsTrigger value="pruebas">
                <CheckCircle className="h-4 w-4 mr-1" />
                Pruebas
              </TabsTrigger>
              <TabsTrigger value="mensajes">
                <MessageCircle className="h-4 w-4 mr-1" />
                Mensajes
              </TabsTrigger>
              <TabsTrigger value="mi-negocio">
                <Settings className="h-4 w-4 mr-1" />
                Mi Negocio
              </TabsTrigger>
              <TabsTrigger value="automatizacion">
                <Zap className="h-4 w-4 mr-1" />
                Automatización
              </TabsTrigger>
            </TabsList>

            {/* Tab de Configuración API */}
            <TabsContent value="api-config" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>📱</span>
                    Credenciales de Twilio
                  </CardTitle>
                  <CardDescription>
                    Obtén estas credenciales desde tu Console de Twilio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="account_sid">Account SID *</Label>
                      <Input
                        id="account_sid"
                        value={config.account_sid}
                        onChange={(e) => setConfig(prev => ({ ...prev, account_sid: e.target.value }))}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auth_token">Auth Token *</Label>
                      <div className="relative">
                        <Input
                          id="auth_token"
                          type={showTokens ? 'text' : 'password'}
                          value={config.auth_token}
                          onChange={(e) => setConfig(prev => ({ ...prev, auth_token: e.target.value }))}
                          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowTokens(!showTokens)}
                        >
                          {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="whatsapp_number">Número de WhatsApp *</Label>
                    <Input
                      id="whatsapp_number"
                      value={config.whatsapp_number}
                      onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                      placeholder="+1234567890"
                    />
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Los campos marcados con * son obligatorios para el funcionamiento básico del chatbot.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button onClick={saveConfiguration} disabled={isLoading}>
                      {isLoading ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab de Webhook */}
            <TabsContent value="webhook" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>🔗</span>
                    Configuración de Webhook
                  </CardTitle>
                  <CardDescription>
                    Configura el webhook en tu consola de Twilio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL del Webhook</Label>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(webhookUrl)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Instrucciones:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Ve a tu <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Consola de Twilio</a></li>
                        <li>Navega a Messaging → Try it out → Send a WhatsApp message</li>
                        <li>Configura tu Sandbox de WhatsApp</li>
                        <li>En la configuración del Sandbox, pega la URL del webhook: <code className="bg-gray-100 px-1 rounded">{webhookUrl}</code></li>
                        <li>Asegúrate de que el método HTTP esté configurado como POST</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab de Pruebas */}
            <TabsContent value="pruebas" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>🧪</span>
                    Probar Conexión
                  </CardTitle>
                  <CardDescription>
                    Verifica que tu configuración de Twilio funcione correctamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge 
                      variant={
                        connectionStatus === 'connected' ? 'default' : 
                        connectionStatus === 'connecting' ? 'secondary' : 
                        connectionStatus === 'error' ? 'destructive' : 'outline'
                      }
                    >
                      {connectionStatus === 'connected' && <CheckCircle className="w-4 h-4 mr-1" />}
                      {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 mr-1" />}
                      {connectionStatus === 'connected' ? 'Conectado' : 
                       connectionStatus === 'connecting' ? 'Conectando...' : 
                       connectionStatus === 'error' ? 'Error' : 'Desconectado'}
                    </Badge>
                    
                    <Button 
                      onClick={testConnection} 
                      disabled={isLoading || !config.account_sid}
                      variant="outline"
                    >
                      {isLoading ? 'Probando...' : 'Probar Conexión'}
                    </Button>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      La prueba de conexión verifica que tu Account SID y Auth Token sean válidos.
                    </AlertDescription>
                  </Alert>

                  {connectionStatus === 'connected' && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        ¡Perfecto! Tu chatbot de WhatsApp con Twilio está listo para recibir y enviar mensajes.
                      </AlertDescription>
                    </Alert>
                  )}

                  {connectionStatus === 'error' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Revisa tus credenciales de Twilio e intenta nuevamente. Asegúrate de que el Account SID y Auth Token sean correctos.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Sección de envío de mensaje de prueba */}
                  {connectionStatus === 'connected' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Enviar Mensaje de Prueba</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="test_phone">Número de teléfono (con código de país)</Label>
                          <Input
                            id="test_phone"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="+1234567890"
                          />
                        </div>
                        <div>
                          <Label htmlFor="test_message">Mensaje</Label>
                          <Input
                            id="test_message"
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Hola, este es un mensaje de prueba!"
                          />
                        </div>
                        <Button 
                          onClick={sendTestMessage}
                          disabled={isLoading || !testPhone || !testMessage}
                        >
                          {isLoading ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Demo Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Modo Demo</h4>
                    <p className="text-sm text-blue-600 mb-3">
                      Mientras configuramos Twilio, puedes probar el chatbot con conversaciones de demostración.
                    </p>
                    <Button
                      onClick={addDemoConversation}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-300 hover:bg-blue-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Conversación Demo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mensajes" className="mt-6">
              <MessagesConfig userId={userId} />
            </TabsContent>

            <TabsContent value="mi-negocio" className="mt-6">
              <BusinessConfig userId={userId} />
            </TabsContent>

            <TabsContent value="automatizacion" className="mt-6">
              <AutomationConfig userId={userId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
