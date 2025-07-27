import type React from "react"
import { Sidebar } from "./components/sidebar"
import { requireAuth } from "@/lib/auth"
import ChatbotFloating from "./components/chatbot-floating"

// Forzar renderizado dinámico para autenticación
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
      <ChatbotFloating userId={user.id} />
    </div>
  )
}
