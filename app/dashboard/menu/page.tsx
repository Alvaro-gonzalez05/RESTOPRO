import { getProducts, getCategories } from "@/app/actions/products"
import { MenuInterface } from "./components/menu-interface"

// Forzar renderizado dinámico para evitar errores de build
export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories()
  ])
  return (
    <div className="min-h-screen bg-gray-50">
      <MenuInterface products={products} categories={categories} />
    </div>
  )
}
