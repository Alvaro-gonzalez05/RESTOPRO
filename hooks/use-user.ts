'use client'

import { useState, useEffect } from 'react'

interface User {
  id: number
  email: string
  name: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Por ahora, simular usuario para desarrollo
    // En producción, esto vendría de tu sistema de autenticación
    setUser({
      id: 1, // ID temporal para desarrollo
      email: 'admin@restopro.com',
      name: 'Administrador'
    })
    setIsLoading(false)
  }, [])

  return { user, isLoading }
}
