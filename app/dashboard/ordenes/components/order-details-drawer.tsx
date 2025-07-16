"use client"

import { useState, useMemo, useEffect } from "react"
import { useCustomerPoints } from "@/hooks/use-customer-points"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { Form } from "@/components/ui/form"
import { getPaymentMethods } from "@/app/actions/payment-methods"
import type { Order, PaymentMethod } from "@/lib/types"

const RedeemRewardDialog = dynamic(() => import("./redeem-reward-dialog"), { ssr: false })

interface OrderDetailsDrawerProps {
  order: Order | null
  open: boolean
  onClose: () => void
  onStatusChange: (orderId: number, newStatus: Order["status"]) => void
  onEdit: (order: Order) => void
  onProcessPayment: (order: Order, paymentMethod: string) => void
}

export function OrderDetailsDrawer({ order, open, onClose, onStatusChange, onEdit, onProcessPayment }: OrderDetailsDrawerProps) {
  if (!order) return null
  const [status, setStatus] = useState<Order["status"]>(order.status || "pendiente")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const { pointsToGain, customerPoints } = useCustomerPoints(order)
  // redeemedProducts: [{ product_id, quantity }]
  const [redeemedProducts, setRedeemedProducts] = useState<{ product_id: number, quantity: number }[]>([])

  // Cargar métodos de pago cuando se abre el drawer
  useEffect(() => {
    if (open) {
      loadPaymentMethods()
    }
  }, [open])

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true)
      const methods = await getPaymentMethods()
      setPaymentMethods(methods)
    } catch (error) {
      console.error("Error loading payment methods:", error)
      // Fallback a métodos predeterminados
      setPaymentMethods([
        { id: 1, user_id: 1, name: "Efectivo", is_active: true, created_at: "" },
        { id: 2, user_id: 1, name: "Tarjeta", is_active: true, created_at: "" },
      ])
    } finally {
      setLoadingPaymentMethods(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-w-md ml-auto h-full rounded-none shadow-2xl border-l bg-white flex flex-col">
        <DrawerHeader className="border-b p-6">
          <DrawerTitle className="text-2xl font-bold">Pedido #{order.id}</DrawerTitle>
          <DrawerDescription>
            <div className="flex flex-col gap-2 mt-2">
              <span><b>Cliente:</b> {order.customer_name}</span>
              <span><b>Mesa:</b> {order.table_number || "N/A"}</span>
              <span><b>Hora:</b> {new Date(order.created_at).toLocaleString("es-ES")}</span>
              {order.customer_id && customerPoints !== null && (
                <span className="text-xs text-gray-500">Puntos actuales del cliente: <b>{customerPoints}</b></span>
              )}
            </div>
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">Estado del pedido</label>
            <Select value={status} onValueChange={(value: Order["status"]) => {
              setStatus(value)
              onStatusChange(order.id, value)
            }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente"><Badge variant="secondary">Pendiente</Badge></SelectItem>
                <SelectItem value="en_proceso"><Badge variant="secondary">En Proceso</Badge></SelectItem>
                <SelectItem value="listo"><Badge variant="default">Listo</Badge></SelectItem>
                <SelectItem value="entregado"><Badge variant="default">Entregado</Badge></SelectItem>
                <SelectItem value="completado"><Badge variant="default">Completado</Badge></SelectItem>
                <SelectItem value="cancelado"><Badge variant="destructive">Cancelado</Badge></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Productos</h3>
                {order.items?.map((item, idx) => {
                  const redeemed = redeemedProducts.find(rp => rp.product_id === item.product_id);
                  const canjeados = redeemed ? redeemed.quantity : 0;
                  const cobrados = item.quantity - canjeados;
                  return (
                    <div key={idx} className="flex flex-col gap-0.5">
                      <div className={`flex justify-between text-sm ${canjeados === item.quantity ? 'line-through text-gray-400' : canjeados > 0 ? 'italic text-gray-500' : ''}`}>
                        <span>
                          {item.quantity}x {item.product_name}
                        </span>
                        <span>${(cobrados * item.unit_price).toFixed(2)}</span>
                      </div>
                      {canjeados > 0 && (
                        <div className="flex justify-between text-xs text-green-700 pl-4">
                          <span>{canjeados} canjeado{canjeados > 1 ? 's' : ''} por puntos</span>
                          <span className="line-through">${(canjeados * item.unit_price).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${useMemo(() => {
                    if (!order.items) return '0.00';
                    let total = 0;
                    for (const item of order.items) {
                      const redeemed = redeemedProducts.find(rp => rp.product_id === item.product_id);
                      const canjeados = redeemed ? redeemed.quantity : 0;
                      const cobrados = item.quantity - canjeados;
                      total += cobrados * item.unit_price;
                    }
                    return total.toFixed(2);
                  }, [order.items, redeemedProducts])}</span>
                </div>
                {order.customer_id && pointsToGain !== null && (
                  <div className="text-xs text-gray-500 text-right mt-1">
                    Puntos a ganar con esta compra: <b>{pointsToGain}</b>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Botón de canje de puntos */}
            {order.customer_id && (
              <div className="mt-4 flex justify-end">
                <RedeemRewardDialog
                  customerId={order.customer_id}
                  redeemedProducts={redeemedProducts}
                  setRedeemedProducts={setRedeemedProducts}
                  orderItems={order.items || []}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Método de pago</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={loadingPaymentMethods}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingPaymentMethods ? "Cargando..." : "Selecciona método de pago"} />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.filter(m => m.is_active).map((method) => (
                  <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-4 border-t p-6 bg-gray-50">
          <Button variant="outline" className="flex-1" onClick={() => onEdit(order)}>
            Editar Orden
          </Button>
          <Button className="flex-1" disabled={!paymentMethod || loadingPaymentMethods} onClick={() => onProcessPayment(order, paymentMethod)}>
            Procesar Pago
          </Button>
        </div>
        <DrawerClose className="absolute top-4 right-4" />
      </DrawerContent>
    </Drawer>
  )
}
