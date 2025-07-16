"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loginAction } from "@/app/actions/auth"
import { setAuthCookie } from "@/app/actions/client-auth"
import { showSuccessAlert, showErrorAlert } from "@/lib/sweetalert"


const initialState = { error: null, success: false }


export function LoginForm() {
  const [state, setState] = useState(initialState)
  const [isPending, setIsPending] = useState(false)
  const [isPendingTransition, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailValid, setEmailValid] = useState<boolean | null>(null)

  // Validar email en tiempo real
  useEffect(() => {
    if (email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      setEmailValid(emailRegex.test(email))
    } else {
      setEmailValid(null)
    }
  }, [email])

  // Manejar respuesta del servidor
  useEffect(() => {
    if (state?.success) {
      showSuccessAlert("¡Bienvenido!", "Inicio de sesión exitoso. Redirigiendo...")

      // Si necesita autenticación manual (falló la cookie en el servidor)
      if (state.needsAuth && state.userId) {
        setAuthCookie(state.userId).then(() => {
          setTimeout(() => {
            window.location.href = "/dashboard"
          }, 1500)
        })
      } else if (state.redirect) {
        // Si la cookie se estableció correctamente en el servidor
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1500)
      }
    } else if (state?.error) {
      showErrorAlert("Error de inicio de sesión", state.error)
    }
  }, [state])


  const handleSubmit = async () => {
    if (!emailValid) {
      showErrorAlert("Email inválido", "Por favor ingresa un email válido")
      return
    }

    if (!password) {
      showErrorAlert("Contraseña requerida", "Por favor ingresa tu contraseña")
      return
    }

    setIsPending(true)
    setState(initialState)
    try {
      // Para compatibilidad con server actions que esperan (prevState, formData)
      const result = await loginAction(undefined, {
        email: email.trim(),
        password,
      })
      setState(result)
    } catch (error) {
      setState({ error: 'Error inesperado', success: false })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
        <p className="text-gray-600">Accede a tu panel de administración</p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            await handleSubmit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="tu@email.com"
                className={`h-11 pr-8 ${
                  emailValid === false ? "border-red-500" : emailValid === true ? "border-green-500" : ""
                }`}
                autoComplete="email"
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

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="h-11 pr-10"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            disabled={isPending || isPendingTransition}
          >
            {isPending || isPendingTransition ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Regístrate aquí
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
