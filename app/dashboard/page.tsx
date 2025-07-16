import { Suspense } from "react"
import { ShoppingCart, DollarSign, Users, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getDashboardStats, getRecentOrders } from "@/app/actions/dashboard"
import { RecentOrdersTable } from "./components/recent-orders-table"
import { DashboardCharts } from "./components/dashboard-charts"

async function DashboardStats() {
  const stats = await getDashboardStats()

  const statCards = [
    {
      title: "Órdenes Hoy",
      value: stats.ordersToday,
      icon: ShoppingCart,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Ingresos Hoy",
      value: `$${stats.revenueToday.toLocaleString()}`,
      icon: DollarSign,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Clientes Nuevos",
      value: stats.newCustomers,
      icon: Users,
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    {
      title: "Productos",
      value: stats.totalProducts,
      icon: Package,
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function RecentOrders() {
  const orders = await getRecentOrders()
  return <RecentOrdersTable orders={orders} />
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      
      <Suspense fallback={<div>Cargando estadísticas...</div>}>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Análisis de Ventas</h2>
            <div className="w-48 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`bg-white p-6 rounded-lg shadow ${i === 0 ? "lg:col-span-2" : ""}`}>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      }>
        <DashboardCharts />
      </Suspense>

      <Suspense fallback={<div>Cargando órdenes...</div>}>
        <RecentOrders />
      </Suspense>
    </div>
  )
}
