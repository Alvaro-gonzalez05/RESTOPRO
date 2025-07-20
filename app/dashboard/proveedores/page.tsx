import { Suspense } from "react"
import { getSuppliers } from "@/app/actions/suppliers"
import { SuppliersTable } from "./components/suppliers-table"

async function SuppliersContent() {
  const suppliers = await getSuppliers()
  
  return <SuppliersTable suppliers={suppliers} />
}

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Proveedores</h1>
        <p className="text-gray-600">Gestiona los proveedores de tu restaurante</p>
      </div>

      <Suspense fallback={
        <div className="bg-white rounded-lg shadow">
          <div className="animate-pulse p-6">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      }>
        <SuppliersContent />
      </Suspense>
    </div>
  )
}
