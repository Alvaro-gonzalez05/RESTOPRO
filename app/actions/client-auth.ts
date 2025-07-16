"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { generateToken } from "@/lib/auth"

export async function setAuthCookie(userId: number) {
  try {
    const token = generateToken(userId)
    const cookieStore = await cookies()

    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    })

    return { success: true }
  } catch (error) {
    console.error("Cookie error:", error)
    return { error: "Error al establecer la sesión" }
  }
}

export async function redirectToDashboard() {
  redirect("/dashboard")
}
