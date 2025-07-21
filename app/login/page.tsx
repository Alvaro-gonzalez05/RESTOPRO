import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { LoginForm } from "./login-form"
import { Utensils } from "lucide-react"
import { headers } from "next/headers"

// Forzar renderizado dinámico para evitar errores de build
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect("/dashboard")
  }

  // Detectar si la sesión expiró por query param
  const search = headers().get('x-invoke-path') || headers().get('referer') || '';
  const url = typeof window === 'undefined' ? (headers().get('next-url') || '') : window.location.search;
  const expired = url.includes('expired=1');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">RestoPro</h1>
          </div>
          <h2 className="text-xl text-gray-600">Bienvenido de vuelta</h2>
          <p className="text-sm text-gray-500 mt-2">Inicia sesión para gestionar tu restaurante</p>
          {expired && (
            <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
              Su sesión expiró. Por favor, inicie sesión nuevamente.
            </div>
          )}
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
