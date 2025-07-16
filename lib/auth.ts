import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { sql } from "./db"
import type { User } from "./types"


/* -------------------------------------------------------------------------- */
/*                         Password hashing utilities                         */
/* -------------------------------------------------------------------------- */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/* -------------------------------------------------------------------------- */
/*                              Auth-flow helpers                             */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("user_id")?.value
    if (!userId) return null

    const result = await sql`
      SELECT id, email, full_name, restaurant_name, created_at
      FROM users 
      WHERE id = ${Number(userId)}
    `

    if (result.length === 0) return null
    return result[0] as User
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Authentication required")
  }
  return user
}
