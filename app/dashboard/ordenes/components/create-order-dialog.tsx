"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Plus, Minus, ShoppingCart, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getProducts } from "@/app/actions/products"
import { createOrder } from "@/app/actions/orders"
import { getCustomers, createCustomer } from "@/app/actions/customers"
import type { Product } from "@/lib/types"

interface CreateOrderDialogProps {
  children: React.ReactNode
}

interface OrderItem {
  product: Product
  quantity: number
}

export function CreateOrderDialog({ children }: CreateOrderDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in")
  const [paymentMethod, setPaymentMethod] = useState("Efectivo")
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Load products when dialog opens
  useEffect(() => {
    if (open) {
      loadProducts()
    }
  }, [open])

  // Filter products based on search term
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
      const formData = new FormData();
      formData.append("customerName", customerName.trim());
      formData.append("customerPhone", customerPhone.trim());
      formData.append("orderType", orderType);
      formData.append("paymentMethod", paymentMethod);
      formData.append("items", JSON.stringify(orderItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }))));
      formData.append("total", String(getTotalAmount()));
      const result = await createOrder(formData);
      if (result.success) {
        setOpen(false)
        setOrderItems([])
        setCustomerName("")
        setCustomerPhone("")
        setOrderType("dine_in")
        setPaymentMethod("Efectivo")
        setSearchTerm("")
      } else {
        setError(result.error || "Error al crear el pedido")
      }
    } catch (error) {
      setError("Error al crear el pedido")
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
      setOrderType("dine_in")
      setPaymentMethod("Efectivo")
      setSearchTerm("")
      setError(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Pedido</DialogTitle>
          <DialogDescription>
            Crea un nuevo pedido seleccionando productos y especificando los datos del cliente.
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
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre completo"
                    disabled={isLoading}
                  />
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
                  <Label>Tipo de Pedido</Label>
                  <Select value={orderType} onValueChange={(value: any) => setOrderType(value)} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine_in">Para comer aquí</SelectItem>
                      <SelectItem value="takeaway">Para llevar</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isLoading}>
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
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || orderItems.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando Pedido...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Crear Pedido ({formatPrice(getTotalAmount())})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
