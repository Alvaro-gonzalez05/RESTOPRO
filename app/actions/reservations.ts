'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface Reservation {
  id: number
  user_id: number
  customer_id?: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  reservation_date: string
  reservation_time: string
  party_size: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  special_requests?: string
  notes?: string
  created_via: 'manual' | 'chatbot' | 'website' | 'phone'
  created_at: string
  updated_at: string
}

export interface ReservationSettings {
  id: number
  user_id: number
  max_party_size: number
  min_advance_hours: number
  max_advance_days: number
  default_duration_minutes: number
  opening_time: string
  closing_time: string
  time_slot_interval: number
  allow_same_day_bookings: boolean
  require_phone: boolean
  require_email: boolean
  auto_confirm: boolean
  send_confirmations: boolean
  send_reminders: boolean
  reminder_hours_before: number
  blocked_dates: string[]
  special_hours: Record<string, { opening_time: string; closing_time: string }>
}

// Get all reservations for a user
export async function getReservations(userId: number, filters?: {
  date?: string
  status?: string
  limit?: number
}) {
  try {
    let query = `
      SELECT r.*, c.email as customer_email_from_db
      FROM reservations r
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.user_id = $1
    `
    const params: any[] = [userId]
    let paramIndex = 2

    if (filters?.date) {
      query += ` AND r.reservation_date = $${paramIndex}`
      params.push(filters.date)
      paramIndex++
    }

    if (filters?.status) {
      query += ` AND r.status = $${paramIndex}`
      params.push(filters.status)
      paramIndex++
    }

    query += ` ORDER BY r.reservation_date DESC, r.reservation_time DESC`

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(filters.limit)
    }

    const reservations = await sql(query, params)
    return reservations
  } catch (error) {
    console.error('Error getting reservations:', error)
    return []
  }
}

// Get reservations for today
export async function getTodayReservations(userId: number) {
  const today = new Date().toISOString().split('T')[0]
  return getReservations(userId, { date: today })
}

// Get reservation by ID
export async function getReservation(id: number, userId: number) {
  try {
    const reservation = await sql(`
      SELECT r.*, c.email as customer_email_from_db
      FROM reservations r
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.id = $1 AND r.user_id = $2
    `, [id, userId])
    
    return reservation[0] || null
  } catch (error) {
    console.error('Error getting reservation:', error)
    return null
  }
}

// Create a new reservation
export async function createReservation(data: {
  userId: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  reservationDate: string
  reservationTime: string
  partySize: number
  specialRequests?: string
  notes?: string
  createdVia?: 'manual' | 'chatbot' | 'website' | 'phone'
}) {
  try {
    // Check if time slot is available
    const availability = await checkTimeSlotAvailability(
      data.userId,
      data.reservationDate,
      data.reservationTime
    )

    if (!availability.available) {
      return {
        success: false,
        error: availability.reason || 'Time slot not available'
      }
    }

    // Try to find existing customer
    let customerId = null
    const existingCustomer = await sql(`
      SELECT id FROM customers 
      WHERE user_id = $1 AND (phone = $2 OR phone LIKE $3)
    `, [data.userId, data.customerPhone, `%${data.customerPhone.slice(-10)}%`])

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id
    } else if (data.customerEmail) {
      // Create new customer if email provided
      const newCustomer = await sql(`
        INSERT INTO customers (user_id, name, phone, email)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [data.userId, data.customerName, data.customerPhone, data.customerEmail])
      
      customerId = newCustomer[0].id
    }

    // Create reservation
    const result = await sql(`
      INSERT INTO reservations (
        user_id, customer_id, customer_name, customer_phone, customer_email,
        reservation_date, reservation_time, party_size, special_requests,
        notes, created_via, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      data.userId,
      customerId,
      data.customerName,
      data.customerPhone,
      data.customerEmail,
      data.reservationDate,
      data.reservationTime,
      data.partySize,
      data.specialRequests,
      data.notes,
      data.createdVia || 'manual',
      'confirmed' // Default status
    ])

    revalidatePath('/dashboard/reservas')
    return { success: true, reservation: result[0] }
  } catch (error) {
    console.error('Error creating reservation:', error)
    return { success: false, error: 'Error al crear la reserva' }
  }
}

// Update reservation
export async function updateReservation(id: number, userId: number, data: {
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  reservationDate?: string
  reservationTime?: string
  partySize?: number
  status?: string
  specialRequests?: string
  notes?: string
}) {
  try {
    // Build dynamic query
    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        updateFields.push(`${dbField} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    if (updateFields.length === 0) {
      return { success: false, error: 'No data to update' }
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(id, userId)

    const query = `
      UPDATE reservations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `

    const result = await sql(query, params)
    
    if (result.length === 0) {
      return { success: false, error: 'Reservation not found' }
    }

    revalidatePath('/dashboard/reservas')
    return { success: true, reservation: result[0] }
  } catch (error) {
    console.error('Error updating reservation:', error)
    return { success: false, error: 'Error al actualizar la reserva' }
  }
}

// Cancel reservation
export async function cancelReservation(id: number, userId: number, reason?: string) {
  try {
    const result = await sql(`
      UPDATE reservations 
      SET status = 'cancelled', 
          notes = COALESCE(notes || ' | ', '') || 'Cancelada: ' || $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId, reason || 'Sin razón especificada'])

    if (result.length === 0) {
      return { success: false, error: 'Reservation not found' }
    }

    revalidatePath('/dashboard/reservas')
    return { success: true, reservation: result[0] }
  } catch (error) {
    console.error('Error cancelling reservation:', error)
    return { success: false, error: 'Error al cancelar la reserva' }
  }
}

// Delete reservation
export async function deleteReservation(id: number, userId: number) {
  try {
    const result = await sql(`
      DELETE FROM reservations 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId])

    if (result.length === 0) {
      return { success: false, error: 'Reservation not found' }
    }

    revalidatePath('/dashboard/reservas')
    return { success: true }
  } catch (error) {
    console.error('Error deleting reservation:', error)
    return { success: false, error: 'Error al eliminar la reserva' }
  }
}

// Check time slot availability
export async function checkTimeSlotAvailability(
  userId: number,
  date: string,
  time: string
) {
  try {
    const settings = await getReservationSettings(userId)
    
    // Check if date is in the past
    const reservationDateTime = new Date(`${date}T${time}`)
    const now = new Date()
    
    if (reservationDateTime < now) {
      return { available: false, reason: 'No se pueden hacer reservas en el pasado' }
    }

    // Check advance booking limits
    const hoursInAdvance = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursInAdvance < settings.min_advance_hours) {
      return { 
        available: false, 
        reason: `Se requiere un mínimo de ${settings.min_advance_hours} horas de anticipación` 
      }
    }

    const daysInAdvance = hoursInAdvance / 24
    if (daysInAdvance > settings.max_advance_days) {
      return { 
        available: false, 
        reason: `Solo se permiten reservas hasta ${settings.max_advance_days} días de anticipación` 
      }
    }

    // Check if date is blocked
    if (settings.blocked_dates.includes(date)) {
      return { available: false, reason: 'Esta fecha no está disponible' }
    }

    // Check business hours
    const timeHour = parseInt(time.split(':')[0])
    const openingHour = parseInt(settings.opening_time.split(':')[0])
    const closingHour = parseInt(settings.closing_time.split(':')[0])

    if (timeHour < openingHour || timeHour >= closingHour) {
      return { 
        available: false, 
        reason: `Horarios de atención: ${settings.opening_time} - ${settings.closing_time}` 
      }
    }

    // Check if time slot is already taken
    const existingReservation = await sql(`
      SELECT id FROM reservations 
      WHERE user_id = $1 AND reservation_date = $2 AND reservation_time = $3
      AND status NOT IN ('cancelled', 'no_show')
    `, [userId, date, time])

    if (existingReservation.length > 0) {
      return { available: false, reason: 'Esta hora ya está reservada' }
    }

    return { available: true }
  } catch (error) {
    console.error('Error checking availability:', error)
    return { available: false, reason: 'Error verificando disponibilidad' }
  }
}

// Get available time slots for a date
export async function getAvailableTimeSlots(userId: number, date: string) {
  try {
    const settings = await getReservationSettings(userId)
    const slots: string[] = []

    // Generate time slots based on settings
    const openingTime = settings.opening_time
    const closingTime = settings.closing_time
    const interval = settings.time_slot_interval

    const [openHour, openMin] = openingTime.split(':').map(Number)
    const [closeHour, closeMin] = closingTime.split(':').map(Number)

    let currentTime = openHour * 60 + openMin // in minutes
    const endTime = closeHour * 60 + closeMin

    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60)
      const min = currentTime % 60
      const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      
      const availability = await checkTimeSlotAvailability(userId, date, timeString)
      if (availability.available) {
        slots.push(timeString)
      }

      currentTime += interval
    }

    return slots
  } catch (error) {
    console.error('Error getting available slots:', error)
    return []
  }
}

// Get reservation settings
export async function getReservationSettings(userId: number): Promise<ReservationSettings> {
  try {
    const result = await sql(`
      SELECT * FROM reservation_settings WHERE user_id = $1
    `, [userId])

    if (result.length === 0) {
      // Create default settings
      const defaultSettings = await sql(`
        INSERT INTO reservation_settings (user_id) VALUES ($1)
        RETURNING *
      `, [userId])
      return defaultSettings[0]
    }

    const settings = result[0]
    return {
      ...settings,
      blocked_dates: Array.isArray(settings.blocked_dates) ? settings.blocked_dates : [],
      special_hours: settings.special_hours || {}
    }
  } catch (error) {
    console.error('Error getting reservation settings:', error)
    // Return default settings on error
    return {
      id: 0,
      user_id: userId,
      max_party_size: 8,
      min_advance_hours: 2,
      max_advance_days: 30,
      default_duration_minutes: 120,
      opening_time: '09:00:00',
      closing_time: '22:00:00',
      time_slot_interval: 30,
      allow_same_day_bookings: true,
      require_phone: true,
      require_email: false,
      auto_confirm: true,
      send_confirmations: true,
      send_reminders: true,
      reminder_hours_before: 2,
      blocked_dates: [],
      special_hours: {}
    }
  }
}

// Update reservation settings
export async function updateReservationSettings(userId: number, settings: Partial<Omit<ReservationSettings, 'id' | 'user_id'>>) {
  try {
    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        updateFields.push(`${dbField} = $${paramIndex}`)
        
        // Handle JSON fields
        if (key === 'blocked_dates' || key === 'special_hours') {
          params.push(JSON.stringify(value))
        } else {
          params.push(value)
        }
        paramIndex++
      }
    })

    if (updateFields.length === 0) {
      return { success: false, error: 'No data to update' }
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(userId)

    const query = `
      UPDATE reservation_settings 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `

    const result = await sql(query, params)
    
    if (result.length === 0) {
      return { success: false, error: 'Settings not found' }
    }

    revalidatePath('/dashboard/reservas')
    return { success: true, settings: result[0] }
  } catch (error) {
    console.error('Error updating reservation settings:', error)
    return { success: false, error: 'Error al actualizar configuración' }
  }
}

// Get reservation statistics
export async function getReservationStats(userId: number, period: 'today' | 'week' | 'month' = 'today') {
  try {
    let dateFilter = ''
    
    switch (period) {
      case 'today':
        dateFilter = "reservation_date = CURRENT_DATE"
        break
      case 'week':
        dateFilter = "reservation_date >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case 'month':
        dateFilter = "reservation_date >= CURRENT_DATE - INTERVAL '30 days'"
        break
    }

    const stats = await sql(`
      SELECT 
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show,
        AVG(party_size) as avg_party_size,
        SUM(party_size) as total_guests
      FROM reservations 
      WHERE user_id = $1 AND ${dateFilter}
    `, [userId])

    return stats[0] || {
      total_reservations: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0,
      no_show: 0,
      avg_party_size: 0,
      total_guests: 0
    }
  } catch (error) {
    console.error('Error getting reservation stats:', error)
    return {
      total_reservations: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0,
      no_show: 0,
      avg_party_size: 0,
      total_guests: 0
    }
  }
}