"use client"

import { useState } from "react"
import { Plus, ShoppingCart, Users, Receipt, Package, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function QuickActionsMenu() {
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)

  const actions = [
    {
      title: "Nueva Venta",
      subtitle: "Tecla F5",
      icon: ShoppingCart,
      color: "bg-emerald-500 hover:bg-emerald-600",
      onClick: () => window.location.href = "/dashboard/ordenes"
    },
    {
      title: "Nuevo Cliente",
      subtitle: "Tecla F6",
      icon: Users,
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => alert("Funcionalidad de cliente en desarrollo")
    },
    {
      title: "Nuevo Gasto",
      subtitle: "Tecla F7",
      icon: Receipt,
      color: "bg-red-500 hover:bg-red-600",
      onClick: () => alert("Funcionalidad de gasto en desarrollo")
    },
    {
      title: "Nuevo Proveedor",
      subtitle: "Tecla F8",
      icon: Truck,
      color: "bg-orange-500 hover:bg-orange-600",
      onClick: () => alert("Funcionalidad de proveedor en desarrollo")
    },
    {
      title: "Productos",
      subtitle: "Gestionar",
      icon: Package,
      color: "bg-purple-500 hover:bg-purple-600",
      onClick: () => window.location.href = "/dashboard/productos"
    }
  ]

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Acciones Rápidas</CardTitle>
        <p className="text-sm text-gray-600">Accede rápidamente a las funciones principales</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`${action.color} text-white rounded-2xl p-6 text-center transition-all duration-200 transform hover:scale-105 hover:shadow-lg`}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <action.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                  <p className="text-xs opacity-80">{action.subtitle}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
