import type React from "react"
import { Sidebar } from "./components/sidebar"
import { requireAuth } from "@/lib/auth"
import ChatbotFloating from "./components/chatbot-floating"

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <div className="relative h-screen overflow-hidden bg-gray-100">
      <div className="fixed inset-y-0 left-0 z-30 w-64">
        <Sidebar user={user} />
      </div>

      <main className="absolute inset-0 overflow-y-auto bg-gray-50 pl-64">
        <div className="p-6">
          {children}
        </div>
      </main>

      <div className="fixed bottom-4 right-4 z-40">
        <ChatbotFloating userId={user.id} />
      </div>
    </div>
  )
}