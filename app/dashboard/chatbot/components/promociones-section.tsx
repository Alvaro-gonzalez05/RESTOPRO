'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'

export function PromocionesSection() {
  const { user } = useUser()
  return user ? <PromocionesContent user={user} /> : <div>Cargando...</div>
}

function PromocionesContent({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h2 className="text-2xl font-semibold mb-4">Promociones</h2>
        <p className="text-gray-600">
          Gestión de promociones y campañas de marketing por WhatsApp
        </p>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600">
            Esta sección está en desarrollo. Próximamente podrás crear y gestionar 
            promociones personalizadas para tus clientes.
          </p>
        </div>
      </div>
    </div>
  )
}