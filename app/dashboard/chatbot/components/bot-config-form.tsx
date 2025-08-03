
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { saveUserBotConfig } from '@/app/actions/chatbot'

const botConfigSchema = z.object({
  botName: z.string().min(1, "El nombre del bot es requerido"),
  aiEnabled: z.boolean(),
  aiRole: z.string().min(1, "El rol de la IA es requerido"),
  aiInstructions: z.string().min(1, "Las instrucciones de la IA son requeridas"),
  openaiApiKey: z.string().optional(),
})

type BotConfigFormValues = z.infer<typeof botConfigSchema>

interface BotConfigFormProps {
  userId: number
  initialConfig: any // user_bots data
}

export function BotConfigForm({ userId, initialConfig }: BotConfigFormProps) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<BotConfigFormValues>({
    resolver: zodResolver(botConfigSchema),
    defaultValues: {
      botName: initialConfig?.bot_name || '',
      aiEnabled: initialConfig?.ai_enabled ?? true,
      aiRole: initialConfig?.ai_role || 'Eres un asistente virtual amigable y profesional de restaurante.',
      aiInstructions: initialConfig?.ai_instructions || 'Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante. Mantén un tono cálido y profesional.',
      openaiApiKey: initialConfig?.openai_api_key || '',
    },
  })

  const onSubmit = async (data: BotConfigFormValues) => {
    setLoading(true)
    try {
      // Mapear de camelCase a snake_case antes de enviar
      const dataToSend = {
        bot_name: data.botName,
        ai_enabled: data.aiEnabled,
        ai_role: data.aiRole,
        ai_instructions: data.aiInstructions,
        openai_api_key: data.openaiApiKey,
      };

      const result = await saveUserBotConfig(userId, dataToSend as any) // Usamos `as any` para evitar problemas de tipo en el mapeo
      if (result.success) {
        toast.success('Configuración del bot actualizada correctamente')
      } else {
        toast.error(result.error || 'Error al actualizar la configuración del bot')
      }
    } catch (error) {
      console.error('Error saving bot config:', error)
      toast.error('Error al guardar la configuración del bot')
    } finally {
      setLoading(false)
    }
  }

  const aiEnabled = watch('aiEnabled')

  return (
    <Card className="bg-white p-6">
      <CardHeader>
        <CardTitle>Configuración de Mi Bot</CardTitle>
        <CardDescription>
          Personaliza el comportamiento y la inteligencia artificial de tu bot de WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="botName">Nombre del Bot</Label>
            <Input id="botName" {...register('botName')} />
            {errors.botName && <p className="text-red-500 text-sm">{errors.botName.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="aiEnabled" {...register('aiEnabled')} checked={aiEnabled} />
            <Label htmlFor="aiEnabled">Habilitar Inteligencia Artificial</Label>
          </div>

          {aiEnabled && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="aiRole">Rol de la IA</Label>
                <Textarea 
                  id="aiRole" 
                  {...register('aiRole')}
                  placeholder="Ej: Eres un asistente virtual amigable y profesional de restaurante."
                />
                {errors.aiRole && <p className="text-red-500 text-sm">{errors.aiRole.message}</p>}
              </div>

              <div>
                <Label htmlFor="aiInstructions">Instrucciones de la IA</Label>
                <Textarea 
                  id="aiInstructions" 
                  {...register('aiInstructions')}
                  placeholder="Ej: Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante."
                  rows={5}
                />
                {errors.aiInstructions && <p className="text-red-500 text-sm">{errors.aiInstructions.message}</p>}
              </div>

              <div>
                <Label htmlFor="openaiApiKey">Clave API de Gemini (opcional)</Label>
                <Input 
                  id="openaiApiKey" 
                  type="password" 
                  {...register('openaiApiKey')}
                  placeholder="Ingresa tu clave API de Gemini"
                />
                {errors.openaiApiKey && <p className="text-red-500 text-sm">{errors.openaiApiKey.message}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Necesaria para usar la IA. Puedes obtener una en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>.
                </p>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
