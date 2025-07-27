
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Smartphone } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { connectWhatsApp, disconnectWhatsApp, getWhatsAppConnection } from '@/app/actions/chatbot'
import { toast } from '@/hooks/use-toast'

export function QRCodeDisplay({ connection: initialConnection, userId }: { connection: any, userId: number | undefined }) {
  const [connection, setConnection] = useState(initialConnection)
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(initialConnection?.qr_code || null) // Inicializar qrCode desde initialConnection
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Efecto para actualizar qrCode si initialConnection cambia (ej. al cargar la página)
  useEffect(() => {
    if (initialConnection?.status === 'connecting' && initialConnection.qr_code) {
      setQrCode(initialConnection.qr_code);
    }
    // Si ya está conectado, limpiar cualquier código QR
    if (initialConnection?.status === 'connected') {
      setQrCode(null);
    }
  }, [initialConnection]);

  // Mecanismo de polling para obtener el estado de la conexión y el código QR
  useEffect(() => {
    if (connection?.status === 'connecting' && !pollingInterval) {
      const interval = setInterval(async () => {
        if (!userId) return;
        const updatedConnection = await getWhatsAppConnection(userId);
        if (updatedConnection) {
          setConnection(updatedConnection);
          if (updatedConnection.qr_code) {
            console.log("Polling: QR code received from DB:", updatedConnection.qr_code.substring(0, 50) + '...');
            setQrCode(updatedConnection.qr_code);
            // Detener el polling una vez que se recibe el código QR
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
          } else if (updatedConnection.status === 'connected') {
            // Detener el polling si se conecta sin QR (ej. reconectado desde la sesión)
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
          }
        }
      }, 3000); // Sondear cada 3 segundos
      setPollingInterval(interval);
    } else if (connection?.status !== 'connecting' && pollingInterval) {
      // Detener el polling si el estado ya no es 'connecting'
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [connection?.status, userId, pollingInterval]);


  const handleConnect = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "ID de usuario no disponible.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Llamada inicial para iniciar la instancia de Baileys
      const result = await connectWhatsApp(userId)
      console.log("Result from connectWhatsApp (frontend):", result);
      if (result.success) {
        toast({
          title: 'Conectando...',
          description: 'Escanea el código QR para conectar tu WhatsApp.',
        })
        setConnection(result.data) // Actualizar el estado de la conexión
        // El useEffect para el polling se encargará de esto
        if (result.data.qr_code) {
          // Si el QR está disponible inmediatamente (menos común pero posible)
          console.log("Setting QR code from initial connect result (frontend):", result.data.qr_code.substring(0, 50) + '...');
          setQrCode(result.data.qr_code);
        }
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error in handleConnect (frontend):', error);
      toast({
        title: 'Error',
        description: 'Error al iniciar la conexión.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "ID de usuario no disponible.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const result = await disconnectWhatsApp(userId)
      if (result.success) {
        toast({
          title: 'Desconectado',
          description: 'Tu cuenta de WhatsApp ha sido desconectada.',
        })
        setConnection(null)
        setQrCode(null)
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al desconectar la cuenta.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (connection?.status === 'connected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-500" />
            Conectado
          </CardTitle>
          <CardDescription>
            Tu cuenta de WhatsApp está conectada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Número de teléfono: {connection.phone_number}</p>
          <Button onClick={handleDisconnect} disabled={loading} variant="destructive" className="mt-4">
            Desconectar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Código QR</CardTitle>
          <CardDescription>
            Escanea este código con WhatsApp para conectar tu bot
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="bg-white p-4 rounded-lg">
            {/* Asegurarse de que qrCode es una data URL válida */}
            <img src={qrCode} alt="Código QR" className="w-48 h-48" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar a WhatsApp</CardTitle>
        <CardDescription>
          Conecta tu cuenta de WhatsApp para activar el chatbot.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>¡Importante!</strong> Necesitas una cuenta de WhatsApp Business para conectarte.
          </AlertDescription>
        </Alert>
        <Button onClick={handleConnect} disabled={loading} className="mt-4 w-full">
          Generar código QR
        </Button>
      </CardContent>
    </Card>
  )
}
