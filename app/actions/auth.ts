"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/auth"

export async function registerAction(prevState: any, formData: any) {
  try {
    console.log("Register action called with:", formData)

    // Extraer datos del objeto recibido
    const email = formData?.email || ""
    const password = formData?.password || ""
    const confirmPassword = formData?.confirmPassword || ""
    const restaurantName = formData?.restaurantName || ""
    const fullName = formData?.fullName || ""
    const phone = formData?.phone || ""

    // Validaciones
    if (!email || !password || !confirmPassword || !restaurantName || !fullName || !phone) {
      return { error: "Todos los campos son requeridos" }
    }

    if (password !== confirmPassword) {
      return { error: "Las contraseñas no coinciden" }
    }

    if (password.length < 6) {
      return { error: "La contraseña debe tener al menos 6 caracteres" }
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { error: "Por favor ingresa un email válido" }
    }

    // Validar teléfono (formato básico)
    const phoneRegex = /^[\d\s\-+()]+$/
    if (!phoneRegex.test(phone) || phone.length < 8) {
      return { error: "Por favor ingresa un número de teléfono válido (mínimo 8 dígitos)" }
    }

    // Validar nombre completo
    if (fullName.trim().length < 3) {
      return { error: "El nombre completo debe tener al menos 3 caracteres" }
    }

    // Validar nombre del restaurante
    if (restaurantName.trim().length < 2) {
      return { error: "El nombre del restaurante debe tener al menos 2 caracteres" }
    }

    // Verificar si el usuario ya existe
    const existingUsers = await sql(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    )

    if (existingUsers.length > 0) {
      return { error: "El email ya está registrado" }
    }

    // Crear nuevo usuario
    const hashedPassword = await hashPassword(password)
    const newUsers = await sql(
      `INSERT INTO users (email, password_hash, restaurant_name, full_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [email.toLowerCase(), hashedPassword, restaurantName.trim(), fullName.trim(), phone.trim()]
    )

    const userId = newUsers[0].id
    console.log("User created successfully with ID:", userId)

    // Guardar user_id en la cookie automáticamente
    try {
      const cookieStore = await cookies()
      cookieStore.set("user_id", String(userId), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 días
        path: "/",
      })
      console.log("User ID cookie set successfully")
    } catch (cookieError) {
      console.error("Cookie error:", cookieError)
      return { success: true, userId, message: "Cuenta creada exitosamente", needsAuth: true }
    }

    // Si todo sale bien, devolver éxito para redirección automática
    return { success: true, userId, message: "Cuenta creada exitosamente", redirect: true }
  } catch (error) {
    console.error("Registration error:", error)
    return { error: "Error al crear la cuenta. Por favor intenta nuevamente." }
  }
}

export async function loginAction(prevState: any, formData: any) {
  try {
    console.log("Login action called with:", formData)

    const email = formData?.email || ""
    const password = formData?.password || ""

    if (!email || !password) {
      return { error: "Email y contraseña son requeridos" }
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { error: "Por favor ingresa un email válido" }
    }

    const users = await sql(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [email.toLowerCase()]
    )

    if (users.length === 0) {
      return { error: "Credenciales inválidas" }
    }

    const user = users[0]
    const isValidPassword = await verifyPassword(password, user.password_hash)

    if (!isValidPassword) {
      return { error: "Credenciales inválidas" }
    }

    // Guardar user_id en la cookie
    try {
      const cookieStore = await cookies()
      cookieStore.set("user_id", String(user.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 días
        path: "/",
      })
      console.log("Login successful for user:", user.id)
      return { success: true, userId: user.id, message: "Inicio de sesión exitoso", redirect: true }
    } catch (cookieError) {
      console.error("Cookie error:", cookieError)
      return { success: true, userId: user.id, message: "Inicio de sesión exitoso", needsAuth: true }
    }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "Error al iniciar sesión. Por favor intenta nuevamente." }
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete("auth-token")
  } catch (error) {
    console.error("Logout error:", error)
  }
  redirect("/login")
}
