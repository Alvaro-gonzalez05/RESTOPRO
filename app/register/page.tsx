import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { RegisterForm } from "./register-form"
import { Utensils } from "lucide-react"

export default async function RegisterPage() {
  const user = await getCurrentUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">RestoPro</h1>
          </div>
          <h2 className="text-lg text-gray-600 mb-1">Crea tu cuenta de administrador</h2>
          <p className="text-sm text-gray-500">Gestiona tu restaurante de manera profesional</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
