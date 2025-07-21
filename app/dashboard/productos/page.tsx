import { getProducts, getCategories } from "@/app/actions/products"
import dynamicImport from "next/dynamic"

// Forzar renderizado dinámico para evitar errores de build
export const dynamic = 'force-dynamic'

const ProductsPageContent = dynamicImport(() => import("./products-page-content"), { ssr: false })

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories()
  ])
  return (
    <ProductsPageContent
      initialProducts={products}
      initialCategories={categories}
      getProducts={getProducts}
      getCategories={getCategories}
    />
  )
}
