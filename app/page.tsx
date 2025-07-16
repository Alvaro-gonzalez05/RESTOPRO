import { redirect } from "next/navigation"

export default function HomePage() {
  // Redirigir directamente al login
  redirect("/login")
}
