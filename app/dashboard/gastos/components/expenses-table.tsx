"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Plus, Edit, Trash2, Search, Filter, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { getExpenses, deleteExpense } from "@/app/actions/expenses"
// import { CreateExpenseDialog } from "./create-expense-dialog"
// import { EditExpenseDialog } from "./edit-expense-dialog"

interface ExpensesTableProps {
  expenses: any[]
}

export function ExpensesTable({ expenses: initialExpenses }: ExpensesTableProps) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedDay, setSelectedDay] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")

  // Filtros
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (expense.supplier_name && expense.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (expense.supplier_full_name && expense.supplier_full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || expense.category === selectedCategory
    const matchesDay = !selectedDay || expense.expense_date === selectedDay
    
    return matchesSearch && matchesCategory && matchesDay
  })

  // Estadísticas
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
  const expenseCount = filteredExpenses.length
  const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0

  // Generar opciones de meses
  const generateMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }

  const monthOptions = generateMonthOptions()

  // Categorías
  const categories = [
    { value: "ingredientes", label: "Ingredientes", color: "bg-green-100 text-green-800" },
    { value: "servicios", label: "Servicios", color: "bg-blue-100 text-blue-800" },
    { value: "equipos", label: "Equipos", color: "bg-purple-100 text-purple-800" },
    { value: "mantenimiento", label: "Mantenimiento", color: "bg-orange-100 text-orange-800" },
    { value: "marketing", label: "Marketing", color: "bg-pink-100 text-pink-800" },
    { value: "otros", label: "Otros", color: "bg-gray-100 text-gray-800" }
  ]

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.value === category)
    return cat ? cat.color : "bg-gray-100 text-gray-800"
  }

  // Cargar gastos cuando cambian los filtros
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const filters: any = {}
        if (selectedMonth) filters.month = selectedMonth
        if (selectedDay) filters.day = selectedDay
        
        const newExpenses = await getExpenses(filters)
        setExpenses(newExpenses)
      } catch (error) {
        console.error("Error loading expenses:", error)
        toast.error("Error al cargar gastos")
      }
    }
    
    loadExpenses()
  }, [selectedMonth, selectedDay])

  const handleDelete = async (id: number) => {
    try {
      const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer.')
      
      if (confirmed) {
        await deleteExpense(id)
        setExpenses(expenses.filter(e => e.id !== id))
        toast.success("Gasto eliminado exitosamente")
      }
    } catch (error) {
      toast.error("Error al eliminar el gasto")
    }
  }

  const handleEdit = (expense: any) => {
    setSelectedExpense(expense)
    setShowEditDialog(true)
  }

  const handleExpenseCreated = () => {
    setShowCreateDialog(false)
    // Recargar gastos
    const loadExpenses = async () => {
      try {
        const filters: any = {}
        if (selectedMonth) filters.month = selectedMonth
        if (selectedDay) filters.day = selectedDay
        
        const newExpenses = await getExpenses(filters)
        setExpenses(newExpenses)
      } catch (error) {
        console.error("Error loading expenses:", error)
      }
    }
    loadExpenses()
  }

  const handleExpenseUpdated = () => {
    setShowEditDialog(false)
    setSelectedExpense(null)
    // Recargar gastos
    const loadExpenses = async () => {
      try {
        const filters: any = {}
        if (selectedMonth) filters.month = selectedMonth
        if (selectedDay) filters.day = selectedDay
        
        const newExpenses = await getExpenses(filters)
        setExpenses(newExpenses)
      } catch (error) {
        console.error("Error loading expenses:", error)
      }
    }
    loadExpenses()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
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
              {expenseCount} {expenseCount === 1 ? 'gasto' : 'gastos'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenseCount}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(averageExpense)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Día</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses / new Date().getDate())}
            </div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra y busca gastos específicos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar gastos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              placeholder="Día específico"
            />
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos Registrados</CardTitle>
          <CardDescription>
            Mostrando {filteredExpenses.length} de {expenses.length} gastos
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-gray-500">
                      <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No se encontraron gastos</p>
                      <p className="text-sm">Ajusta los filtros o crea un nuevo gasto</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {new Date(expense.expense_date).toLocaleDateString('es-ES')}
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
                      {formatCurrency(parseFloat(expense.amount || 0))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {expense.payment_method || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diálogos temporalmente deshabilitados */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Crear Nuevo Gasto</h3>
            <p className="mb-4">Funcionalidad de crear gasto próximamente disponible.</p>
            <Button onClick={() => setShowCreateDialog(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
      
      {showEditDialog && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Gasto</h3>
            <p className="mb-4">Funcionalidad de editar gasto próximamente disponible.</p>
            <Button onClick={() => {
              setShowEditDialog(false)
              setSelectedExpense(null)
            }}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
