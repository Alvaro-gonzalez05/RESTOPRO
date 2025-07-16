export interface User {
  id: number
  email: string
  full_name: string
  phone: string
  restaurant_name: string
  created_at: string
}

export interface Product {
  id: number
  user_id: number
  category_id?: number
  name: string
  description?: string
  price: number
  image_url?: string
  is_available: boolean
  created_at: string
  category_name?: string
}

export interface Category {
  id: number
  user_id: number
  name: string
  created_at: string
}

export interface Customer {
  id: number
  user_id: number
  name: string
  email?: string
  phone?: string
  address?: string
  created_at: string
}

export interface Order {
  id: number
  user_id: number
  customer_id?: number
  customer_name: string
  table_number?: string
  total: number
  status: "pendiente" | "en_proceso" | "listo" | "entregado" | "completado" | "cancelado"
  notes?: string
  payment_method_id?: number
  payment_method_name?: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface DashboardStats {
  ordersToday: number
  revenueToday: number
  newCustomers: number
  totalProducts: number
}

export interface PaymentMethod {
  id: number
  user_id: number
  name: string
  is_active: boolean
  created_at: string
}

export interface ReportData {
  salesByPeriod: { date: string; sales: number; orders: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  averageTicket: number
  peakHours: { hour: string; orders: number }[]
  paymentMethods: { method: string; amount: number; percentage: number }[]
}
