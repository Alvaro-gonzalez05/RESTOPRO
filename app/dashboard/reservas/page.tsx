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
import { Calendar, Clock, Users, Phone, Mail, Plus, Edit, Trash2, Filter, CalendarDays } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { 
  getReservations, 
  getTodayReservations,
  createReservation, 
  updateReservation, 
  cancelReservation,
  getReservationStats,
  type Reservation 
} from '@/app/actions/reservations'

export default function ReservationsPage() {
  const { user } = useUser()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)

  // Form state for new/edit reservation
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    reservation_date: '',
    reservation_time: '',
    party_size: 2,
    special_requests: '',
    notes: ''
  })

  useEffect(() => {
    if (user) {
      loadReservations()
      loadTodayReservations()
      loadStats()

      // Set up polling to refresh data every 15 seconds
      const intervalId = setInterval(() => {
        loadReservations()
        loadTodayReservations()
        loadStats()
      }, 15000) // 15 seconds

      // Clean up interval on component unmount
      return () => clearInterval(intervalId)
    }
  }, [user])

  const loadReservations = async () => {
    if (!user) return
    try {
      setLoading(true)
      const data = await getReservations(user.id)
      setReservations(data)
    } catch (error) {
      console.error('Error loading reservations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTodayReservations = async () => {
    if (!user) return
    try {
      const data = await getTodayReservations(user.id)
      setTodayReservations(data)
    } catch (error) {
      console.error('Error loading today reservations:', error)
    }
  }

  const loadStats = async () => {
    if (!user) return
    try {
      const data = await getReservationStats(user.id, 'today')
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleCreateReservation = async () => {
    if (!user) return
    
    try {
      const result = await createReservation({
        userId: user.id,
        customerName: formData.customer_name,
        customerPhone: formData.customer_phone,
        customerEmail: formData.customer_email,
        reservationDate: formData.reservation_date,
        reservationTime: formData.reservation_time,
        partySize: formData.party_size,
        specialRequests: formData.special_requests,
        notes: formData.notes,
        createdVia: 'manual'
      })

      if (result.success) {
        setShowCreateDialog(false)
        resetForm()
        loadReservations()
        loadTodayReservations()
        loadStats()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert('Error al crear la reserva')
    }
  }

  const handleUpdateReservation = async () => {
    if (!user || !editingReservation) return
    
    try {
      const result = await updateReservation(editingReservation.id, user.id, {
        customerName: formData.customer_name,
        customerPhone: formData.customer_phone,
        customerEmail: formData.customer_email,
        reservationDate: formData.reservation_date,
        reservationTime: formData.reservation_time,
        partySize: formData.party_size,
        specialRequests: formData.special_requests,
        notes: formData.notes
      })

      if (result.success) {
        setEditingReservation(null)
        resetForm()
        loadReservations()
        loadTodayReservations()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating reservation:', error)
      alert('Error al actualizar la reserva')
    }
  }

  const handleCancelReservation = async (id: number) => {
    if (!user) return
    
    if (confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
      try {
        const result = await cancelReservation(id, user.id)
        if (result.success) {
          loadReservations()
          loadTodayReservations()
          loadStats()
        } else {
          alert(`Error: ${result.error}`)
        }
      } catch (error) {
        console.error('Error cancelling reservation:', error)
        alert('Error al cancelar la reserva')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      reservation_date: '',
      reservation_time: '',
      party_size: 2,
      special_requests: '',
      notes: ''
    })
  }

  const openEditDialog = (reservation: Reservation) => {
    setEditingReservation(reservation)
    setFormData({
      customer_name: reservation.customer_name,
      customer_phone: reservation.customer_phone,
      customer_email: reservation.customer_email || '',
      reservation_date: reservation.reservation_date,
      reservation_time: reservation.reservation_time,
      party_size: reservation.party_size,
      special_requests: reservation.special_requests || '',
      notes: reservation.notes || ''
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      confirmed: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
      completed: 'outline',
      no_show: 'destructive'
    }
    
    const labels: { [key: string]: string } = {
      confirmed: 'Confirmada',
      pending: 'Pendiente',
      cancelled: 'Cancelada',
      completed: 'Completada',
      no_show: 'No Asistió'
    }

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    )
  }

  const filteredReservations = reservations.filter(reservation => {
    if (statusFilter !== 'all' && reservation.status !== statusFilter) return false
    
    const reservationDate = new Date(reservation.reservation_date)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    switch (filter) {
      case 'today':
        return reservation.reservation_date === todayStr
      case 'upcoming':
        return reservationDate >= today
      case 'past':
        return reservationDate < today
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando reservas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reservas</h1>
          <p className="text-muted-foreground">Gestiona las reservas de tu restaurante</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Reserva
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Reserva</DialogTitle>
              <DialogDescription>Crea una nueva reserva manualmente</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Nombre del Cliente</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">Teléfono</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="customer_email">Email (opcional)</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="reservation_date">Fecha</Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    value={formData.reservation_date}
                    onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="reservation_time">Hora</Label>
                  <Input
                    id="reservation_time"
                    type="time"
                    value={formData.reservation_time}
                    onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="party_size">Número de Personas</Label>
                <Input
                  id="party_size"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.party_size}
                  onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="special_requests">Solicitudes Especiales</Label>
                <Textarea
                  id="special_requests"
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  placeholder="Alergias, preferencias, etc."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateReservation}>
                  Crear Reserva
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayReservations.length}</div>
            <p className="text-xs text-muted-foreground">reservas para hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed || 0}</div>
            <p className="text-xs text-muted-foreground">hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_guests || 0}</div>
            <p className="text-xs text-muted-foreground">esperadas hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avg_party_size || 0)}</div>
            <p className="text-xs text-muted-foreground">personas por mesa</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button
            variant={filter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('today')}
          >
            Hoy
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('upcoming')}
          >
            Próximas
          </Button>
          <Button
            variant={filter === 'past' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('past')}
          >
            Pasadas
          </Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="confirmed">Confirmadas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="no_show">No Asistieron</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reservations List */}
      <div className="space-y-4">
        {filteredReservations.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No hay reservas que mostrar</p>
            </CardContent>
          </Card>
        ) : (
          filteredReservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold">{reservation.customer_name}</h3>
                      {getStatusBadge(reservation.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {reservation.reservation_date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {reservation.reservation_time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {reservation.party_size} personas
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {reservation.customer_phone}
                      </div>
                      {reservation.customer_email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {reservation.customer_email}
                        </div>
                      )}
                    </div>
                    {reservation.special_requests && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Solicitudes:</strong> {reservation.special_requests}
                      </p>
                    )}
                    {reservation.notes && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Notas:</strong> {reservation.notes}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Creada el: {new Date(reservation.created_at).toLocaleDateString()}
                      {reservation.created_via === 'chatbot' && ' • Via Chatbot'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(reservation)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelReservation(reservation.id)}
                      disabled={reservation.status === 'cancelled'}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingReservation} onOpenChange={() => setEditingReservation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Reserva</DialogTitle>
            <DialogDescription>Modifica los detalles de la reserva</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_customer_name">Nombre del Cliente</Label>
              <Input
                id="edit_customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_customer_phone">Teléfono</Label>
              <Input
                id="edit_customer_phone"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_customer_email">Email</Label>
              <Input
                id="edit_customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="edit_reservation_date">Fecha</Label>
                <Input
                  id="edit_reservation_date"
                  type="date"
                  value={formData.reservation_date}
                  onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_reservation_time">Hora</Label>
                <Input
                  id="edit_reservation_time"
                  type="time"
                  value={formData.reservation_time}
                  onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_party_size">Número de Personas</Label>
              <Input
                id="edit_party_size"
                type="number"
                min="1"
                max="20"
                value={formData.party_size}
                onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="edit_special_requests">Solicitudes Especiales</Label>
              <Textarea
                id="edit_special_requests"
                value={formData.special_requests}
                onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingReservation(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateReservation}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}