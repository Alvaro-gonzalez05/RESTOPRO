import { getProducts, getCategories } from "@/app/actions/products"
import dynamic from "next/dynamic"

export const revalidate = 60;

const ProductsPageContent = dynamic(() => import("./products-page-content"), { ssr: false })

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
