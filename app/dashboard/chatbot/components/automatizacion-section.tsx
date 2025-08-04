'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'

export function AutomatizacionSection() {
  const { user } = useUser()
  return user ? <AutomatizacionContent user={user} /> : <div>Cargando...</div>
}

function AutomatizacionContent({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h2 className="text-2xl font-semibold mb-4">Automatización</h2>
        <p className="text-gray-600">
          Configura reglas automáticas para envío de mensajes y promociones
        </p>
        <div className="mt-6 p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-600">
            Esta sección está en desarrollo. Próximamente podrás crear reglas 
            de automatización para envío automático de mensajes basado en 
            comportamiento de clientes.
          </p>
        </div>
      </div>
    </div>
  )
}