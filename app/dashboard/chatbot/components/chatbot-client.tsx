
'use client'

import { useState, useEffect } from 'react'
import {
  Circle,
  MessageSquare,
  Wand2,
  Zap,
  Settings,
  Smartphone,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppConnection,
} from '@/app/actions/chatbot'

import { BusinessInfo } from './business-info'
import { BotConfigForm } from './bot-config-form'

// Tipos para evitar 'any'
interface Connection {
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  qr_code?: string | null
  phone_number?: string
}

interface ChatbotDashboardClientProps {
  initialConnection: Connection | null
  userId: number | undefined
  businessInfo: any // Añadimos la prop para la información del negocio
  userBotConfig: any // Añadimos la prop para la configuración del bot
}

export function ChatbotDashboardClient({ initialConnection, userId, businessInfo, userBotConfig }: ChatbotDashboardClientProps) {
  const [activeTab, setActiveTab] = useState('Conexión')
  const [connection, setConnection] = useState<Connection | null>(initialConnection)
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(initialConnection?.qr_code || null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isConnected = connection?.status === 'connected'

  useEffect(() => {
    setConnection(initialConnection)
    if (initialConnection?.status === 'connecting' && initialConnection.qr_code) {
      setQrCode(initialConnection.qr_code)
    }
    if (initialConnection?.status === 'connected') {
      setQrCode(null)
    }
  }, [initialConnection])

  useEffect(() => {
    // Detener el polling si el componente se desmonta
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Iniciar la conexión cuando el modal se abre
  useEffect(() => {
    if (isModalOpen && !loading && connection?.status !== 'connected') {
      handleConnect();
    }
  }, [isModalOpen]);

  const startPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval) // Limpiar intervalo existente

    const interval = setInterval(async () => {
      if (!userId) return
      try {
        const updatedConnection = await getWhatsAppConnection(userId)
        if (updatedConnection) {
          setConnection(updatedConnection)
          if (updatedConnection.status === 'connected') {
            setQrCode(null)
            if (pollingInterval) clearInterval(pollingInterval)
            setPollingInterval(null)
            toast({ title: 'Éxito', description: 'WhatsApp conectado correctamente.' })
          } else if (updatedConnection.qr_code) {
            setQrCode(updatedConnection.qr_code)
          }
        }
      } catch (error) {
        console.error("Error during polling:", error)
        if (pollingInterval) clearInterval(pollingInterval)
        setPollingInterval(null)
      }
    }, 5000) // Polling cada 5 segundos

    setPollingInterval(interval)
  }

  const handleConnect = async () => {
    if (!userId) {
      toast({ title: 'Error', description: 'ID de usuario no disponible.', variant: 'destructive' })
      return
    }

    setLoading(true)
    setQrCode(null) // Limpiar QR anterior
    setIsModalOpen(true) // Abrir el modal al iniciar la conexión
    try {
      const result = await connectWhatsApp(userId)
      if (result.success && result.data) {
        setConnection(result.data)
        if (result.data.qr_code) {
          setQrCode(result.data.qr_code)
        }
        toast({ title: 'Conectando...', description: 'Escanea el código QR para conectar tu WhatsApp.' })
        startPolling() // Iniciar polling después de solicitar la conexión
      } else {
        toast({ title: 'Error', description: result.error || 'No se pudo iniciar la conexión.', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al iniciar la conexión.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!userId) {
      toast({ title: 'Error', description: 'ID de usuario no disponible.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      if (pollingInterval) clearInterval(pollingInterval) // Detener polling al desconectar
      setPollingInterval(null)

      const result = await disconnectWhatsApp(userId)
      if (result.success) {
        toast({ title: 'Desconectado', description: 'Tu cuenta de WhatsApp ha sido desconectada.' })
        setConnection(null)
        setQrCode(null)
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al desconectar la cuenta.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Conexión':
        return (
          <Card className="bg-white p-6">
            <CardTitle>Conectar WhatsApp Business</CardTitle>
            <CardDescription>
              Escanea el código QR con tu WhatsApp Business para conectar tu cuenta.
            </CardDescription>
            <div className="flex justify-between items-center my-6">
              <p className="font-medium">Estado de WhatsApp</p>
              {isConnected ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <Circle fill="currentColor" className="h-3 w-3 mr-2 text-green-500" />
                  Conectado
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  <Circle fill="currentColor" className="h-3 w-3 mr-2 text-red-500" />
                  Desconectado
                </span>
              )}
            </div>

            {isConnected ? (
              <div>
                <p>Número de teléfono: <strong>{connection.phone_number || 'No disponible'}</strong></p>
                <Button onClick={handleDisconnect} disabled={loading} variant="destructive" className="mt-4">
                  Desconectar
                </Button>
              </div>
            ) : (
              <>
                <AlertDialog open={isModalOpen || (connection?.status === 'connecting' && qrCode !== null)} onOpenChange={setIsModalOpen}>
                  <AlertDialogTrigger asChild>
                    <Button onClick={() => setIsModalOpen(true)} disabled={loading} className="w-full bg-gray-800 text-white hover:bg-gray-900">
                      Conectar WhatsApp
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Conectar WhatsApp</AlertDialogTitle>
                      <AlertDialogDescription>
                        {loading && !qrCode && "Generando código QR, por favor espera..."}
                        {qrCode && "Escanea el código QR con tu WhatsApp para conectar tu cuenta."}
                        {!loading && !qrCode && connection?.status === 'disconnected' && "Haz clic en conectar para generar el código QR."}
                        {!loading && !qrCode && connection?.status === 'connecting' && "Esperando código QR..."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-center items-center">
                      {console.log("QR Code in modal:", qrCode)} {/* Debug log */}
                      {qrCode ? (
                        <img src={qrCode} alt="Código QR de WhatsApp" className="w-64 h-64" />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                          <Smartphone className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <AlertDialogFooter>
                      <Button variant="outline" onClick={() => {
                        setIsModalOpen(false);
                        if (pollingInterval) {
                          clearInterval(pollingInterval);
                          setPollingInterval(null);
                        }
                      }}>Cerrar</Button>
                      <Button onClick={handleConnect} disabled={loading}>Generar otro QR</Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </Card>
        )
      case 'Mensajes':
        return <div className="p-6"><h2 className="text-xl font-bold">Sección de Mensajes en construcción</h2></div>
      case 'Mi Negocio':
        return <BusinessInfo businessInfo={businessInfo} />
      case 'Promociones':
        return <div className="p-6"><h2 className="text-xl font-bold">Sección de Promociones en construcción</h2></div>
      case 'Automatización':
        return <div className="p-6"><h2 className="text-xl font-bold">Sección de Automatización en construcción</h2></div>
      case 'Mi Bot':
        case 'Mi Bot':
        return <BotConfigForm userId={userId} initialConfig={userBotConfig} />
      default:
        return null
    }
  }

  const tabs = ['Conexión', 'Mensajes', 'Mi Negocio', 'Promociones', 'Automatización', 'Mi Bot']

  return (
    <div className="">
      {/* Títulos */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Chatbot de WhatsApp</h2>
        <p className="text-gray-500">
          Automatiza la atención al cliente y mejora las ventas con inteligencia artificial
        </p>
      </div>

      {/* Panel de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Tarjeta 1: Estado */}
        <Card className="shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <Circle className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} fill="currentColor" />
            <div>
              <p className="text-sm text-gray-600">Estado</p>
              <p className={`font-bold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
          </CardContent>
        </Card>
        {/* Tarjeta 2: Mensajes Hoy */}
        <Card className="shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <MessageSquare className="h-7 w-7 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Mensajes Hoy</p>
              <p className="text-2xl font-bold">24</p>
            </div>
          </CardContent>
        </Card>
        {/* Tarjeta 3: Automatizaciones */}
        <Card className="shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <Wand2 className="h-7 w-7 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">Automatizaciones</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </CardContent>
        </Card>
        {/* Tarjeta 4: Promociones */}
        <Card className="shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <Zap className="h-7 w-7 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Promociones</p>
              <p className="text-2xl font-bold">2</p>
            </div>
          </CardContent>
        </Card>
        
      </div>

      {/* Sistema de Pestañas */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido Condicional de las Pestañas */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  )
}
