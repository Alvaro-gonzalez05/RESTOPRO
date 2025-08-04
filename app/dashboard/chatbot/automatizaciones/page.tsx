'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  Zap, 
  Clock, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Play,
  Pause,
  Edit,
  Trash2,
  Settings,
  Calendar,
  Gift,
  Heart,
  ShoppingCart,
  UserCheck
} from 'lucide-react'
import { useUser } from '@/hooks/use-user'

interface AutomationRule {
  id: number
  name: string
  trigger_type: 'inactive_customer' | 'post_purchase' | 'birthday' | 'points_milestone' | 'reservation_reminder' | 'seasonal' | 'abandoned_cart'
  trigger_conditions: {
    days_inactive?: number
    points_threshold?: number
    hours_before_reservation?: number
    purchase_amount_min?: number
    specific_date?: string
    time_of_day?: string
  }
  action_type: 'send_message' | 'send_discount' | 'add_points' | 'create_promotion'
  action_data: {
    message_template?: string
    discount_percentage?: number
    points_to_add?: number
    promotion_details?: any
  }
  is_active: boolean
  execution_count: number
  last_executed?: string
  created_at: string
  updated_at: string
}

interface AutomationExecution {
  id: number
  automation_rule_id: number
  customer_phone: string
  action_type: string
  metadata: any
  executed_at: string
  success: boolean
}

export default function AutomationsPage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('rules')
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])
  const [executions, setExecutions] = useState<AutomationExecution[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)

  // Form state
  const [ruleForm, setRuleForm] = useState({
    name: '',
    trigger_type: 'inactive_customer' as AutomationRule['trigger_type'],
    trigger_conditions: {
      days_inactive: 30,
      points_threshold: 100,
      hours_before_reservation: 2,
      purchase_amount_min: 0,
      specific_date: '',
      time_of_day: '10:00'
    },
    action_type: 'send_message' as AutomationRule['action_type'],
    action_data: {
      message_template: '',
      discount_percentage: 10,
      points_to_add: 50,
      promotion_details: {}
    },
    is_active: true
  })

  useEffect(() => {
    if (user) {
      loadAutomationRules()
      loadExecutions()
      loadStats()
    }
  }, [user])

  const loadAutomationRules = async () => {
    if (!user) return
    try {
      setLoading(true)
      const response = await fetch('/api/automation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', userId: user.id })
      })
      if (response.ok) {
        const data = await response.json()
        setAutomationRules(data)
      }
    } catch (error) {
      console.error('Error loading automation rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExecutions = async () => {
    if (!user) return
    try {
      const response = await fetch('/api/automation-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', userId: user.id, limit: 50 })
      })
      if (response.ok) {
        const data = await response.json()
        setExecutions(data)
      }
    } catch (error) {
      console.error('Error loading executions:', error)
    }
  }

  const loadStats = async () => {
    if (!user) return
    try {
      const response = await fetch('/api/automation-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', userId: user.id, period: 'month' })
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleCreateRule = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/automation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: user.id,
          ...ruleForm
        })
      })

      if (response.ok) {
        setShowCreateDialog(false)
        resetForm()
        loadAutomationRules()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error creating automation rule:', error)
      alert('Error al crear la regla de automatización')
    }
  }

  const handleToggleRule = async (ruleId: number) => {
    if (!user) return
    
    try {
      const response = await fetch('/api/automation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          userId: user.id,
          id: ruleId
        })
      })

      if (response.ok) {
        loadAutomationRules()
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  const handleDeleteRule = async (ruleId: number) => {
    if (!user) return
    
    if (confirm('¿Estás seguro de que quieres eliminar esta regla?')) {
      try {
        const response = await fetch('/api/automation-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            userId: user.id,
            id: ruleId
          })
        })

        if (response.ok) {
          loadAutomationRules()
        }
      } catch (error) {
        console.error('Error deleting rule:', error)
      }
    }
  }

  const resetForm = () => {
    setRuleForm({
      name: '',
      trigger_type: 'inactive_customer',
      trigger_conditions: {
        days_inactive: 30,
        points_threshold: 100,
        hours_before_reservation: 2,
        purchase_amount_min: 0,
        specific_date: '',
        time_of_day: '10:00'
      },
      action_type: 'send_message',
      action_data: {
        message_template: '',
        discount_percentage: 10,
        points_to_add: 50,
        promotion_details: {}
      },
      is_active: true
    })
  }

  const getTriggerIcon = (triggerType: string) => {
    const icons = {
      inactive_customer: Clock,
      post_purchase: ShoppingCart,
      birthday: Gift,
      points_milestone: TrendingUp,
      reservation_reminder: Calendar,
      seasonal: Heart,
      abandoned_cart: UserCheck
    }
    const Icon = icons[triggerType as keyof typeof icons] || Zap
    return <Icon className="w-4 h-4" />
  }

  const getTriggerText = (triggerType: string) => {
    const texts = {
      inactive_customer: 'Cliente inactivo',
      post_purchase: 'Post-compra',
      birthday: 'Cumpleaños',
      points_milestone: 'Hito de puntos',
      reservation_reminder: 'Recordatorio de reserva',
      seasonal: 'Estacional',
      abandoned_cart: 'Carrito abandonado'
    }
    return texts[triggerType as keyof typeof texts] || triggerType
  }

  const getDefaultMessageTemplate = (triggerType: string) => {
    const templates = {
      inactive_customer: '¡Hola {customer_name}! Te extrañamos en {business_name}. Tienes {points} puntos esperándote. ¡Ven y disfruta un 15% de descuento! 🎉',
      post_purchase: '¡Gracias por tu compra, {customer_name}! Esperamos que hayas disfrutado tu experiencia en {business_name}. Tienes {points} puntos acumulados. ¡Hasta la próxima! ⭐',
      birthday: '¡Feliz cumpleaños, {customer_name}! 🎉 Te deseamos un día maravilloso. Como regalo, tienes 20% de descuento en tu próxima visita a {business_name}. ¡Celebra con nosotros! 🎂',
      points_milestone: '¡Felicidades {customer_name}! Has alcanzado {points} puntos en {business_name}. ¿Sabías que puedes canjearlos por descuentos y productos gratis? ¡Ven a usar tus puntos! 🎯',
      reservation_reminder: 'Hola {customer_name}, te recordamos tu reserva para hoy a las {time} para {party_size} personas en {business_name}. ¡Te esperamos! 📅',
      seasonal: '¡Hola {customer_name}! Tenemos una promoción especial para ti en {business_name}. No te la pierdas. ¡Te esperamos! 🎊',
      abandoned_cart: 'Hola {customer_name}, notamos que no completaste tu pedido en {business_name}. ¿Necesitas ayuda? ¡Estamos aquí para ti! 🛒'
    }
    return templates[triggerType as keyof typeof templates] || ''
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando automatizaciones...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Automatizaciones</h1>
          <p className="text-muted-foreground">Configura mensajes automáticos para tus clientes</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Reglas</TabsTrigger>
          <TabsTrigger value="executions">Historial</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Reglas de Automatización</h2>
              <Badge variant="secondary">{automationRules.filter(r => r.is_active).length} activas</Badge>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Regla
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva Regla de Automatización</DialogTitle>
                  <DialogDescription>Configura cuándo y cómo enviar mensajes automáticos</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre de la Regla</Label>
                    <Input
                      id="name"
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                      placeholder="ej. Mensaje a clientes inactivos"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trigger_type">Disparador</Label>
                      <Select value={ruleForm.trigger_type} onValueChange={(value: any) => {
                        setRuleForm({ 
                          ...ruleForm, 
                          trigger_type: value,
                          action_data: {
                            ...ruleForm.action_data,
                            message_template: getDefaultMessageTemplate(value)
                          }
                        })
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inactive_customer">Cliente inactivo</SelectItem>
                          <SelectItem value="post_purchase">Post-compra</SelectItem>
                          <SelectItem value="birthday">Cumpleaños</SelectItem>
                          <SelectItem value="points_milestone">Hito de puntos</SelectItem>
                          <SelectItem value="reservation_reminder">Recordatorio de reserva</SelectItem>
                          <SelectItem value="seasonal">Estacional</SelectItem>
                          <SelectItem value="abandoned_cart">Carrito abandonado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="action_type">Acción</Label>
                      <Select value={ruleForm.action_type} onValueChange={(value: any) => setRuleForm({ ...ruleForm, action_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="send_message">Enviar mensaje</SelectItem>
                          <SelectItem value="send_discount">Enviar descuento</SelectItem>
                          <SelectItem value="add_points">Agregar puntos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Trigger Conditions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Condiciones del Disparador</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {ruleForm.trigger_type === 'inactive_customer' && (
                        <div>
                          <Label htmlFor="days_inactive">Días sin actividad</Label>
                          <Input
                            id="days_inactive"
                            type="number"
                            value={ruleForm.trigger_conditions.days_inactive}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              trigger_conditions: {
                                ...ruleForm.trigger_conditions,
                                days_inactive: parseInt(e.target.value) || 30
                              }
                            })}
                          />
                        </div>
                      )}

                      {ruleForm.trigger_type === 'points_milestone' && (
                        <div>
                          <Label htmlFor="points_threshold">Puntos mínimos</Label>
                          <Input
                            id="points_threshold"
                            type="number"
                            value={ruleForm.trigger_conditions.points_threshold}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              trigger_conditions: {
                                ...ruleForm.trigger_conditions,
                                points_threshold: parseInt(e.target.value) || 100
                              }
                            })}
                          />
                        </div>
                      )}

                      {ruleForm.trigger_type === 'reservation_reminder' && (
                        <div>
                          <Label htmlFor="hours_before">Horas antes de la reserva</Label>
                          <Input
                            id="hours_before"
                            type="number"
                            value={ruleForm.trigger_conditions.hours_before_reservation}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              trigger_conditions: {
                                ...ruleForm.trigger_conditions,
                                hours_before_reservation: parseInt(e.target.value) || 2
                              }
                            })}
                          />
                        </div>
                      )}

                      {ruleForm.trigger_type === 'post_purchase' && (
                        <div>
                          <Label htmlFor="purchase_min">Monto mínimo de compra</Label>
                          <Input
                            id="purchase_min"
                            type="number"
                            step="0.01"
                            value={ruleForm.trigger_conditions.purchase_amount_min}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              trigger_conditions: {
                                ...ruleForm.trigger_conditions,
                                purchase_amount_min: parseFloat(e.target.value) || 0
                              }
                            })}
                          />
                        </div>
                      )}

                      {ruleForm.trigger_type === 'seasonal' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="specific_date">Fecha específica</Label>
                            <Input
                              id="specific_date"
                              type="date"
                              value={ruleForm.trigger_conditions.specific_date}
                              onChange={(e) => setRuleForm({
                                ...ruleForm,
                                trigger_conditions: {
                                  ...ruleForm.trigger_conditions,
                                  specific_date: e.target.value
                                }
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="time_of_day">Hora del día</Label>
                            <Input
                              id="time_of_day"
                              type="time"
                              value={ruleForm.trigger_conditions.time_of_day}
                              onChange={(e) => setRuleForm({
                                ...ruleForm,
                                trigger_conditions: {
                                  ...ruleForm.trigger_conditions,
                                  time_of_day: e.target.value
                                }
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Action Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Configuración de Acción</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {ruleForm.action_type === 'send_message' && (
                        <div>
                          <Label htmlFor="message_template">Plantilla del Mensaje</Label>
                          <Textarea
                            id="message_template"
                            value={ruleForm.action_data.message_template}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              action_data: {
                                ...ruleForm.action_data,
                                message_template: e.target.value
                              }
                            })}
                            rows={4}
                            placeholder="Mensaje que se enviará..."
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Variables disponibles: {'{customer_name}'}, {'{points}'}, {'{business_name}'}, {'{time}'}, {'{party_size}'}
                          </p>
                        </div>
                      )}

                      {ruleForm.action_type === 'send_discount' && (
                        <div>
                          <Label htmlFor="discount_percentage">Porcentaje de Descuento</Label>
                          <Input
                            id="discount_percentage"
                            type="number"
                            min="1"
                            max="100"
                            value={ruleForm.action_data.discount_percentage}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              action_data: {
                                ...ruleForm.action_data,
                                discount_percentage: parseInt(e.target.value) || 10
                              }
                            })}
                          />
                        </div>
                      )}

                      {ruleForm.action_type === 'add_points' && (
                        <div>
                          <Label htmlFor="points_to_add">Puntos a Agregar</Label>
                          <Input
                            id="points_to_add"
                            type="number"
                            min="1"
                            value={ruleForm.action_data.points_to_add}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              action_data: {
                                ...ruleForm.action_data,
                                points_to_add: parseInt(e.target.value) || 50
                              }
                            })}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={ruleForm.is_active}
                      onCheckedChange={(checked) => setRuleForm({ ...ruleForm, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Regla activa</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateRule} disabled={!ruleForm.name}>
                      Crear Regla
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {automationRules.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No hay reglas de automatización creadas</p>
                </CardContent>
              </Card>
            ) : (
              automationRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getTriggerIcon(rule.trigger_type)}
                          <h3 className="text-lg font-semibold">{rule.name}</h3>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{getTriggerText(rule.trigger_type)}</span>
                          <span>•</span>
                          <span>Ejecutada {rule.execution_count} veces</span>
                          {rule.last_executed && (
                            <>
                              <span>•</span>
                              <span>Última: {new Date(rule.last_executed).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                        {rule.action_data.message_template && (
                          <p className="text-sm text-muted-foreground max-w-2xl truncate">
                            "{rule.action_data.message_template}"
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRule(rule.id)}
                        >
                          {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Historial de Ejecuciones</h2>
            <Badge variant="secondary">{executions.length}</Badge>
          </div>

          <div className="space-y-2">
            {executions.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No hay ejecuciones registradas</p>
                </CardContent>
              </Card>
            ) : (
              executions.map((execution) => (
                <Card key={execution.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={execution.success ? 'default' : 'destructive'}>
                            {execution.success ? 'Exitosa' : 'Fallida'}
                          </Badge>
                          <span className="text-sm font-medium">{execution.action_type}</span>
                          <span className="text-sm text-muted-foreground">→ {execution.customer_phone}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(execution.executed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reglas Activas</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{automationRules.filter(r => r.is_active).length}</div>
                <p className="text-xs text-muted-foreground">automatizaciones configuradas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ejecuciones Este Mes</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_executions || 0}</div>
                <p className="text-xs text-muted-foreground">mensajes automatizados</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Alcanzados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unique_customers || 0}</div>
                <p className="text-xs text-muted-foreground">clientes únicos</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.success_rate ? `${Math.round(stats.success_rate)}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground">mensajes entregados</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance by automation type */}
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Tipo de Automatización</CardTitle>
              <CardDescription>Análisis de efectividad de cada tipo de regla</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                      {getTriggerIcon(rule.trigger_type)}
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{rule.execution_count} ejecuciones</span>
                      {rule.last_executed && (
                        <span>Última: {new Date(rule.last_executed).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {automationRules.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay reglas de automatización para analizar
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}