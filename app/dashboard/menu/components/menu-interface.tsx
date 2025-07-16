"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ShoppingCart, Plus, Minus, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createOrder } from "@/app/actions/orders"
import { getCustomers, createCustomer } from "@/app/actions/customers"
import { toast } from "sonner"
import { showSuccessAlert, showErrorAlert } from "@/lib/sweetalert"
import type { Product, Category } from "@/lib/types"

interface CartItem extends Product {
  quantity: number
}


type MenuInterfaceProps = {
  products: Product[];
  categories: Category[];
};

function MenuInterface({ products, categories }: MenuInterfaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | number>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Buscar por nombre de producto, descripción o nombre de categoría
  let filteredProducts = products.filter((product: Product) => {
    const search = searchTerm.trim().toLowerCase();
    const categoryObj = categories.find((cat: Category) => cat.id === product.category_id);
    const categoryName = categoryObj ? categoryObj.name.toLowerCase() : "";
    const matchesSearch =
      product.name.toLowerCase().includes(search) ||
      (product.description && product.description.toLowerCase().includes(search)) ||
      categoryName.includes(search);
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory && product.is_available;
  });
  // Ordenar por precio
  filteredProducts = filteredProducts.sort((a: Product, b: Product) => {
    const priceA = Number(a.price);
    const priceB = Number(b.price);
    return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
  });


  // Agregar al carrito
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
    toast.success(`${product.name} agregado al carrito`);
  };


  // Actualizar cantidad en carrito
  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) => prevCart.map((item) => (item.id === productId ? { ...item, quantity: newQuantity } : item)));
  };


  // Remover del carrito
  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };


  // Calcular total
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);


  // Buscar clientes mientras se escribe el nombre
  useEffect(() => {
    if (!customerName.trim()) {
      setCustomerSuggestions([]);
      setShowAddCustomer(false);
      setCustomerId(null);
      return;
    }
    setIsSearchingCustomer(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const results = await getCustomers(customerName.trim());
      setCustomerSuggestions(results);
      setShowAddCustomer(false); // Nunca mostrar automáticamente
      setIsSearchingCustomer(false);
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName]);

  // Al seleccionar un cliente de la lista
  const handleSelectCustomer = (customer: any) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || "");
    setCustomerEmail(customer.email || "");
    setCustomerAddress(customer.address || "");
    setCustomerSuggestions([]);
    setShowAddCustomer(false);
  };

  // Alta rápida de cliente
  const handleAddCustomer = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Nombre y teléfono son obligatorios para agregar un cliente nuevo");
      return;
    }
    setIsCreatingOrder(true);
    try {
      const newCustomer = await createCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim() || undefined,
        address: customerAddress.trim() || undefined,
      });
      setCustomerId(newCustomer.id);
      setCustomerSuggestions([]);
      setShowAddCustomer(false);
      toast.success("Cliente creado y seleccionado");
    } catch (e) {
      toast.error("Error al crear el cliente");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Crear pedido
  const handleCreateOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Por favor ingresa el nombre del cliente");
      return;
    }
    if (!customerId && !customerPhone.trim()) {
      toast.error("Por favor ingresa el teléfono del cliente");
      return;
    }
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setIsCreatingOrder(true);
    try {
      let finalCustomerId = customerId;
      // Buscar cliente existente por nombre o teléfono si no se seleccionó uno
      if (!finalCustomerId) {
        const posibles = await getCustomers(customerName.trim());
        const match = posibles.find((c: any) =>
          c.name.trim().toLowerCase() === customerName.trim().toLowerCase() ||
          (customerPhone.trim() && c.phone && c.phone.replace(/\D/g, "") === customerPhone.trim().replace(/\D/g, ""))
        );
        if (match) finalCustomerId = match.id;
      }
      const items = cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
        total_price: Number(item.price) * item.quantity,
        category_id: item.category_id || null,
      }));
      const formData = new FormData();
      if (finalCustomerId) formData.append("customerId", String(finalCustomerId));
      formData.append("customerName", customerName.trim());
      formData.append("customerPhone", customerPhone.trim());
      if (customerEmail.trim()) formData.append("customerEmail", customerEmail.trim());
      if (customerAddress.trim()) formData.append("customerAddress", customerAddress.trim());
      formData.append("tableNumber", tableNumber.trim());
      formData.append("notes", notes.trim());
      formData.append("total", String(total));
      formData.append("items", JSON.stringify(items));
      const result = await createOrder(formData);
      if (result && result.success) {
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setCustomerAddress("");
        setCustomerId(null);
        setTableNumber("");
        setNotes("");
        setIsCartOpen(false);
        showSuccessAlert("¡Pedido creado exitosamente!", `El pedido #${result.orderId} ha sido registrado.`);
      } else {
        showErrorAlert("Error al crear el pedido", result?.error || "Ocurrió un error inesperado.");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Error al crear el pedido");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Mostrar formulario solo al hacer clic en 'Agregar nuevo'
  const handleShowAddCustomer = () => {
    setShowAddCustomer(true);
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
  };

  return (
    <div className="space-y-6">
      {/* Título de la sección */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Menú</h1>
      </div>
      {/* Header con búsqueda, filtro y carrito */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar productos o categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            style={{ borderRadius: "30px" }}
          />
        </div>
        <div className="flex gap-2">
          {/* Botón filtro de precio */}
          <Button
            className="relative flex items-center gap-2"
            style={{ borderRadius: "30px" }}
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Ordenar por mayor precio' : 'Ordenar por menor precio'}
          >
            {sortOrder === 'asc' ? (
              <>
                <span>Menor precio</span>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M8 17l4 4 4-4M12 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </>
            ) : (
              <>
                <span>Mayor precio</span>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M16 7l-4-4-4 4M12 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </>
            )}
          </Button>
          {/* Botón carrito */}
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button className="relative" style={{ borderRadius: "30px" }}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Carrito
                {cart.length > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[20px] h-5 flex items-center justify-center text-xs"
                    style={{ borderRadius: "30px" }}
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Carrito de Compras</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">El carrito está vacío</p>
                ) : (
                  <>
                    {/* Items del carrito */}
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.name}</h4>
                            <p className="text-red-600 font-semibold">${Number(item.price).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              style={{ borderRadius: "30px" }}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              style={{ borderRadius: "30px" }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromCart(item.id)}
                              style={{ borderRadius: "30px" }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Total */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total:</span>
                        <span className="text-red-600">${total.toFixed(2)}</span>
                      </div>
                    </div>
                    {/* Formulario de pedido */}
                    <div className="space-y-4 border-t pt-4">
                      <div>
                        <Label htmlFor="customerName">Nombre del Cliente *</Label>
                        <div className="relative">
                          <Input
                            id="customerName"
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              setCustomerId(null);
                              // El formulario solo aparece si showAddCustomer es true (por botón)
                            }}
                            placeholder="Ingresa el nombre del cliente"
                            style={{ borderRadius: "30px" }}
                            autoComplete="off"
                            disabled={isCreatingOrder}
                          />
                          {customerSuggestions.length > 0 && !customerId && (
                            <div className="absolute z-10 bg-white border rounded w-full mt-1 max-h-40 overflow-y-auto shadow">
                              {customerSuggestions.map((c) => (
                                <div
                                  key={c.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handleSelectCustomer(c)}
                                >
                                  <div className="font-medium">{c.name}</div>
                                  <div className="text-xs text-gray-500">{c.phone}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {customerSuggestions.length === 0 && !isSearchingCustomer && !showAddCustomer && customerName.trim() && !customerId && (
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">Cliente no encontrado.</span>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="ml-2 rounded-[30px] px-3 py-1 h-7"
                                onClick={handleShowAddCustomer}
                                disabled={isCreatingOrder}
                              >
                                Agregar nuevo
                              </Button>
                            </div>
                          )}
                          {/* Formulario de alta rápida solo si el usuario toca 'Agregar nuevo' */}
                          {showAddCustomer && (
                            <div className="space-y-2 border rounded p-3 bg-gray-50 mt-2">
                              <Label htmlFor="customer-phone">Teléfono *</Label>
                              <Input
                                id="customer-phone"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="Número de teléfono"
                                disabled={isCreatingOrder}
                              />
                              <Label htmlFor="customer-email">Email</Label>
                              <Input
                                id="customer-email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                placeholder="Correo electrónico (opcional)"
                                disabled={isCreatingOrder}
                              />
                              <Label htmlFor="customer-address">Dirección</Label>
                              <Input
                                id="customer-address"
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                                placeholder="Dirección (opcional)"
                                disabled={isCreatingOrder}
                              />
                              <div className="flex gap-2 pt-1">
                                <Button type="button" onClick={handleAddCustomer} disabled={isCreatingOrder || !customerName.trim() || !customerPhone.trim()}>
                                  Guardar Cliente
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowAddCustomer(false)} disabled={isCreatingOrder}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="tableNumber">Número de Mesa</Label>
                          <Input
                            id="tableNumber"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            placeholder="Ej: Mesa 5"
                            style={{ borderRadius: "30px" }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">Notas Adicionales</Label>
                          <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Instrucciones especiales..."
                            className="resize-none"
                            style={{ borderRadius: "15px" }}
                          />
                        </div>
                        <Button
                          onClick={handleCreateOrder}
                          disabled={isCreatingOrder || !customerName.trim() || cart.length === 0}
                          className="w-full"
                          style={{ borderRadius: "30px" }}
                        >
                          {isCreatingOrder ? "Creando Pedido..." : "Crear Pedido"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filtros de categorías */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          onClick={() => setSelectedCategory("all")}
          className="whitespace-nowrap"
          style={{ borderRadius: "30px" }}
        >
          Todos
        </Button>
        {categories.map((category: Category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(category.id)}
            className="whitespace-nowrap"
            style={{ borderRadius: "30px" }}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product: Product) => (
          <div
            key={product.id}
            onClick={() => addToCart(product)}
            className="bg-white border border-gray-200 p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            style={{
              borderRadius: "10px",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            }}
          >
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900" style={{ textAlign: "left" }}>
                {product.name}
              </h3>
              {product.description && (
                <p className="text-sm text-gray-600" style={{ textAlign: "left" }}>
                  {product.description}
                </p>
              )}
              <p
                className="text-lg font-bold text-red-600"
                style={{
                  textAlign: "left",
                  display: "block",
                }}
              >
                ${Number(product.price || 0).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}

export { MenuInterface };
