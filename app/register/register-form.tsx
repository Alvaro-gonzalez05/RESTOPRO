"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { registerAction } from "@/app/actions/auth"
import { setAuthCookie } from "@/app/actions/client-auth"
import { showSuccessAlert, showErrorAlert } from "@/lib/sweetalert"

type RegisterState = {
  error: string | null
  success: boolean
  userId?: any
  message?: string
  redirect?: boolean
  needsAuth?: boolean
}
const initialState: RegisterState = { error: null, success: false }

export function RegisterForm() {
  const [state, setState] = useState<RegisterState>(initialState)
  const [isPending, setIsPending] = useState(false)
  const [isPendingTransition, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados para validaciones en tiempo real
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [restaurantName, setRestaurantName] = useState("")

  // Estados de validación
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null)
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null)

  // Validar email en tiempo real
  useEffect(() => {
    if (email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      setEmailValid(emailRegex.test(email))
    } else {
      setEmailValid(null)
    }
  }, [email])

  // Validar contraseña en tiempo real
  useEffect(() => {
    if (password.length > 0) {
      setPasswordValid(password.length >= 6)
    } else {
      setPasswordValid(null)
    }
  }, [password])

  // Validar que las contraseñas coincidan
  useEffect(() => {
    if (password.length > 0 && confirmPassword.length > 0) {
      setPasswordsMatch(password === confirmPassword)
    } else {
      setPasswordsMatch(null)
    }
  }, [password, confirmPassword])

  // Manejar respuesta del servidor
  useEffect(() => {
    if (state?.success) {
      showSuccessAlert("¡Cuenta creada!", "Bienvenido a RestoPro. Redirigiendo al dashboard...")

      // Si necesita autenticación manual (falló la cookie en el servidor)
      if (state.needsAuth && state.userId) {
        setAuthCookie(state.userId).then(() => {
          setTimeout(() => {
            window.location.href = "/dashboard"
          }, 2000)
        })
      } else if (state.redirect) {
        // Si la cookie se estableció correctamente en el servidor
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 2000)
      }
    } else if (state?.error) {
      showErrorAlert("Error al crear cuenta", state.error)
    }
  }, [state])

  const handleSubmit = async () => {
    // Validaciones finales antes de enviar
    if (!emailValid) {
      showErrorAlert("Email inválido", "Por favor ingresa un email válido")
      return
    }

    if (!passwordValid) {
      showErrorAlert("Contraseña inválida", "La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (!passwordsMatch) {
      showErrorAlert("Contraseñas no coinciden", "Las contraseñas ingresadas no son idénticas")
      return
    }

    if (fullName.trim().length < 3) {
      showErrorAlert("Nombre inválido", "El nombre completo debe tener al menos 3 caracteres")
      return
    }

    if (restaurantName.trim().length < 2) {
      showErrorAlert("Nombre del restaurante inválido", "El nombre del restaurante debe tener al menos 2 caracteres")
      return
    }

    if (phone.trim().length < 8) {
      showErrorAlert("Teléfono inválido", "El número de teléfono debe tener al menos 8 dígitos")
      return
    }

    setIsPending(true)
    setState(initialState)
    try {
      // Para compatibilidad con server actions que esperan (prevState, formData)
      const result = await registerAction(undefined, {
        email: email.trim(),
        password,
        confirmPassword,
        fullName: fullName.trim(),
        phone: phone.trim(),
        restaurantName: restaurantName.trim(),
      })
      setState(result)
    } catch (error) {
      setState({ error: 'Error inesperado', success: false })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">Crear Cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await handleSubmit();
          }}
        >
          {/* Primera fila - Información personal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="fullName" className="text-sm">
                Nombre Completo del Administrador
              </Label>
              <Input
                id="fullName"
                name="fullName"
                required
                placeholder="Juan Pérez García"
                autoComplete="name"
                className="h-9"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-sm">
                Número de Teléfono
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="+1 234 567 8900"
                autoComplete="tel"
                className="h-9"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Segunda fila - Información del restaurante y email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="restaurantName" className="text-sm">
                Nombre del Restaurante
              </Label>
              <Input
                id="restaurantName"
                name="restaurantName"
                required
                placeholder="Mi Restaurante"
                autoComplete="organization"
                className="h-9"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className={`h-9 pr-8 ${
                    emailValid === false ? "border-red-500" : emailValid === true ? "border-green-500" : ""
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailValid !== null && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {emailValid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {emailValid === false && <p className="text-xs text-red-500">Por favor ingresa un email válido</p>}
            </div>
          </div>

          {/* Tercera fila - Contraseñas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  className={`h-9 pr-16 ${
                    passwordValid === false ? "border-red-500" : passwordValid === true ? "border-green-500" : ""
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  {passwordValid !== null && (
                    <div>
                      {passwordValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {passwordValid === false && (
                <p className="text-xs text-red-500">La contraseña debe tener al menos 6 caracteres</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-sm">
                Confirmar Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  className={`h-9 pr-16 ${
                    passwordsMatch === false ? "border-red-500" : passwordsMatch === true ? "border-green-500" : ""
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  {passwordsMatch !== null && (
                    <div>
                      {passwordsMatch ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {passwordsMatch === false && <p className="text-xs text-red-500">Las contraseñas no coinciden</p>}
            </div>
          </div>

          {/* Submit button */}
          <div className="flex flex-col items-center space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full md:w-auto px-8 h-9"
              disabled={isPending || isPendingTransition}
            >
              {isPending || isPendingTransition ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
