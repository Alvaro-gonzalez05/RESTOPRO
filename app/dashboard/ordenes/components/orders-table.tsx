"use client"

import { useState } from "react"
import { MoreHorizontal, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { updateOrderStatus, deleteOrder, completeOrderWithPayment } from "@/app/actions/orders"
import type { Order } from "@/lib/types"

interface OrdersTableProps {
  orders: Order[]
}

const statusColors = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
}

const statusLabels = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  completado: "Completado",
  cancelado: "Cancelado",
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Efectivo")

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    // Si se está completando la orden, mostrar diálogo de método de pago
    if (newStatus === "completado") {
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setOrderToComplete(order)
        setPaymentDialogOpen(true)
        return
      }
    }

    setIsUpdating(orderId)
    await updateOrderStatus(orderId, newStatus)
    setIsUpdating(null)
  }

  const handleCompleteOrderWithPayment = async () => {
    if (!orderToComplete) return
    
    setIsUpdating(orderToComplete.id)
    try {
      await completeOrderWithPayment(orderToComplete.id, selectedPaymentMethod)
      setPaymentDialogOpen(false)
      setOrderToComplete(null)
      setSelectedPaymentMethod("Efectivo")
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDelete = async (orderId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta orden?")) {
      await deleteOrder(orderId)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Todas las Órdenes</CardTitle>
        </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell>${order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusChange(order.id, value)}
                    disabled={isUpdating === order.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_proceso">En Proceso</SelectItem>
                      <SelectItem value="completado">Completado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(order.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length === 0 && <div className="text-center py-8 text-gray-500">No hay órdenes registradas</div>}
      </CardContent>
    </Card>
    
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
            disabled={orderToComplete ? isUpdating === orderToComplete.id : false}
          >
            {orderToComplete && isUpdating === orderToComplete.id ? "Completando..." : "Completar Orden"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
