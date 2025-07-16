"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Plus, Minus, Loader2, Search, Trash2, X, Check, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getProducts } from "@/app/actions/products"
import { getCustomers, createCustomer } from "@/app/actions/customers"
import { getPaymentMethods } from "@/app/actions/payment-methods"
import { deleteOrder } from "@/app/actions/orders"
import type { Order, Product, PaymentMethod } from "@/lib/types"
import toast from "@/lib/toast"
import { useRouter } from "next/navigation"


interface EditOrderDialogProps {
  order: Order | null
  open: boolean
  onClose: () => void
  onOrderUpdated: () => void
}

export function EditOrderDialog({ order, open, onClose, onOrderUpdated }: EditOrderDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [tableNumber, setTableNumber] = useState<string | number>("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<Order["status"]>("pendiente")
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false)
  const [newCustomerEmail, setNewCustomerEmail] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

interface OrderItem {
  product: Product
  quantity: number
}

  useEffect(() => {
    if (open && order) {
      setCustomerName(order.customer_name || "")
      setCustomerPhone("")
      setTableNumber(order.table_number || "")
      setNotes(order.notes || "")
      setStatus(order.status)
      setPaymentMethodId(order.payment_method_id || null)
      setOrderItems((order.items || []).map(item => ({
        product: {
          id: item.product_id,
          user_id: 1, // Mock user_id
          name: item.product_name,
          price: item.unit_price,
          is_available: true,
          created_at: new Date().toISOString(),
        } as Product,
        quantity: item.quantity
      })))
      setCustomerId(order.customer_id || null)
      loadProducts()
      loadPaymentMethods()
      setShowAddCustomer(false)
      setShowAddCustomerForm(false)
    }
  }, [open, order])

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts(products)
    }
  }, [searchTerm, products])

  const loadProducts = async () => {
    try {
      const productsData = await getProducts()
      const availableProducts = productsData.filter((p) => p.is_available)
      setProducts(availableProducts)
      setFilteredProducts(availableProducts)
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

  const loadPaymentMethods = async () => {
    try {
      const data = await getPaymentMethods()
      setPaymentMethods(data)
    } catch (error) {
      console.error("Error loading payment methods:", error)
    }
  }

  const addToOrder = (product: Product) => {
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        return [...prev, { product, quantity: 1 }]
      }
    })
  }

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems((prev) => prev.filter((item) => item.product.id !== productId))
    } else {
      setOrderItems((prev) => prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item)))
    }
  }

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  // --- Customer Autocomplete ---
  useEffect(() => {
    // Solo buscar si el usuario ha escrito y el campo está enfocado
    if (!customerName.trim() || !showAddCustomer) {
      setCustomerSuggestions([])
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setIsSearchingCustomer(true)
    searchTimeout.current = setTimeout(async () => {
      const customers = await getCustomers(customerName.trim())
      setCustomerSuggestions(customers)
      setIsSearchingCustomer(false)
    }, 400)
  }, [customerName, showAddCustomer])

  const handleSelectCustomer = (customer: any) => {
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone || "")
    setCustomerId(customer.id)
    setShowAddCustomer(false)
    setCustomerSuggestions([])
  }

  const handleAddCustomer = () => {
    setShowAddCustomerForm(true)
  }

  const handleConfirmAddCustomer = async () => {
    if (!customerName.trim()) return
    setIsLoading(true)
    try {
      const newCustomer = await createCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: newCustomerEmail.trim() || undefined,
        address: newCustomerAddress.trim() || undefined
      })
      setCustomerId(newCustomer.id)
      setShowAddCustomer(false)
      setShowAddCustomerForm(false)
      setCustomerSuggestions([])
      setNewCustomerEmail("")
      setNewCustomerAddress("")
    } catch (e) {
      setError("Error al agregar cliente")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      setError("El nombre del cliente es requerido")
      return
    }
    if (orderItems.length === 0) {
      setError("Debe agregar al menos un producto al pedido")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      let safeCustomerId = customerId;
      if (safeCustomerId === undefined || safeCustomerId === null || Number.isNaN(Number(safeCustomerId))) safeCustomerId = null;
      else safeCustomerId = Number(safeCustomerId);
      const response = await fetch(`/api/orders/${order?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: safeCustomerId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          table_number: tableNumber,
          notes,
          status,
          payment_method_id: paymentMethodId,
          items: orderItems.map((item) => ({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_price: item.product.price * item.quantity,
          })),
          total: getTotalAmount(),
        })
      })
      const result = await response.json()
      if (result.success) {
        toast.success("¡Orden actualizada correctamente!")
        // Refrescar las órdenes primero
        if (typeof onOrderUpdated === "function") onOrderUpdated();
        // Luego cerrar el diálogo
        setTimeout(() => {
          if (typeof onClose === "function") onClose();
        }, 50);
      } else {
        setError(result.error || "Error al actualizar la orden")
      }
    } catch (error) {
      setError("Error al actualizar la orden")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!order) return
    if (!confirm("¿Estás seguro de que quieres eliminar esta orden?")) return
    setIsLoading(true)
    try {
      await deleteOrder(order.id)
      onOrderUpdated()
      onClose()
    } catch (e) {
      setError("Error al eliminar la orden")
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setOrderItems([])
      setCustomerName("")
      setCustomerPhone("")
      setTableNumber("")
      setNotes("")
      setStatus("pendiente")
      setPaymentMethodId(null)
      setError(null)
      setCustomerId(null)
      setCustomerSuggestions([])
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pedido</DialogTitle>
          <DialogDescription>
            Modifica los datos del pedido, cliente, productos y estado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Información del Cliente</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customer-name">Nombre del Cliente *</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setShowAddCustomer(true); setShowAddCustomerForm(false) }}
                    placeholder="Nombre completo"
                    disabled={isLoading}
                    autoComplete="off"
                    onFocus={() => setShowAddCustomer(true)}
                  />
                  {isSearchingCustomer && <div className="text-xs text-gray-400">Buscando...</div>}
                  {showAddCustomer && customerSuggestions.length > 0 && (
                    <div className="bg-white border rounded shadow mt-1 max-h-32 overflow-y-auto">
                      {customerSuggestions.map((c) => (
                        <div key={c.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectCustomer(c)}>
                          {c.name} <span className="text-xs text-gray-500">{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showAddCustomer && customerName.trim() && customerSuggestions.length === 0 && !isSearchingCustomer && !showAddCustomerForm && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={handleAddCustomer} disabled={isLoading}>
                      Agregar nuevo cliente
                    </Button>
                  )}
                  {showAddCustomerForm && (
                    <div className="mt-2 space-y-2 p-2 border rounded bg-gray-50">
                      <div>
                        <Label htmlFor="new-customer-name">Nombre *</Label>
                        <Input
                          id="new-customer-name"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-customer-phone">Teléfono</Label>
                        <Input
                          id="new-customer-phone"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-customer-email">Email <span className="text-xs text-gray-400">(opcional)</span></Label>
                        <Input
                          id="new-customer-email"
                          value={newCustomerEmail}
                          onChange={e => setNewCustomerEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-customer-address">Dirección <span className="text-xs text-gray-400">(opcional)</span></Label>
                        <Input
                          id="new-customer-address"
                          value={newCustomerAddress}
                          onChange={e => setNewCustomerAddress(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={handleConfirmAddCustomer} disabled={isLoading}>
                          Guardar cliente
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddCustomerForm(false)} disabled={isLoading}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="customer-phone">Teléfono</Label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Número de teléfono"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="table-number">Mesa</Label>
                  <Input
                    id="table-number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Número de mesa"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Detalle</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas o detalles"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_proceso">En Proceso</SelectItem>
                      <SelectItem value="listo">Listo</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                      <SelectItem value="completado">Completado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Método de Pago</Label>
                  <Select 
                    value={paymentMethodId?.toString() || ""} 
                    onValueChange={(value) => setPaymentMethodId(value ? Number(value) : null)} 
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin especificar</SelectItem>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id.toString()}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* Order Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Resumen del Pedido</h3>
              <Card>
                <CardContent className="p-4">
                  {orderItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hay productos en el pedido</p>
                  ) : (
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{item.product.name}</div>
                            <div className="text-sm text-muted-foreground">{formatPrice(item.product.price)} c/u</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              disabled={isLoading}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              disabled={isLoading}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateQuantity(item.product.id, 0)}
                              disabled={isLoading}
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>{formatPrice(getTotalAmount())}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Product Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Seleccionar Productos</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <Card key={product.id} className="cursor-pointer hover:bg-muted/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">{product.description}</div>
                          )}
                          <div className="text-sm font-medium text-green-600">{formatPrice(product.price)}</div>
                          {product.category_name && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {product.category_name}
                            </Badge>
                          )}
                        </div>
                        <Button size="sm" onClick={() => addToOrder(product)} disabled={isLoading}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}
        <DialogFooter>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
            <Trash2 className="w-4 h-4 mr-2" /> Eliminar orden
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || orderItems.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando cambios...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirmar cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
