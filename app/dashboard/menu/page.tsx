import { getProducts, getCategories } from "@/app/actions/products"
import { MenuInterface } from "./components/menu-interface"

// Hacemos que la página sea un Server Component y cachee los datos por 60 segundos
export const revalidate = 60;

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
