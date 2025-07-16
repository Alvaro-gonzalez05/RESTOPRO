import { getOrders, deleteAllOrders } from "@/app/actions/orders"
import { revalidateOrdersPath } from "./actions/revalidate-orders"
import OrdersTabs from "./components/orders-tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw, Trash2 } from "lucide-react"

// Client component para tabs, búsqueda y grid
export default async function OrdersPage() {
  const orders = await getOrders()
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Órdenes</h1>
        <div className="flex gap-3">
          <form action={revalidateOrdersPath}>
            <Button type="submit" className="bg-red-500 hover:bg-red-600 text-white rounded-[30px]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </form>
          <form action={deleteAllOrders}>
            <Button type="submit" variant="destructive" className="rounded-[30px]">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Todas las Órdenes
            </Button>
          </form>
        </div>
      </div>
      <OrdersTabs orders={orders} />
    </div>
  )
}
