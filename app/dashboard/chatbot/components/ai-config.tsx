'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from '@/hooks/use-toast'
import { saveUserBotConfig } from '@/app/actions/chatbot'

const aiConfigSchema = z.object({
  botName: z.string().min(1, 'El nombre del bot es requerido'), // Añadido botName
  aiEnabled: z.boolean().default(true),
  aiRole: z.string().min(1, 'El rol de la IA es requerido'),
  aiInstructions: z.string().min(1, 'Las instrucciones para la IA son requeridas'),
  openaiApiKey: z.string().optional(), // Usaremos este campo para la clave de Gemini
})

type AiConfigFormValues = z.infer<typeof aiConfigSchema>

export function AiConfig({ initialConfig, userId }: { initialConfig: any, userId: number | undefined }) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AiConfigFormValues>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      botName: initialConfig?.bot_name ?? 'Mi Bot de WhatsApp', // Valor por defecto
      aiEnabled: initialConfig?.ai_enabled ?? true,
      aiRole: initialConfig?.ai_role ?? 'Eres un asistente virtual amigable y profesional de restaurante.',
      aiInstructions: initialConfig?.ai_instructions ?? 'Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante. Mantén un tono cálido y profesional.',
      openaiApiKey: '', // No cargar la API key por seguridad, el usuario la ingresará si quiere cambiarla
    },
  })

  const aiEnabled = watch('aiEnabled')

  const onSubmit = async (data: AiConfigFormValues) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "ID de usuario no disponible para guardar la configuración.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    setLoading(true)
    console.log("Attempting to save AI config with data:", data);
    console.log("User ID for saving config:", userId);
    try {
      const result = await saveUserBotConfig(userId, {
        botName: data.botName, // Pasar botName
        aiEnabled: data.aiEnabled,
        aiRole: data.aiRole,
        aiInstructions: data.aiInstructions,
        openaiApiKey: data.openaiApiKey || undefined, // Enviar undefined si está vacío
      })
      console.log("Result from saveUserBotConfig:", result);
      if (result.success) {
        toast({
          title: 'Configuración de IA actualizada',
          description: 'La configuración de tu IA ha sido guardada exitosamente.',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving AI config:', error)
      toast({
        title: 'Error',
        description: 'Error al guardar la configuración de IA.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Inteligencia Artificial</CardTitle>
        <CardDescription>
          Configura cómo tu chatbot interactúa con los clientes usando IA.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="botName">Nombre del Bot</Label>
            <Input
              id="botName"
              {...register('botName')}
              placeholder="Mi Bot de WhatsApp"
            />
            {errors.botName && <p className="text-red-500 text-sm">{errors.botName.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="aiEnabled"
              checked={aiEnabled}
              onCheckedChange={(checked) => setValue('aiEnabled', checked)}
            />
            <Label htmlFor="aiEnabled">Habilitar Inteligencia Artificial</Label>
          </div>

          {aiEnabled && (
            <>
              <div>
                <Label htmlFor="openaiApiKey">API Key de Gemini</Label>
                <Input
                  id="openaiApiKey"
                  type="password"
                  {...register('openaiApiKey')}
                  placeholder="Ingresa tu API Key de Gemini (ej. AIzaSy...)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Obtén tu API key en{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Google AI Studio
                  </a>
                </p>
              </div>

              <div>
                <Label htmlFor="aiRole">Rol de la IA</Label>
                <Input
                  id="aiRole"
                  {...register('aiRole')}
                  placeholder="Eres un asistente virtual amigable..."
                />
                {errors.aiRole && <p className="text-red-500 text-sm">{errors.aiRole.message}</p>}
              </div>

              <div>
                <Label htmlFor="aiInstructions">Instrucciones para la IA</Label>
                <Textarea
                  id="aiInstructions"
                  {...register('aiInstructions')}
                  placeholder="Responde de manera cordial..."
                  rows={4}
                />
                {errors.aiInstructions && <p className="text-red-500 text-sm">{errors.aiInstructions.message}</p>}
              </div>
            </>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Configuración de IA'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}