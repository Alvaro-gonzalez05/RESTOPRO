"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Order } from "@/lib/types"

interface RecentOrdersTableProps {
  orders: Order[]
}

const statusColors = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  listo: "bg-orange-100 text-orange-800",
  entregado: "bg-cyan-100 text-cyan-800",
  cancelado: "bg-red-100 text-red-800",
}

const statusLabels = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  completado: "Completado",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Órdenes Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell>${typeof order.total === "number" ? order.total.toFixed(2) : Number(order.total).toFixed(2)}</TableCell>
                <TableCell>
                  {order.status in statusColors ? (
                    <Badge className={`${statusColors[order.status]} hover:bg-transparent hover:text-current pointer-events-none`}>{statusLabels[order.status]}</Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-600 pointer-events-none">{order.status}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length === 0 && <div className="text-center py-8 text-gray-500">No hay órdenes recientes</div>}
      </CardContent>
    </Card>
  )
}
