import { getCurrentUser } from "@/lib/auth"
import { ConfigurationForm } from "./components/configuration-form"
import { PaymentMethodsConfig } from "./components/payment-methods-config"

// Forzar renderizado dinámico para evitar errores de build
export const dynamic = 'force-dynamic'

export default async function ConfigurationPage() {
  const user = await getCurrentUser()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>

      <ConfigurationForm user={user!} />
      
      <PaymentMethodsConfig />
    </div>
  )
}
