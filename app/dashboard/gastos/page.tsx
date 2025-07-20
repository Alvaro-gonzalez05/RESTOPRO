"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Plus, Edit, Trash2, Search, Filter, TrendingUp, Receipt } from "lucide-react"
import { toast } from "sonner"
import { getExpenses, deleteExpense } from "@/app/actions/expenses"
import { CreateExpenseDialog } from "./components/new-create-expense-dialog"
import { EditExpenseDialog } from "./components/new-edit-expense-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface Expense {
  id: number
  description: string
  amount: string | number
  category: string
  expense_date: string
  payment_method: string
  supplier_name: string
  supplier_full_name?: string
  receipt_number?: string
  notes?: string
  supplier_id?: number
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedDay, setSelectedDay] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showAllTime, setShowAllTime] = useState(false)

  const categories = [
    { value: "ingredientes", label: "Ingredientes", color: "bg-green-100 text-green-800" },
    { value: "equipos", label: "Equipos", color: "bg-blue-100 text-blue-800" },
    { value: "servicios", label: "Servicios", color: "bg-purple-100 text-purple-800" },
    { value: "mantenimiento", label: "Mantenimiento", color: "bg-orange-100 text-orange-800" },
    { value: "marketing", label: "Marketing", color: "bg-pink-100 text-pink-800" },
    { value: "otros", label: "Otros", color: "bg-gray-100 text-gray-800" }
  ]

  const paymentMethods = [
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "transferencia", label: "Transferencia" },
    { value: "cheque", label: "Cheque" }
  ]

  // Cargar gastos
  const loadExpenses = async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (!showAllTime) {
        if (selectedDay) {
          filters.day = selectedDay
        } else if (selectedMonth) {
          filters.month = selectedMonth
        }
      }
      
      const result = await getExpenses(filters)
      setExpenses(result || [])
    } catch (error) {
      console.error("Error loading expenses:", error)
      toast.error("Error al cargar gastos")
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar gastos al montar el componente y cuando cambian los filtros
  useEffect(() => {
    loadExpenses()
  }, [selectedMonth, selectedDay, showAllTime])

  // Filtros
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.supplier_full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || selectedCategory === "all" || expense.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Estadísticas
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0)
  const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0

  const handleExpenseCreated = () => {
    setShowCreateDialog(false)
    loadExpenses()
  }

  const handleExpenseUpdated = () => {
    setShowEditDialog(false)
    setSelectedExpense(null)
    loadExpenses()
  }

  const handleDeleteExpense = async (id: number) => {
    try {
      await deleteExpense(id)
      toast.success("Gasto eliminado exitosamente")
      loadExpenses()
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("Error al eliminar gasto")
    }
  }

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.value === category)
    return cat ? cat.color : "bg-gray-100 text-gray-800"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const generateMonthOptions = () => {
    const options = []
    const currentDate = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
      options.push({ value, label })
    }
    
    return options
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-600">Gestiona los gastos de tu restaurante</p>
        </div>
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
        <p className="text-gray-600">Gestiona los gastos de tu restaurante</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} gasto{filteredExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Gasto</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageExpense)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio de gastos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Período</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showAllTime ? "Todos" : 
               selectedDay ? "Día" : 
               selectedMonth ? "Mes" : "Filtrado"}
            </div>
            <p className="text-xs text-muted-foreground">
              Período de consulta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y botón crear */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros de Búsqueda</CardTitle>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar gastos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de período */}
            <Select value={showAllTime ? "all" : selectedDay ? "day" : "month"} onValueChange={(value) => {
              if (value === "all") {
                setShowAllTime(true)
                setSelectedMonth("")
                setSelectedDay("")
              } else if (value === "month") {
                setShowAllTime(false)
                setSelectedDay("")
              } else if (value === "day") {
                setShowAllTime(false)
                setSelectedMonth("")
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Por Mes</SelectItem>
                <SelectItem value="day">Por Día</SelectItem>
                <SelectItem value="all">Todos los Gastos</SelectItem>
              </SelectContent>
            </Select>

            {/* Selector de mes */}
            {!showAllTime && !selectedDay && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Selector de día */}
            {!showAllTime && selectedDay !== undefined && (
              <Input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                placeholder="Seleccionar día"
              />
            )}

            {/* Filtro por categoría */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Contador de resultados */}
            <div className="flex items-center">
              <Badge variant="outline" className="text-sm">
                {filteredExpenses.length} gasto{filteredExpenses.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos Registrados</CardTitle>
          <CardDescription>
            Lista de todos los gastos registrados con filtros aplicados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">
                <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron gastos</p>
                <p className="text-sm">Ajusta los filtros o crea un nuevo gasto</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString('es-ES') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={expense.description}>
                          {expense.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {expense.supplier_full_name || expense.supplier_name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(expense.category)}>
                          {categories.find(c => c.value === expense.category)?.label || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentMethods.find(pm => pm.value === expense.payment_method)?.label || expense.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedExpense(expense)
                              setShowEditDialog(true)
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <CreateExpenseDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onExpenseCreated={handleExpenseCreated}
      />

      {selectedExpense && (
        <EditExpenseDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false)
            setSelectedExpense(null)
          }}
          expense={selectedExpense}
          onExpenseUpdated={handleExpenseUpdated}
        />
      )}
    </div>
  )
}
