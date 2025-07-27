"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ShoppingCart, Menu, Package, Settings, LogOut, User, Utensils, Receipt, Truck, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/app/actions/auth"
import type { User as AdminUser } from "@/lib/types"

interface SidebarProps {
  user: AdminUser
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Órdenes", href: "/dashboard/ordenes", icon: ShoppingCart },
  { name: "Menú", href: "/dashboard/menu", icon: Menu },
  { name: "Productos", href: "/dashboard/productos", icon: Package },
  { name: "Clientes", href: "/dashboard/clientes", icon: User },
  { name: "Gastos", href: "/dashboard/gastos", icon: Receipt },
  { name: "Proveedores", href: "/dashboard/proveedores", icon: Truck },
  { name: "Chatbot", href: "/dashboard/chatbot", icon: MessageCircle },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  // Extraer el nombre del usuario del email si no hay full_name
  const getUserDisplayName = () => {
    if (user.full_name && user.full_name.trim()) {
      return user.full_name
    }
    return user.email.split("@")[0] // Usar la parte antes del @ del email
  }

  const getRestaurantName = () => {
    if (user.restaurant_name && user.restaurant_name.trim()) {
      return user.restaurant_name
    }
    return "Mi Restaurante"
  }

  return (
    <div className="w-64 bg-blue-600 text-white flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Utensils className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-xl font-bold">RestoPro</span>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 pb-6 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-blue-300">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white text-sm truncate" title={getRestaurantName()}>
              {getRestaurantName()}
            </div>
            <div className="text-blue-200 text-xs truncate" title={getUserDisplayName()}>
              {getUserDisplayName()}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation con scroll personalizado */}
      <nav className="flex-1 px-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40">
        <div className="px-2">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? "bg-blue-500 text-white" : "text-blue-100 hover:bg-blue-500 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Botones de acción en la parte inferior */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between space-x-2">
          {/* Botón de Cerrar Sesión */}
          <form action={logoutAction} className="flex-1">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-center text-blue-100 hover:bg-blue-500 hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </form>

          {/* Botón de Configuración */}
          <Link href="/dashboard/configuracion" className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-blue-100 hover:bg-blue-500 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
