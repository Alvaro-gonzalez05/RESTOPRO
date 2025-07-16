"use client"
import { useState, useCallback, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { OrdersGrid } from "./orders-grid"

function getLastOrders(orders: any[], count = 20) {
  // Ordenar por fecha descendente y tomar las últimas 'count'
  return [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, count)
}

export default function OrdersTabs({ orders: initialOrders }: { orders: any[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [searchTerm, setSearchTerm] = useState("")

  // Sincronizar con los datos iniciales cuando cambien
  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  // Refresca las órdenes desde la API
  const refreshOrders = useCallback(async () => {
    try {
      console.log("Refrescando órdenes...")
      const res = await fetch("/api/orders", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        console.log("Órdenes actualizadas:", data.length)
        setOrders(data)
      } else {
        console.error("Error al obtener órdenes:", res.status)
      }
    } catch (error) {
      console.error("Error al refresc ar órdenes:", error)
    }
  }, [])

  return (
    <div className="space-y-4">
      <Tabs defaultValue="ultimas" className="w-full">
        <TabsList className="grid w-full grid-cols-6 rounded-[30px]">
          <TabsTrigger value="ultimas" className="rounded-[30px]">Últimas órdenes</TabsTrigger>
          <TabsTrigger value="todas" className="rounded-[30px]">Todas</TabsTrigger>
          <TabsTrigger value="pendientes" className="rounded-[30px]">Pendientes</TabsTrigger>
          <TabsTrigger value="listas" className="rounded-[30px]">Listas</TabsTrigger>
          <TabsTrigger value="entregadas" className="rounded-[30px]">Entregadas</TabsTrigger>
          <TabsTrigger value="completadas" className="rounded-[30px]">Completadas</TabsTrigger>
        </TabsList>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por mesa, cliente, detalles o estado..."
            className="pl-10 py-3 rounded-[30px]"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <TabsContent value="ultimas" className="mt-6">
          <OrdersGrid orders={getLastOrders(orders)} searchTerm={searchTerm} onOrdersChanged={refreshOrders} />
        </TabsContent>
        <TabsContent value="todas" className="mt-6">
          <OrdersGrid orders={orders} searchTerm={searchTerm} onOrdersChanged={refreshOrders} />
        </TabsContent>
        <TabsContent value="pendientes" className="mt-6">
          <OrdersGrid orders={orders.filter(o => o.status === "pendiente")} searchTerm={searchTerm} onOrdersChanged={refreshOrders} />
        </TabsContent>
        <TabsContent value="listas" className="mt-6">
          <OrdersGrid orders={orders.filter(o => o.status === "listo")} searchTerm={searchTerm} onOrdersChanged={refreshOrders} />
        </TabsContent>
        <TabsContent value="entregadas" className="mt-6">
          <OrdersGrid orders={orders.filter(o => o.status === "entregado")} searchTerm={searchTerm} onOrdersChanged={refreshOrders} />
        </TabsContent>
        <TabsContent value="completadas" className="mt-6">
          <OrdersGrid orders={orders.filter(o => o.status === "completado")} searchTerm={searchTerm} onOrdersChanged={refreshOrders} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
