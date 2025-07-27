'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Save, X, Info, Copy } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getChatbotMessages, saveChatbotMessage, deleteChatbotMessage, type ChatbotMessage } from '@/app/actions/chatbot-config'

interface Props {
  userId: number
}

export default function MessagesConfig({ userId }: Props) {
  const [messages, setMessages] = useState<ChatbotMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingMessage, setEditingMessage] = useState<ChatbotMessage | null>(null)
  const [newMessage, setNewMessage] = useState<Partial<ChatbotMessage>>({
    user_id: userId,
    category: 'saludo',
    trigger_keywords: [],
    message_text: '',
    has_options: false,
    options: [],
    is_active: true
  })

  const categories = [
    { value: 'saludo', label: 'Saludo' },
    { value: 'despedida', label: 'Despedida' },
    { value: 'informacion', label: 'Información' },
    { value: 'productos', label: 'Productos' },
    { value: 'precios', label: 'Precios' },
    { value: 'horarios', label: 'Horarios' },
    { value: 'ubicacion', label: 'Ubicación' },
    { value: 'contacto', label: 'Contacto' },
    { value: 'promociones', label: 'Promociones' },
    { value: 'soporte', label: 'Soporte' },
    { value: 'otros', label: 'Otros' }
  ]

  // Variables disponibles para usar en los mensajes
  const availableVariables = [
    { 
      variable: '{nombre}', 
      description: 'Nombre del cliente (si está registrado)' 
    },
    { 
      variable: '{puntos}', 
      description: 'Puntos acumulados del cliente' 
    },
    { 
      variable: '{negocio_nombre}', 
      description: 'Nombre de tu negocio' 
    },
    { 
      variable: '{menu_link}', 
      description: 'Enlace al menú digital' 
    },
    { 
      variable: '{direccion}', 
      description: 'Dirección del negocio' 
    },
    { 
      variable: '{telefono}', 
      description: 'Teléfono del negocio' 
    },
    { 
      variable: '{email}', 
      description: 'Email del negocio' 
    },
    { 
      variable: '{website}', 
      description: 'Sitio web del negocio' 
    },
    { 
      variable: '{horarios}', 
      description: 'Horarios de atención formateados' 
    }
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: `Variable ${text} copiada al portapapeles`
    })
  }

  useEffect(() => {
    loadMessages()
  }, [userId])

  const loadMessages = async () => {
    setIsLoading(true)
    try {
      const data = await getChatbotMessages(userId)
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (message: ChatbotMessage) => {
    setIsLoading(true)
    try {
      const result = await saveChatbotMessage(message)
      if (result.success) {
        toast({ title: "Éxito", description: result.message })
        await loadMessages()
        setEditingMessage(null)
        setNewMessage({
          user_id: userId,
          category: 'saludo',
          trigger_keywords: [],
          message_text: '',
          has_options: false,
          options: [],
          is_active: true
        })
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al guardar mensaje", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (messageId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return
    
    setIsLoading(true)
    try {
      const result = await deleteChatbotMessage(messageId, userId)
      if (result.success) {
        toast({ title: "Éxito", description: result.message })
        await loadMessages()
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al eliminar mensaje", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const parseKeywords = (keywords: string): string[] => {
    return keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
  }

  const addOption = (message: Partial<ChatbotMessage>) => {
    const newOption = {
      id: Date.now().toString(),
      text: '',
      response_text: ''
    }
    
    if (message === newMessage) {
      setNewMessage(prev => ({
        ...prev,
        options: [...(prev.options || []), newOption]
      }))
    } else if (editingMessage) {
      setEditingMessage(prev => prev ? {
        ...prev,
        options: [...(prev.options || []), newOption]
      } : null)
    }
  }

  const removeOption = (message: Partial<ChatbotMessage>, optionId: string) => {
    if (message === newMessage) {
      setNewMessage(prev => ({
        ...prev,
        options: (prev.options || []).filter(opt => opt.id !== optionId)
      }))
    } else if (editingMessage) {
      setEditingMessage(prev => prev ? {
        ...prev,
        options: (prev.options || []).filter(opt => opt.id !== optionId)
      } : null)
    }
  }

  const updateOption = (message: Partial<ChatbotMessage>, optionId: string, field: 'text' | 'response_text', value: string) => {
    if (message === newMessage) {
      setNewMessage(prev => ({
        ...prev,
        options: (prev.options || []).map(opt => 
          opt.id === optionId ? { ...opt, [field]: value } : opt
        )
      }))
    } else if (editingMessage) {
      setEditingMessage(prev => prev ? {
        ...prev,
        options: (prev.options || []).map(opt => 
          opt.id === optionId ? { ...opt, [field]: value } : opt
        )
      } : null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Agregar nuevo mensaje */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar Nuevo Mensaje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Categoría</Label>
              <Select 
                value={newMessage.category} 
                onValueChange={(value) => setNewMessage(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Palabras clave (separadas por coma)</Label>
              <Input
                placeholder="hola, buenos dias, saludos"
                onChange={(e) => setNewMessage(prev => ({ 
                  ...prev, 
                  trigger_keywords: parseKeywords(e.target.value) 
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 <strong>IA Inteligente:</strong> No necesitas todas las variaciones. La IA también detectará automáticamente mensajes relacionados con la categoría seleccionada.
              </p>
            </div>
          </div>
          
          <div>
            <Label>Mensaje de respuesta</Label>
            <Textarea
              placeholder="¡Hola! Bienvenido a nuestro negocio. ¿En qué puedo ayudarte?"
              value={newMessage.message_text}
              onChange={(e) => setNewMessage(prev => ({ ...prev, message_text: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Configuración de opciones/botones */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={newMessage.has_options || false}
                onCheckedChange={(checked) => setNewMessage(prev => ({ 
                  ...prev, 
                  has_options: checked,
                  options: checked ? (prev.options || []) : []
                }))}
              />
              <Label>Incluir botones de opciones</Label>
            </div>

            {newMessage.has_options && (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Configurar Opciones/Botones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(newMessage.options || []).map((option) => (
                    <div key={option.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white border rounded">
                      <div>
                        <Label className="text-xs">Texto del botón</Label>
                        <Input
                          placeholder="Ver menú"
                          value={option.text}
                          onChange={(e) => updateOption(newMessage, option.id, 'text', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Respuesta cuando se presiona</Label>
                        <Textarea
                          placeholder="Aquí tienes nuestro menú completo..."
                          value={option.response_text}
                          onChange={(e) => updateOption(newMessage, option.id, 'response_text', e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => removeOption(newMessage, option.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar opción
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => addOption(newMessage)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar opción
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Variables disponibles */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Variables Disponibles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                Haz clic en cualquier variable para copiarla y úsala en tu mensaje:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableVariables.map((item) => (
                  <div 
                    key={item.variable}
                    className="flex items-center justify-between bg-white border rounded p-2 hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => copyToClipboard(item.variable)}
                  >
                    <div>
                      <code className="text-xs font-mono text-blue-700">{item.variable}</code>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                <p className="text-xs text-amber-800">
                  <strong>Ejemplo:</strong> "¡Hola {'{nombre}'}! Bienvenido a {'{negocio_nombre}'}. Tienes {'{puntos}'} puntos acumulados."
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Información sobre IA inteligente */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                🤖 IA Inteligente Activada
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-green-700 mb-2">
                Tu chatbot usa IA avanzada para entender la intención del cliente, no solo palabras exactas:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded border">
                  <strong>Saludo:</strong> "que tal", "como están", "buenos días"
                </div>
                <div className="bg-white p-2 rounded border">
                  <strong>Productos:</strong> "quiero comer", "qué tienen", "opciones"
                </div>
                <div className="bg-white p-2 rounded border">
                  <strong>Horarios:</strong> "a qué hora abren", "cuando cierran"
                </div>
                <div className="bg-white p-2 rounded border">
                  <strong>Ubicación:</strong> "dónde están", "cómo llego"
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={newMessage.is_active}
              onCheckedChange={(checked) => setNewMessage(prev => ({ ...prev, is_active: checked }))}
            />
            <Label>Mensaje activo</Label>
          </div>
          
          <Button 
            onClick={() => handleSave(newMessage as ChatbotMessage)}
            disabled={isLoading || !newMessage.message_text || !newMessage.trigger_keywords?.length}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Mensaje
          </Button>
        </CardContent>
      </Card>

      {/* Lista de mensajes */}
      <Card>
        <CardHeader>
          <CardTitle>Mensajes Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="border rounded-lg p-4">
                {editingMessage?.id === message.id ? (
                  // Modo edición
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Categoría</Label>
                        <Select 
                          value={editingMessage?.category || ''} 
                          onValueChange={(value) => setEditingMessage(prev => prev ? { ...prev, category: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Palabras clave</Label>
                        <Input
                          value={editingMessage?.trigger_keywords.join(', ') || ''}
                          onChange={(e) => setEditingMessage(prev => prev ? { 
                            ...prev, 
                            trigger_keywords: parseKeywords(e.target.value) 
                          } : null)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Mensaje</Label>
                      <Textarea
                        value={editingMessage?.message_text || ''}
                        onChange={(e) => setEditingMessage(prev => prev ? { ...prev, message_text: e.target.value } : null)}
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingMessage?.is_active || false}
                          onCheckedChange={(checked) => setEditingMessage(prev => prev ? { ...prev, is_active: checked } : null)}
                        />
                        <Label>Activo</Label>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => editingMessage && handleSave(editingMessage)}>
                          <Save className="h-4 w-4 mr-1" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingMessage(null)}>
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Modo vista
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {categories.find(c => c.value === message.category)?.label}
                        </Badge>
                        {message.is_active ? (
                          <Badge variant="default">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Palabras clave:</strong> {message.trigger_keywords.join(', ')}
                      </p>
                      
                      <p className="text-sm">{message.message_text}</p>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => setEditingMessage(message)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => message.id && handleDelete(message.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay mensajes configurados aún
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
