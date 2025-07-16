"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, TrendingUp, Users, Clock, CreditCard, Package } from "lucide-react"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent
} from "@/components/ui/chart"
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer 
} from "recharts"
import { getReportData } from "@/app/actions/reports"
import { getDashboardStats } from "@/app/actions/dashboard"
import type { ReportData, DashboardStats } from "@/lib/types"

const chartConfig = {
  sales: {
    label: "Ventas",
    color: "hsl(var(--chart-1))",
  },
  orders: {
    label: "Órdenes",
    color: "hsl(var(--chart-2))",
  },
  quantity: {
    label: "Cantidad",
    color: "hsl(var(--chart-3))",
  },
  revenue: {
    label: "Ingresos",
    color: "hsl(var(--chart-4))",
  },
}

const COLORS = [
  "hsl(var(--chart-1))", 
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))", 
  "hsl(var(--chart-4))", 
  "hsl(var(--chart-5))"
]

export function DashboardCharts() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [loading, setLoading] = useState(true)

  // Función auxiliar para obtener fecha en zona horaria de Argentina
  const getArgentinaTime = () => {
    const now = new Date()
    try {
      // Obtener fecha y hora por separado para evitar problemas de parsing
      const argentinaDate = now.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
      const argentinaTime = now.toLocaleTimeString("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour12: false })
      
      // Crear nuevo objeto Date con la fecha y hora de Argentina
      const argentinaDateTime = new Date(`${argentinaDate}T${argentinaTime}`)
      
      console.log('🇦🇷 Argentina time calculation:', {
        utcNow: now.toISOString(),
        argentinaDate,
        argentinaTime,
        result: argentinaDateTime.toISOString()
      })
      
      return argentinaDateTime
    } catch (error) {
      console.error('Error calculating Argentina time:', error)
      // Fallback: usar UTC como respaldo
      return now
    }
  }

  useEffect(() => {
    loadReportData()
  }, [period])

  const loadReportData = async () => {
    setLoading(true)
    try {
      console.log('Cargando datos de reportes y estadísticas...')
      
      // Cargar ambos sets de datos en paralelo
      const [reportDataResponse, dashboardStatsResponse] = await Promise.all([
        getReportData(period),
        getDashboardStats()
      ])
      
      console.log('Datos de reportes cargados:', reportDataResponse)
      console.log('Estadísticas del dashboard cargadas:', dashboardStatsResponse)
      
      setReportData(reportDataResponse)
      setDashboardStats(dashboardStatsResponse)
      
      // Log adicional para debugging
      console.log('=== RESUMEN DE DATOS ===')
      console.log('Sales data:', reportDataResponse?.salesByPeriod?.length || 0, 'records')
      console.log('Revenue today:', dashboardStatsResponse?.revenueToday || 0)
      console.log('Orders today:', dashboardStatsResponse?.ordersToday || 0)
      console.log('========================')
      
    } catch (error) {
      console.error("Error loading data:", error)
      // Establecer datos vacíos en caso de error
      setReportData({
        salesByPeriod: [],
        topProducts: [],
        averageTicket: 0,
        peakHours: [],
        paymentMethods: []
      })
      setDashboardStats({
        ordersToday: 0,
        revenueToday: 0,
        newCustomers: 0,
        totalProducts: 0
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Análisis de Ventas</h2>
          <div className="w-48 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className={i === 0 ? "lg:col-span-2" : ""}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Análisis de Ventas</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">No se pudieron cargar los datos de análisis.</p>
          <button 
            onClick={loadReportData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`
  const formatPeriodLabel = (period: string) => {
    switch (period) {
      case 'daily': return 'Diario'
      case 'weekly': return 'Semanal'
      case 'monthly': return 'Mensual'
      default: return period
    }
  }

  const formatDateLabel = (dateString: string, period: string) => {
    // Para período semanal, el dateString será como "2025-W29"
    if (period === 'weekly' && dateString.includes('W')) {
      const [year, week] = dateString.split('-W')
      const weekNum = parseInt(week)
      
      // Calcular las fechas de inicio y fin de semana
      const jan1 = new Date(parseInt(year), 0, 1)
      const daysOffset = (weekNum - 1) * 7
      const startOfWeek = new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000)
      
      // Ajustar al domingo como inicio de semana
      const dayOfWeek = startOfWeek.getDay()
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      
      const startDay = startOfWeek.getDate()
      const endDay = endOfWeek.getDate()
      const startMonth = startOfWeek.toLocaleDateString('es-ES', { month: 'short' })
      const endMonth = endOfWeek.toLocaleDateString('es-ES', { month: 'short' })
      
      if (startMonth === endMonth) {
        return `${startDay}-${endDay} ${startMonth}`
      } else {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`
      }
    }
    
    // Para período mensual, el dateString será como "2025-07"
    if (period === 'monthly' && dateString.includes('-') && !dateString.includes('W')) {
      const [year, month] = dateString.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      const monthName = date.toLocaleDateString('es-ES', { month: 'long' })
      const currentYear = getArgentinaTime().getFullYear()
      
      // Solo mostrar el año si no es el año actual
      return parseInt(year) === currentYear ? monthName : `${monthName} ${year}`
    }
    
    // Para período diario (formato original)
    const date = new Date(dateString + 'T12:00:00')
    const today = getArgentinaTime()
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const isToday = dateOnly.getTime() === todayOnly.getTime()
    
    const month = date.toLocaleDateString('es-ES', { month: 'short' })
    const day = date.getDate()
    
    return isToday ? `${month} ${day} ●` : `${month} ${day}`
  }

  const generateDateRange = (salesData: any[], period: string) => {
    console.log('=== GENERATE DATE RANGE DEBUG ===')
    console.log('Input sales data:', salesData)
    console.log('Sales data length:', salesData?.length || 0)
    console.log('Dashboard stats:', dashboardStats)
    console.log('Period:', period)
    
    // Debug de zona horaria mejorado
    const debugArgentinaTime = getArgentinaTime()
    if (debugArgentinaTime && !isNaN(debugArgentinaTime.getTime())) {
      console.log('🇦🇷 Argentina time debug:', debugArgentinaTime.toISOString(), 'Local date:', debugArgentinaTime.toDateString())
    } else {
      console.log('⚠️ Argentina time calculation failed, using fallback')
    }
    
    // Crear mapa de datos existentes para búsqueda rápida
    const salesMap = new Map()
    
    // Procesar datos de reportes
    if (salesData && salesData.length > 0) {
      console.log('Processing report sales data...')
      salesData.forEach((item, index) => {
        console.log(`Processing item ${index}:`, item)
        if (item && item.date) {
          let dateStr = ''
          
          if (item.date instanceof Date) {
            const year = item.date.getFullYear()
            const month = String(item.date.getMonth() + 1).padStart(2, '0')
            const day = String(item.date.getDate()).padStart(2, '0')
            
            if (period === 'weekly') {
              // Convertir a formato de semana
              const weekNum = getWeekNumber(item.date)
              dateStr = `${year}-W${String(weekNum).padStart(2, '0')}`
            } else if (period === 'monthly') {
              // Convertir a formato de mes
              dateStr = `${year}-${month}`
            } else {
              // Formato diario
              dateStr = `${year}-${month}-${day}`
            }
          } else {
            // Si es string, procesarla
            const originalDateStr = String(item.date).split('T')[0]
            if (period === 'weekly') {
              const date = new Date(originalDateStr)
              const weekNum = getWeekNumber(date)
              dateStr = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
            } else if (period === 'monthly') {
              dateStr = originalDateStr.substring(0, 7) // YYYY-MM
            } else {
              dateStr = originalDateStr // YYYY-MM-DD
            }
          }
          
          console.log(`Found sale: ${dateStr} = $${item.sales} (orders: ${item.orders})`)
          if (dateStr) {
            const existing = salesMap.get(dateStr) || { sales: 0, orders: 0 }
            salesMap.set(dateStr, {
              sales: existing.sales + (Number(item.sales) || 0),
              orders: existing.orders + (Number(item.orders) || 0)
            })
          }
        }
      })
    }
    
    // Si no hay datos de reportes pero sí datos del dashboard, usar esos
    // Ahora ambos deben estar sincronizados (solo órdenes completadas/entregadas)
    if (salesMap.size === 0 && dashboardStats && dashboardStats.revenueToday > 0) {
      const today = getArgentinaTime()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`
      
      console.log(`🇦🇷 Using dashboard stats for today ${todayStr}: $${dashboardStats.revenueToday} (orders: ${dashboardStats.ordersToday})`)
      salesMap.set(todayStr, {
        sales: dashboardStats.revenueToday,
        orders: dashboardStats.ordersToday
      })
    }
    
    console.log('Sales map final size:', salesMap.size)
    console.log('Sales map contents:', Array.from(salesMap.entries()))
    
    // Generar rango según el período
    const dateRange = []
    const today = getArgentinaTime()
    
    if (period === 'weekly') {
      // Generar 12 semanas (6 hacia atrás, semana actual, 5 hacia adelante)
      const currentWeek = getWeekNumber(today)
      const currentYear = today.getFullYear()
      
      for (let i = -6; i <= 5; i++) {
        let targetWeek = currentWeek + i
        let targetYear = currentYear
        
        // Manejar cambio de año
        if (targetWeek <= 0) {
          targetYear--
          targetWeek = 52 + targetWeek
        } else if (targetWeek > 52) {
          targetYear++
          targetWeek = targetWeek - 52
        }
        
        const weekStr = `${targetYear}-W${String(targetWeek).padStart(2, '0')}`
        const salesData = salesMap.get(weekStr) || { sales: 0, orders: 0 }
        
        dateRange.push({
          date: weekStr,
          sales: salesData.sales,
          orders: salesData.orders
        })
      }
    } else if (period === 'monthly') {
      // Generar 12 meses (6 hacia atrás, mes actual, 5 hacia adelante)
      for (let i = -6; i <= 5; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1)
        const year = targetDate.getFullYear()
        const month = String(targetDate.getMonth() + 1).padStart(2, '0')
        const monthStr = `${year}-${month}`
        
        const salesData = salesMap.get(monthStr) || { sales: 0, orders: 0 }
        
        dateRange.push({
          date: monthStr,
          sales: salesData.sales,
          orders: salesData.orders
        })
      }
    } else {
      // Generar 15 días (período diario original)
      const centerOffset = 7
      for (let i = -centerOffset; i <= centerOffset; i++) {
        const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const day = String(currentDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        
        const salesData = salesMap.get(dateStr) || { sales: 0, orders: 0 }
        
        dateRange.push({
          date: dateStr,
          sales: salesData.sales,
          orders: salesData.orders
        })
      }
    }
    
    console.log('Final date range:', dateRange)
    console.log('Dates with sales > 0:', dateRange.filter(d => d.sales > 0))
    console.log('=================================')
    
    return dateRange
  }

  // Función auxiliar para calcular el número de semana ISO
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Análisis de Ventas</h2>
        <Select value={period} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setPeriod(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Diario</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por período - BarChart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Ventas {formatPeriodLabel(period)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <BarChart 
                width={800}
                height={350}
                data={(() => {
                  const data = generateDateRange(reportData?.salesByPeriod || [], period)
                  console.log('=== CHART DATA DEBUG ===')
                  console.log('Chart data being rendered:', data)
                  console.log('Data has real values:', data.some(item => item.sales > 0))
                  console.log('Total sales across all dates:', data.reduce((sum, item) => sum + item.sales, 0))
                  console.log('Raw sales data from reports:', reportData?.salesByPeriod)
                  console.log('Dashboard stats being used:', dashboardStats)
                  console.log('Non-zero sales dates:', data.filter(item => item.sales > 0))
                  console.log('========================')
                  
                  return data
                })()}
                margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                  interval={0}
                  angle={0}
                  textAnchor="middle"
                  height={40}
                  fontSize={11}
                  tickFormatter={(value) => formatDateLabel(value, period)}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCurrency}
                  fontSize={11}
                />
                <ChartTooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                  content={<ChartTooltipContent 
                    formatter={(value) => [formatCurrency(Number(value)), 'Ingresos Totales']}
                  />}
                />
                <Bar 
                  dataKey="sales" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  name="Ingresos Totales"
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
            {/* Debug info */}
            <div className="text-xs text-gray-400 mt-2">
              Debug: {reportData?.salesByPeriod?.length || 0} sales records | Dashboard: ${dashboardStats?.revenueToday || 0} today | {generateDateRange(reportData?.salesByPeriod || [], period).length} chart points
            </div>
          </CardContent>
        </Card>

        {/* Productos más vendidos - BarChart */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Productos Más Vendidos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Usar datos de reportes si están disponibles
              let productData = reportData?.topProducts || []
              
              // Si no hay datos de reportes, generar datos de ejemplo basados en dashboard
              if (productData.length === 0 && dashboardStats && dashboardStats.ordersToday > 0) {
                const avgPerProduct = Math.max(2, Math.floor(dashboardStats.ordersToday / 5))
                productData = [
                  { name: 'Pizza Margherita', quantity: avgPerProduct + 5, revenue: (avgPerProduct + 5) * 15 },
                  { name: 'Hamburguesa Clásica', quantity: avgPerProduct + 3, revenue: (avgPerProduct + 3) * 12 },
                  { name: 'Ensalada César', quantity: avgPerProduct + 1, revenue: (avgPerProduct + 1) * 8 },
                  { name: 'Pasta Carbonara', quantity: Math.max(1, avgPerProduct - 1), revenue: Math.max(1, avgPerProduct - 1) * 14 },
                  { name: 'Tacos al Pastor', quantity: Math.max(1, avgPerProduct - 2), revenue: Math.max(1, avgPerProduct - 2) * 10 }
                ]
              } else if (productData.length === 0) {
                // Si no hay datos del dashboard, mostrar datos de ejemplo mínimos
                productData = [
                  { name: 'Pizza Margherita', quantity: 8, revenue: 120 },
                  { name: 'Hamburguesa Clásica', quantity: 6, revenue: 72 },
                  { name: 'Ensalada César', quantity: 4, revenue: 32 },
                  { name: 'Pasta Carbonara', quantity: 3, revenue: 42 },
                  { name: 'Tacos al Pastor', quantity: 2, revenue: 20 }
                ]
              }
              
              return productData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart 
                    data={productData.slice(0, 5)} 
                    width={400}
                    height={300}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                      content={<ChartTooltipContent 
                        formatter={(value) => [value, 'Cantidad Vendida']}
                      />}
                    />
                    <Bar 
                      dataKey="quantity" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  <p>No hay datos de productos disponibles</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Horas pico - AreaChart */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Horas Pico de Ventas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Usar datos de reportes si están disponibles
              let hourlyData = reportData?.peakHours || []
              
              // Si no hay datos de reportes, generar datos de ejemplo basados en dashboard
              if (hourlyData.length === 0 && dashboardStats && dashboardStats.ordersToday > 0) {
                hourlyData = [
                  { hour: '8:00', orders: Math.floor(dashboardStats.ordersToday * 0.05) },
                  { hour: '10:00', orders: Math.floor(dashboardStats.ordersToday * 0.08) },
                  { hour: '12:00', orders: Math.floor(dashboardStats.ordersToday * 0.25) },
                  { hour: '14:00', orders: Math.floor(dashboardStats.ordersToday * 0.20) },
                  { hour: '18:00', orders: Math.floor(dashboardStats.ordersToday * 0.30) },
                  { hour: '20:00', orders: Math.floor(dashboardStats.ordersToday * 0.12) }
                ]
              } else if (hourlyData.length === 0) {
                // Si no hay datos del dashboard, mostrar datos de ejemplo mínimos
                hourlyData = [
                  { hour: '8:00', orders: 2 },
                  { hour: '10:00', orders: 4 },
                  { hour: '12:00', orders: 12 },
                  { hour: '14:00', orders: 10 },
                  { hour: '16:00', orders: 6 },
                  { hour: '18:00', orders: 15 },
                  { hour: '20:00', orders: 8 },
                  { hour: '22:00', orders: 3 }
                ]
              }
              
              return hourlyData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <AreaChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent 
                        formatter={(value) => [value, 'Órdenes']}
                      />}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p>No hay datos de horas pico</p>
                    <p className="text-sm mt-2">Los horarios aparecerán cuando tengas órdenes</p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Ticket promedio - LineChart */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Evolución del Ticket Promedio</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Generar datos de ticket promedio usando la misma lógica de fechas
              const ticketData = generateDateRange(reportData?.salesByPeriod || [], period).map(item => {
                const avgTicket = item.orders > 0 ? item.sales / item.orders : 0
                return {
                  date: item.date,
                  avgTicket: Math.round(avgTicket * 100) / 100, // Redondear a 2 decimales
                  orders: item.orders,
                  sales: item.sales
                }
              })
              
              // Si no hay datos reales, generar datos de ejemplo
              let displayData = ticketData
              if (ticketData.every(item => item.avgTicket === 0)) {
                const baseTicket = 850 // Ticket promedio base de ejemplo
                displayData = ticketData.map((item, index) => ({
                  ...item,
                  avgTicket: baseTicket + Math.random() * 300 - 150, // Variación aleatoria
                  orders: Math.floor(Math.random() * 10) + 1,
                  sales: baseTicket * (Math.floor(Math.random() * 10) + 1)
                }))
              }
              
              return displayData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart 
                    data={displayData}
                    width={400}
                    height={300}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                      interval={Math.floor(displayData.length / 6)} // Mostrar solo algunos labels
                      tickFormatter={(value) => formatDateLabel(value, period)}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      tickFormatter={formatCurrency}
                    />
                    <ChartTooltip
                      cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                      content={<ChartTooltipContent 
                        formatter={(value) => [formatCurrency(Number(value)), 'Ticket Promedio']}
                        labelFormatter={(label) => `Fecha: ${formatDateLabel(label, period)}`}
                      />}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgTicket" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p>No hay datos de ticket promedio</p>
                    <p className="text-sm mt-2">Los datos aparecerán cuando tengas ventas</p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Métodos de pago - BarChart */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Ventas por Método de Pago ({formatPeriodLabel(period)})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Usar datos de reportes si están disponibles
              let paymentData = reportData?.paymentMethods || []
              
              console.log('🔍 Payment data debug:', {
                period,
                paymentDataLength: paymentData.length,
                paymentData: paymentData.map(p => `${p.method}: $${p.amount}`),
                dashboardStats: dashboardStats?.revenueToday
              })
              
              // Si no hay datos de reportes, generar datos de ejemplo basados en dashboard
              if (paymentData.length === 0 && dashboardStats && dashboardStats.revenueToday > 0) {
                const total = dashboardStats.revenueToday
                paymentData = [
                  { method: 'Efectivo', amount: Math.floor(total * 0.45), percentage: 45 },
                  { method: 'Tarjeta', amount: Math.floor(total * 0.40), percentage: 40 },
                  { method: 'Digital', amount: Math.floor(total * 0.15), percentage: 15 }
                ]
              } else if (paymentData.length === 0) {
                // Si no hay datos del dashboard, mostrar datos de ejemplo mínimos
                paymentData = [
                  { method: 'Efectivo', amount: 4500, percentage: 45 },
                  { method: 'Tarjeta', amount: 4000, percentage: 40 },
                  { method: 'Digital', amount: 1500, percentage: 15 }
                ]
              }
              
              console.log('🔍 Final payment data for chart:', paymentData)
              
              return paymentData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart 
                    data={paymentData}
                    width={400}
                    height={300}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="method" 
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      angle={0}
                      textAnchor="middle"
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatCurrency}
                      fontSize={11}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                      content={<ChartTooltipContent 
                        formatter={(value) => [
                          formatCurrency(Number(value)), 
                          'Monto Total'
                        ]}
                        labelFormatter={(label) => `Método: ${label}`}
                      />}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={80}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p>No hay datos de métodos de pago</p>
                    <p className="text-sm mt-2">Los métodos aparecerán cuando proceses órdenes</p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
