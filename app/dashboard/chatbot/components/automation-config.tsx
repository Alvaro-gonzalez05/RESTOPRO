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
import { Plus, Edit, Trash2, Save, X, Zap, Clock, MessageSquare, Target } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getAutomationRules, saveAutomationRule, deleteAutomationRule, type AutomationRule } from '@/app/actions/chatbot-config'

interface Props {
  userId: number
}

export default function AutomationConfig({ userId }: Props) {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    user_id: userId,
    name: '',
    trigger_type: 'keyword',
    trigger_conditions: {},
    action_type: 'send_message',
    action_data: {},
    is_active: true
  })

  const triggerTypes = [
    { value: 'keyword', label: 'Palabra clave' },
    { value: 'time_based', label: 'Basado en tiempo' },
    { value: 'user_action', label: 'Acción del usuario' },
    { value: 'business_hours', label: 'Horario comercial' },
    { value: 'no_response', label: 'Sin respuesta' }
  ]

  const actionTypes = [
    { value: 'send_message', label: 'Enviar mensaje' },
    { value: 'forward_to_human', label: 'Transferir a humano' },
    { value: 'collect_info', label: 'Recopilar información' },
    { value: 'schedule_followup', label: 'Programar seguimiento' },
    { value: 'save_lead', label: 'Guardar como lead' }
  ]

  useEffect(() => {
    loadRules()
  }, [userId])

  const loadRules = async () => {
    setIsLoading(true)
    try {
      const data = await getAutomationRules(userId)
      setRules(data)
    } catch (error) {
      console.error('Error loading automation rules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (rule: AutomationRule) => {
    setIsLoading(true)
    try {
      const result = await saveAutomationRule(rule)
      if (result.success) {
        toast({ title: "Éxito", description: result.message })
        await loadRules()
        setEditingRule(null)
        setNewRule({
          user_id: userId,
          name: '',
          trigger_type: 'keyword',
          trigger_conditions: {},
          action_type: 'send_message',
          action_data: {},
          is_active: true
        })
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al guardar regla", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (ruleId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta regla?')) return
    
    setIsLoading(true)
    try {
      const result = await deleteAutomationRule(ruleId, userId)
      if (result.success) {
        toast({ title: "Éxito", description: result.message })
        await loadRules()
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al eliminar regla", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const updateTriggerCondition = (key: string, value: any, isEditing = false) => {
    if (isEditing && editingRule) {
      setEditingRule(prev => prev ? {
        ...prev,
        trigger_conditions: { ...prev.trigger_conditions, [key]: value }
      } : null)
    } else {
      setNewRule(prev => ({
        ...prev,
        trigger_conditions: { ...prev.trigger_conditions, [key]: value }
      }))
    }
  }

  const updateAction = (key: string, value: any, isEditing = false) => {
    if (isEditing && editingRule) {
      setEditingRule(prev => prev ? {
        ...prev,
        action_data: { ...prev.action_data, [key]: value }
      } : null)
    } else {
      setNewRule(prev => ({
        ...prev,
        action_data: { ...prev.action_data, [key]: value }
      }))
    }
  }

  const renderTriggerConfig = (triggerType: string, conditions: any, isEditing = false) => {
    switch (triggerType) {
      case 'keyword':
        return (
          <div className="space-y-2">
            <Label>Palabras clave (separadas por coma)</Label>
            <Input
              value={conditions.keywords || ''}
              onChange={(e) => updateTriggerCondition('keywords', e.target.value, isEditing)}
              placeholder="reserva, mesa, horario"
            />
          </div>
        )
      
      case 'time_based':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hora de inicio</Label>
              <Input
                type="time"
                value={conditions.start_time || ''}
                onChange={(e) => updateTriggerCondition('start_time', e.target.value, isEditing)}
              />
            </div>
            <div>
              <Label>Hora de fin</Label>
              <Input
                type="time"
                value={conditions.end_time || ''}
                onChange={(e) => updateTriggerCondition('end_time', e.target.value, isEditing)}
              />
            </div>
          </div>
        )
      
      case 'no_response':
        return (
          <div>
            <Label>Tiempo de espera (minutos)</Label>
            <Input
              type="number"
              value={conditions.wait_time || '10'}
              onChange={(e) => updateTriggerCondition('wait_time', parseInt(e.target.value), isEditing)}
              placeholder="10"
            />
          </div>
        )
      
      default:
        return null
    }
  }

  const renderActionConfig = (actionData: any, isEditing = false) => {
    return (
      <div className="space-y-4">
        <div>
          <Label>Tipo de acción</Label>
          <Select
            value={actionData.type || 'send_message'}
            onValueChange={(value) => updateAction('type', value, isEditing)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actionTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {actionData.type === 'send_message' && (
          <div>
            <Label>Mensaje a enviar</Label>
            <Textarea
              value={actionData.message || ''}
              onChange={(e) => updateAction('message', e.target.value, isEditing)}
              placeholder="Mensaje automático..."
              rows={3}
            />
          </div>
        )}
        
        {actionData.type === 'forward_to_human' && (
          <div>
            <Label>Mensaje de transferencia</Label>
            <Textarea
              value={actionData.transfer_message || ''}
              onChange={(e) => updateAction('transfer_message', e.target.value, isEditing)}
              placeholder="Te estoy conectando con un agente humano..."
              rows={2}
            />
          </div>
        )}
        
        {actionData.type === 'schedule_followup' && (
          <div>
            <Label>Tiempo de seguimiento (horas)</Label>
            <Input
              type="number"
              value={actionData.followup_hours || '24'}
              onChange={(e) => updateAction('followup_hours', parseInt(e.target.value), isEditing)}
              placeholder="24"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Crear nueva regla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Nueva Regla de Automatización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre de la regla</Label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Respuesta automática de reservas"
              />
            </div>
            
            <div>
              <Label>Tipo de activador</Label>
              <Select
                value={newRule.trigger_type}
                onValueChange={(value) => setNewRule(prev => ({ ...prev, trigger_type: value, trigger_conditions: {} }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Configuración del activador</Label>
            <div className="border rounded-lg p-4 mt-2">
              {renderTriggerConfig(newRule.trigger_type || 'keyword', newRule.trigger_conditions || {})}
            </div>
          </div>
          
          <div>
            <Label>Configuración de acciones</Label>
            <div className="border rounded-lg p-4 mt-2">
              {renderActionConfig(newRule.action_data || {})}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={newRule.is_active}
              onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, is_active: checked }))}
            />
            <Label>Regla activa</Label>
          </div>
          
          <Button 
            onClick={() => handleSave(newRule as AutomationRule)}
            disabled={isLoading || !newRule.name}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Regla
          </Button>
        </CardContent>
      </Card>

      {/* Lista de reglas existentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Reglas de Automatización Configuradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="border rounded-lg p-4">
                {editingRule?.id === rule.id ? (
                  // Modo edición
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre de la regla</Label>
                        <Input
                          value={editingRule?.name || ''}
                          onChange={(e) => setEditingRule(prev => prev ? { ...prev, name: e.target.value } : null)}
                        />
                      </div>
                      
                      <div>
                        <Label>Tipo de activador</Label>
                        <Select
                          value={editingRule?.trigger_type || 'keyword'}
                          onValueChange={(value) => setEditingRule(prev => prev ? { 
                            ...prev, 
                            trigger_type: value, 
                            trigger_conditions: {} 
                          } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {triggerTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Configuración del activador</Label>
                      <div className="border rounded-lg p-4 mt-2">
                        {editingRule && renderTriggerConfig(editingRule.trigger_type, editingRule.trigger_conditions, true)}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Configuración de acciones</Label>
                      <div className="border rounded-lg p-4 mt-2">
                        {editingRule && renderActionConfig(editingRule.action_data, true)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingRule?.is_active || false}
                          onCheckedChange={(checked) => setEditingRule(prev => prev ? { ...prev, is_active: checked } : null)}
                        />
                        <Label>Activa</Label>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => editingRule && handleSave(editingRule)}>
                          <Save className="h-4 w-4 mr-1" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingRule(null)}>
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
                        <h3 className="font-semibold">{rule.name}</h3>
                        <Badge variant="outline">
                          {triggerTypes.find(t => t.value === rule.trigger_type)?.label}
                        </Badge>
                        {rule.is_active ? (
                          <Badge variant="default">Activa</Badge>
                        ) : (
                          <Badge variant="secondary">Inactiva</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Activador:</strong> {JSON.stringify(rule.trigger_conditions)}</p>
                        <p><strong>Acción:</strong> {rule.action_data?.type} - {rule.action_data?.message || rule.action_data?.transfer_message || 'Configuración especial'}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => setEditingRule(rule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rule.id && handleDelete(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {rules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay reglas de automatización configuradas aún</p>
                <p className="text-sm">Crea tu primera regla para comenzar a automatizar respuestas</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
