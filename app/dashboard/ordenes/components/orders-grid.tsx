"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { updateOrderStatus, deleteOrder, completeOrderWithPayment } from "@/app/actions/orders"
import type { Order } from "@/lib/types"
import { OrderDetailsDrawer } from "./order-details-drawer"
import { EditOrderDialog } from "./edit-order-dialog"
import { TrashIcon, PencilIcon, XIcon } from "@/components/ui/icons"

interface OrdersGridProps {
  orders: Order[]
  searchTerm?: string
  onOrdersChanged?: () => void
}

export function OrdersGrid({ orders, searchTerm = "", onOrdersChanged }: OrdersGridProps) {
  const [loadingOrders, setLoadingOrders] = useState<Set<number>>(new Set())
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Efectivo")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-red-500"
      case "en_proceso":
        return "bg-white border border-gray-200"
      case "listo":
        return "bg-green-500"
      case "entregado":
        return "bg-blue-500"
      case "completado":
        return "bg-gray-500"
      default:
        return "bg-gray-100"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendiente":
        return "Pendiente"
      case "en_proceso":
        return "Preparando"
      case "listo":
        return "Listo"
      case "entregado":
        return "Entregado"
      case "completado":
        return "Completado"
      default:
        return status
    }
  }

  const getNextAction = (status: string) => {
    switch (status) {
      case "pendiente":
        return { text: "En Preparación", nextStatus: "en_proceso" }
      case "en_proceso":
        return { text: "Pedido Listo", nextStatus: "listo" }
      case "listo":
        return { text: "Entregar", nextStatus: "entregado" }
      case "entregado":
        return { text: "Completar", nextStatus: "completado" }
      default:
        return null
    }
  }

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    // Si se está completando la orden, mostrar diálogo de método de pago
    if (newStatus === "completado") {
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setOrderToComplete(order)
        setPaymentDialogOpen(true)
        return
      }
    }

    setLoadingOrders((prev) => new Set(prev).add(orderId))
    try {
      await updateOrderStatus(orderId, newStatus)
    } finally {
      setLoadingOrders((prev) => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const handleCompleteOrderWithPayment = async () => {
    if (!orderToComplete) return
    
    setLoadingOrders((prev) => new Set(prev).add(orderToComplete.id))
    try {
      await completeOrderWithPayment(orderToComplete.id, selectedPaymentMethod)
      setPaymentDialogOpen(false)
      setOrderToComplete(null)
      setSelectedPaymentMethod("Efectivo")
    } finally {
      setLoadingOrders((prev) => {
        const newSet = new Set(prev)
        newSet.delete(orderToComplete.id)
        return newSet
      })
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta orden?")) {
      setLoadingOrders((prev) => new Set(prev).add(orderId))
      try {
        await deleteOrder(orderId)
      } finally {
        setLoadingOrders((prev) => {
          const newSet = new Set(prev)
          newSet.delete(orderId)
          return newSet
        })
      }
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Handler for status change from drawer
  const handleDrawerStatusChange = async (orderId: number, newStatus: Order["status"]) => {
    setLoadingOrders((prev) => new Set(prev).add(orderId))
    try {
      await updateOrderStatus(orderId, newStatus)
    } finally {
      setLoadingOrders((prev) => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  // Handler for edit (can be expanded)
  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order)
    setEditDialogOpen(true)
  }

  // Handler for process payment
  const handleProcessPayment = async (order: Order, paymentMethod: string) => {
    await handleDrawerStatusChange(order.id, "completado")
    setDrawerOpen(false)
  }

  // Filtrado por búsqueda
  const filteredOrders = searchTerm.trim().length > 0
    ? orders.filter(order => {
        const term = searchTerm.toLowerCase()
        return (
          order.customer_name?.toLowerCase().includes(term) ||
          order.table_number?.toString().toLowerCase().includes(term) ||
          order.notes?.toLowerCase().includes(term) ||
          getStatusText(order.status).toLowerCase().includes(term)
        )
      })
    : orders

  if (filteredOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No hay órdenes</h3>
        <p className="text-gray-500">Las órdenes aparecerán aquí cuando se creen desde el menú.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((order) => {
          const nextAction = getNextAction(order.status)
          const isLoading = loadingOrders.has(order.id)
          const textColor = order.status === "en_proceso" ? "text-gray-900" : "text-white"

          return (
            <Card
              key={order.id}
              className={`${getStatusColor(order.status)} ${textColor} relative overflow-hidden rounded-[30px] cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
              onClick={e => {
                // Evitar abrir el detalle si el click viene de un botón de acción
                if ((e.target as HTMLElement).closest('button')) return;
                setSelectedOrder(order); setDrawerOpen(true);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className={`text-xl font-bold ${textColor}`}>Pedido #{order.id}</CardTitle>
                  <Badge
                    variant={order.status === "en_proceso" ? "default" : "secondary"}
                    className={`rounded-[30px] ${order.status === "en_proceso" ? "bg-orange-500 text-white" : ""}`}
                  >
                    {getStatusText(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className={`${textColor} opacity-90`}>
                    <span className="font-medium">Cliente:</span> {order.customer_name}
                  </p>
                  <p className={`${textColor} opacity-90`}>
                    <span className="font-medium">Mesa:</span> {order.table_number || "N/A"}
                  </p>
                  <p className={`${textColor} opacity-90 text-sm`}>
                    <span className="font-medium">Hora:</span> {formatDateTime(order.created_at)}
                  </p>
                  {order.notes && (
                    <p className={`${textColor} opacity-90`}>
                      <span className="font-medium">Detalles:</span> {order.notes}
                    </p>
                  )}
                </div>

                <div className="border-t border-white/20 pt-3">
                  <p className={`text-2xl font-bold ${textColor} mb-2`}>Total: ${Number(order.total).toFixed(2)}</p>

                  <div className="space-y-1">
                    <p className={`${textColor} font-medium text-sm`}>Productos:</p>
                    {order.items?.map((item, index) => (
                      <p key={index} className={`${textColor} opacity-90 text-sm`}>
                        {item.quantity}x {item.product_name}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  {/* Solo mostrar el botón de acción si no es el paso de 'Completar' */}
                  {nextAction && !(order.status === "entregado" && nextAction.nextStatus === "completado") && (
                    <Button
                      onClick={e => { e.stopPropagation(); handleStatusUpdate(order.id, nextAction.nextStatus); }}
                      disabled={isLoading}
                      className={`flex-1 rounded-[30px] ${
                        order.status === "en_proceso"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-white/20 hover:bg-white/30 text-white border-white/30"
                      }`}
                      variant={order.status === "en_proceso" ? "default" : "outline"}
                    >
                      {isLoading ? "..." : nextAction.text}
                    </Button>
                  )}
                  <Button
                    onClick={e => { e.stopPropagation(); handleEditOrder(order); }}
                    disabled={isLoading}
                    variant="outline"
                    size="icon"
                    className={`rounded-full flex items-center justify-center bg-white/80 hover:bg-white/90 border border-gray-300 shadow-sm transition-colors ${
                      order.status === "en_proceso"
                        ? "text-gray-700"
                        : "text-gray-700"
                    }`}
                    title="Editar orden"
                  >
                    <PencilIcon className="w-4 h-4" style={{ color: '#374151' }} />
                  </Button>
                  <Button
                    onClick={e => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                    disabled={isLoading}
                    variant="outline"
                    size="icon"
                    className={`rounded-full flex items-center justify-center bg-white/80 hover:bg-white/90 border border-gray-300 shadow-sm transition-colors ${
                      order.status === "en_proceso"
                        ? "text-gray-700"
                        : "text-gray-700"
                    }`}
                    title="Eliminar orden"
                  >
                    <XIcon className="w-4 h-4" style={{ color: '#374151' }} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <OrderDetailsDrawer
        order={selectedOrder}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleDrawerStatusChange}
        onEdit={handleEditOrder}
        onProcessPayment={handleProcessPayment}
      />
      <EditOrderDialog
        order={selectedOrder}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onOrderUpdated={() => {
          setEditDialogOpen(false);
          setDrawerOpen(false); // También cerrar el drawer de detalles
          if (onOrdersChanged) onOrdersChanged();
        }}
      />
      
      {/* Diálogo de método de pago para completar orden */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Completar Orden</DialogTitle>
            <DialogDescription>
              Selecciona el método de pago para completar la orden #{orderToComplete?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Método de Pago</label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta de Débito">Tarjeta de Débito</SelectItem>
                  <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="MercadoPago">MercadoPago</SelectItem>
                  <SelectItem value="Otro Digital">Otro Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteOrderWithPayment}
              disabled={orderToComplete ? loadingOrders.has(orderToComplete.id) : false}
            >
              {orderToComplete && loadingOrders.has(orderToComplete.id) ? "Completando..." : "Completar Orden"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
