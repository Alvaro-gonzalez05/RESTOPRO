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
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Send, 
  Users, 
  Target, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Filter
} from 'lucide-react'
import { useUser } from '@/hooks/use-user'

interface Customer {
  id: number
  name: string
  phone: string
  email?: string
  points: number
  total_spent: number
  orders_count: number
  last_purchase?: string
  customer_status?: 'new' | 'regular' | 'vip' | 'inactive'
  days_since_last_purchase?: number
  favorite_products?: string
}

interface Promotion {
  id: number
  title: string
  description: string
  discount_type: 'percentage' | 'fixed' | 'points'
  discount_value: number
  conditions?: string
  start_date?: string
  end_date?: string
  target_audience: 'all' | 'inactive' | 'vip' | 'new' | 'high_points' | 'custom'
  is_active: boolean
  usage_count: number
  created_at: string
}

interface PromotionCampaign {
  id: number
  promotion_id: number
  customers_targeted: number
  messages_sent: number
  responses_received: number
  orders_generated: number
  revenue_generated: number
  created_at: string
  status: 'draft' | 'sending' | 'completed' | 'paused'
}

export default function PromotionsPage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('promotions')
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCampaignDialog, setShowCampaignDialog] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)

  // Form states
  const [promotionForm, setPromotionForm] = useState({
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'points',
    discount_value: 0,
    conditions: '',
    start_date: '',
    end_date: '',
    target_audience: 'all' as 'all' | 'inactive' | 'vip' | 'new' | 'high_points' | 'custom',
    is_active: true
  })

  const [campaignForm, setCampaignForm] = useState({
    promotion_id: 0,
    message_template: '',
    send_immediately: true,
    scheduled_date: '',
    target_segment: 'all' as 'all' | 'inactive' | 'vip' | 'new' | 'high_points' | 'custom'
  })

  const [customerFilters, setCustomerFilters] = useState({
    min_points: 0,
    max_points: 10000,
    min_orders: 0,
    days_since_last_purchase: 0,
    min_spent: 0
  })

  useEffect(() => {
    if (user) {
      loadPromotions()
      loadCustomers()
      loadCampaigns()
    }
  }, [user])

  const loadPromotions = async () => {
    if (!user) return
    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', userId: user.id })
      })
      if (response.ok) {
        const data = await response.json()
        setPromotions(data)
      }
    } catch (error) {
      console.error('Error loading promotions:', error)
    }
  }

  const loadCustomers = async () => {
    if (!user) return
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_with_stats', userId: user.id })
      })
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCampaigns = async () => {
    if (!user) return
    try {
      const response = await fetch('/api/promotion-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', userId: user.id })
      })
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  const handleCreatePromotion = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: user.id,
          ...promotionForm
        })
      })

      if (response.ok) {
        setShowCreateDialog(false)
        resetPromotionForm()
        loadPromotions()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error creating promotion:', error)
      alert('Error al crear la promoción')
    }
  }

  const handleCreateCampaign = async () => {
    if (!user || !campaignForm.promotion_id) return
    
    try {
      const targetCustomers = getFilteredCustomers()
      
      if (targetCustomers.length === 0) {
        alert('No hay clientes que coincidan con los filtros seleccionados')
        return
      }

      const response = await fetch('/api/promotion-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: user.id,
          ...campaignForm,
          target_customers: targetCustomers.map(c => c.id)
        })
      })

      if (response.ok) {
        setShowCampaignDialog(false)
        resetCampaignForm()
        loadCampaigns()
        alert(`Campaña creada exitosamente para ${targetCustomers.length} clientes`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Error al crear la campaña')
    }
  }

  const getFilteredCustomers = () => {
    return customers.filter(customer => {
      if (campaignForm.target_segment === 'all') return true
      
      // Use customer_status if available, otherwise calculate
      const customerStatus = customer.customer_status || calculateCustomerStatus(customer)
      const daysSinceLastPurchase = customer.days_since_last_purchase !== undefined 
        ? customer.days_since_last_purchase
        : (customer.last_purchase 
          ? Math.floor((Date.now() - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24))
          : 999)

      switch (campaignForm.target_segment) {
        case 'inactive':
          return customerStatus === 'inactive' || daysSinceLastPurchase > 30
        case 'vip':
          return customerStatus === 'vip' || customer.total_spent > 1000 || customer.orders_count > 10
        case 'new':
          return customerStatus === 'new' || customer.orders_count <= 2
        case 'regular':
          return customerStatus === 'regular'
        case 'high_points':
          return customer.points > 100
        case 'custom':
          return (
            customer.points >= customerFilters.min_points &&
            customer.points <= customerFilters.max_points &&
            customer.orders_count >= customerFilters.min_orders &&
            daysSinceLastPurchase >= customerFilters.days_since_last_purchase &&
            customer.total_spent >= customerFilters.min_spent
          )
        default:
          return true
      }
    })
  }

  const calculateCustomerStatus = (customer: Customer): 'new' | 'regular' | 'vip' | 'inactive' => {
    const daysSinceLastPurchase = customer.last_purchase 
      ? Math.floor((Date.now() - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    if (customer.orders_count === 0) return 'new'
    if (daysSinceLastPurchase > 30) return 'inactive'
    if (customer.total_spent > 1000 || customer.orders_count > 10) return 'vip'
    if (customer.orders_count <= 2) return 'new'
    return 'regular'
  }

  const resetPromotionForm = () => {
    setPromotionForm({
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      conditions: '',
      start_date: '',
      end_date: '',
      target_audience: 'all',
      is_active: true
    })
  }

  const resetCampaignForm = () => {
    setCampaignForm({
      promotion_id: 0,
      message_template: '',
      send_immediately: true,
      scheduled_date: '',
      target_segment: 'all'
    })
  }

  const getDiscountText = (promotion: Promotion) => {
    switch (promotion.discount_type) {
      case 'percentage':
        return `${promotion.discount_value}% de descuento`
      case 'fixed':
        return `$${promotion.discount_value} de descuento`
      case 'points':
        return `${promotion.discount_value} puntos gratis`
      default:
        return 'Descuento especial'
    }
  }

  const getSegmentText = (segment: string) => {
    const segments = {
      all: 'Todos los clientes',
      inactive: 'Clientes inactivos (>30 días)',
      vip: 'Clientes VIP (alta compra)',
      new: 'Clientes nuevos (≤2 pedidos)',
      high_points: 'Muchos puntos (>100)',
      custom: 'Segmento personalizado'
    }
    return segments[segment as keyof typeof segments] || segment
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando promociones...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promociones</h1>
          <p className="text-muted-foreground">Crea y gestiona promociones para tus clientes</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="promotions">Promociones</TabsTrigger>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Promociones Activas</h2>
              <Badge variant="secondary">{promotions.filter(p => p.is_active).length}</Badge>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetPromotionForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Promoción
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nueva Promoción</DialogTitle>
                  <DialogDescription>Crea una nueva promoción para tus clientes</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={promotionForm.title}
                      onChange={(e) => setPromotionForm({ ...promotionForm, title: e.target.value })}
                      placeholder="ej. Descuento de Bienvenida"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={promotionForm.description}
                      onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
                      placeholder="Describe los detalles de la promoción"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="discount_type">Tipo de Descuento</Label>
                      <Select value={promotionForm.discount_type} onValueChange={(value: any) => setPromotionForm({ ...promotionForm, discount_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentaje</SelectItem>
                          <SelectItem value="fixed">Monto Fijo</SelectItem>
                          <SelectItem value="points">Puntos Gratis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="discount_value">Valor</Label>
                      <Input
                        id="discount_value"
                        type="number"
                        value={promotionForm.discount_value}
                        onChange={(e) => setPromotionForm({ ...promotionForm, discount_value: parseFloat(e.target.value) || 0 })}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="conditions">Condiciones (opcional)</Label>
                    <Input
                      id="conditions"
                      value={promotionForm.conditions}
                      onChange={(e) => setPromotionForm({ ...promotionForm, conditions: e.target.value })}
                      placeholder="ej. Mínimo $50 de compra"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="start_date">Fecha Inicio</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={promotionForm.start_date}
                        onChange={(e) => setPromotionForm({ ...promotionForm, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">Fecha Fin</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={promotionForm.end_date}
                        onChange={(e) => setPromotionForm({ ...promotionForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreatePromotion}>
                      Crear Promoción
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {promotions.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No hay promociones creadas</p>
                </CardContent>
              </Card>
            ) : (
              promotions.map((promotion) => (
                <Card key={promotion.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{promotion.title}</h3>
                          <Badge variant={promotion.is_active ? 'default' : 'secondary'}>
                            {promotion.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{promotion.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-green-600">
                            {getDiscountText(promotion)}
                          </span>
                          {promotion.conditions && (
                            <span className="text-muted-foreground">
                              • {promotion.conditions}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {promotion.start_date && (
                            <span>Desde: {new Date(promotion.start_date).toLocaleDateString()}</span>
                          )}
                          {promotion.end_date && (
                            <span>Hasta: {new Date(promotion.end_date).toLocaleDateString()}</span>
                          )}
                          <span>Usos: {promotion.usage_count}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCampaignForm({ ...campaignForm, promotion_id: promotion.id })
                            setShowCampaignDialog(true)
                          }}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Enviar
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Campañas de Marketing</h2>
              <Badge variant="secondary">{campaigns.length}</Badge>
            </div>
            <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
              <DialogTrigger asChild>
                <Button>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Nueva Campaña
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva Campaña</DialogTitle>
                  <DialogDescription>Envía promociones a tus clientes por WhatsApp</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="promotion_select">Promoción</Label>
                    <Select value={campaignForm.promotion_id.toString()} onValueChange={(value) => setCampaignForm({ ...campaignForm, promotion_id: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una promoción" />
                      </SelectTrigger>
                      <SelectContent>
                        {promotions.filter(p => p.is_active).map(promotion => (
                          <SelectItem key={promotion.id} value={promotion.id.toString()}>
                            {promotion.title} - {getDiscountText(promotion)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="target_segment">Segmento de Clientes</Label>
                    <Select value={campaignForm.target_segment} onValueChange={(value: any) => setCampaignForm({ ...campaignForm, target_segment: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        <SelectItem value="inactive">Clientes inactivos</SelectItem>
                        <SelectItem value="vip">Clientes VIP</SelectItem>
                        <SelectItem value="new">Clientes nuevos</SelectItem>
                        <SelectItem value="high_points">Muchos puntos</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {campaignForm.target_segment === 'custom' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Filtros Personalizados</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="min_points">Puntos mínimos</Label>
                            <Input
                              id="min_points"
                              type="number"
                              value={customerFilters.min_points}
                              onChange={(e) => setCustomerFilters({ ...customerFilters, min_points: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="min_orders">Pedidos mínimos</Label>
                            <Input
                              id="min_orders"
                              type="number"
                              value={customerFilters.min_orders}
                              onChange={(e) => setCustomerFilters({ ...customerFilters, min_orders: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="days_since">Días desde última compra (mínimo)</Label>
                          <Input
                            id="days_since"
                            type="number"
                            value={customerFilters.days_since_last_purchase}
                            onChange={(e) => setCustomerFilters({ ...customerFilters, days_since_last_purchase: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div>
                    <Label htmlFor="message_template">Mensaje</Label>
                    <Textarea
                      id="message_template"
                      value={campaignForm.message_template}
                      onChange={(e) => setCampaignForm({ ...campaignForm, message_template: e.target.value })}
                      placeholder="¡Hola {customer_name}! Tenemos una promoción especial para ti..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Variables disponibles: {'{customer_name}'}, {'{points}'}, {'{business_name}'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                    <div>
                      <p className="font-medium">Clientes objetivo</p>
                      <p className="text-sm text-muted-foreground">
                        {getFilteredCustomers().length} clientes recibirán este mensaje
                      </p>
                    </div>
                    <Badge variant="outline">
                      <Users className="w-3 h-3 mr-1" />
                      {getFilteredCustomers().length}
                    </Badge>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateCampaign} disabled={!campaignForm.promotion_id || !campaignForm.message_template}>
                      Crear y Enviar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No hay campañas creadas</p>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">Campaña #{campaign.id}</h3>
                          <Badge variant={
                            campaign.status === 'completed' ? 'default' :
                            campaign.status === 'sending' ? 'secondary' :
                            campaign.status === 'paused' ? 'destructive' : 'outline'
                          }>
                            {campaign.status === 'completed' ? 'Completada' :
                             campaign.status === 'sending' ? 'Enviando' :
                             campaign.status === 'paused' ? 'Pausada' : 'Borrador'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Clientes objetivo</p>
                            <p className="font-medium">{campaign.customers_targeted}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Mensajes enviados</p>
                            <p className="font-medium">{campaign.messages_sent}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Respuestas</p>
                            <p className="font-medium">{campaign.responses_received}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pedidos generados</p>
                            <p className="font-medium">{campaign.orders_generated}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Creada: {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promociones Activas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{promotions.filter(p => p.is_active).length}</div>
                <p className="text-xs text-muted-foreground">promociones disponibles</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campañas Enviadas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'completed').length}</div>
                <p className="text-xs text-muted-foreground">campañas completadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mensajes Enviados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + c.messages_sent, 0)}
                </div>
                <p className="text-xs text-muted-foreground">total de mensajes</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Segmentación de Clientes</CardTitle>
              <CardDescription>Distribución de tus clientes por categorías</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Todos los clientes</span>
                  <Badge variant="outline">{customers.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Clientes inactivos (+30 días)</span>
                  <Badge variant="outline">
                    {customers.filter(c => {
                      const daysSince = c.last_purchase 
                        ? Math.floor((Date.now() - new Date(c.last_purchase).getTime()) / (1000 * 60 * 60 * 24))
                        : 999
                      return daysSince > 30
                    }).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Clientes VIP</span>
                  <Badge variant="outline">
                    {customers.filter(c => c.total_spent > 1000 || c.orders_count > 10).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Clientes nuevos (≤2 pedidos)</span>
                  <Badge variant="outline">
                    {customers.filter(c => c.orders_count <= 2).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Con muchos puntos (+100)</span>
                  <Badge variant="outline">
                    {customers.filter(c => c.points > 100).length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}