"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { calculateOrderPoints } from "@/app/actions/points-calc"
import { triggerAutomation } from "@/lib/automation-engine"

export async function getOrders() {
  try {
    const orders = await sql(`
      SELECT 
        o.id,
        o.user_id,
        o.customer_id,
        o.customer_name,
        o.table_number,
        o.total,
        o.notes,
        o.status,
        o.payment_method_id,
        o.payment_method_name,
        o.created_at,
        o.updated_at,
        json_agg(
          CASE 
            WHEN oi.product_id IS NOT NULL THEN
              json_build_object(
                'product_id', oi.product_id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price,
                'category_id', oi.category_id,
                'redeemed_quantity', COALESCE(oi.redeemed_quantity, 0)
              )
            ELSE NULL
          END
        ) as items
      FROM orders o 
      LEFT JOIN order_items oi ON o.id = oi.order_id 
      GROUP BY o.id, o.user_id, o.customer_id, o.customer_name, o.table_number, o.total, o.notes, o.status, o.payment_method_id, o.payment_method_name, o.created_at, o.updated_at
      ORDER BY o.created_at DESC
    `)

    return orders.map((order) => ({
      ...order,
      items: order.items?.[0] ? order.items.filter((item: any) => item !== null) : [],
    }))
  } catch (error) {
    console.error("Error fetching orders:", error)
    return []
  }
}

export async function createOrder(formData: FormData) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const customerName = formData.get("customerName") as string;
    const tableNumber = formData.get("tableNumber") as string;
    const total = Number.parseFloat(formData.get("total") as string);
    const notes = formData.get("notes") as string;
    const itemsJson = formData.get("items") as string;
    const paymentMethod = formData.get("paymentMethod") as string;
    const customerId = formData.get("customerId") ? Number(formData.get("customerId")) : null;

    if (!customerName || !itemsJson) {
      return { success: false, error: "Faltan datos requeridos" };
    }

    const items = JSON.parse(itemsJson);

    // Create order
    const [order] = await sql(`INSERT INTO orders (user_id, customer_id, customer_name, table_number, total, notes, status, payment_method_name, created_at) VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7, NOW()) RETURNING id`, [userId, customerId, customerName, tableNumber || null, total, notes || null, paymentMethod || 'Efectivo']);

    // Create order items (guardar category_id)
    for (const item of items) {
      await sql(`INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [order.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.category_id || null]);
    }

    revalidatePath("/dashboard/ordenes");

    // Trigger automation for new order
    if (customerId) {
      const [customer] = await sql(`SELECT phone FROM customers WHERE id = $1`, [customerId]);
      if (customer?.phone) {
        await triggerAutomation(userId, 'new_order', {
          orderId: order.id,
          customerName: customerName,
          customerPhone: customer.phone,
          total: total,
        });
      }
    }

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Error al crear el pedido" };
  }
}

export async function updateOrderStatus(orderId: number, status: string, paymentMethod?: string) {
  try {
    // Si se está completando la orden y no se especifica método de pago
    if ((status === "completado" || status === "entregado") && !paymentMethod) {
      // Verificar si la orden ya tiene un método de pago
      const [existingOrder] = await sql(`SELECT payment_method_name, payment_method_id FROM orders WHERE id = $1`, [orderId])
      
      // Si no tiene método de pago, asignar "Efectivo" por defecto
      if (!existingOrder.payment_method_name && !existingOrder.payment_method_id) {
        paymentMethod = "Efectivo"
      }
    }

    // Si se proporciona un método de pago, actualizarlo también
    if (paymentMethod) {
      await sql(`UPDATE orders SET status = $1, payment_method_name = $2, updated_at = NOW() WHERE id = $3`, [status, paymentMethod, orderId])
      console.log(`🔍 Order ${orderId} updated with status: ${status}, payment method: ${paymentMethod}`)
    } else {
      await sql(`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, orderId])
      console.log(`🔍 Order ${orderId} updated with status: ${status} (no payment method change)`)
    }

    // Si la orden se completa o se paga, sumar puntos solo por productos no canjeados y restar puntos de productos canjeados
    if (status === "completado" || status === "pagada") {
      // Obtener datos de la orden y sus items
      const [order] = await sql(`SELECT * FROM orders WHERE id = $1`, [orderId]);
      if (order && order.customer_id) {
        // Items no canjeados (solo la parte no canjeada de cada item)
        const itemsRaw = await sql(`SELECT product_id, quantity, category_id, unit_price, total_price, COALESCE(redeemed_quantity,0) as redeemed_quantity FROM order_items WHERE order_id = $1`, [orderId]);
        const items = itemsRaw.map((i: any) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity) - Number(i.redeemed_quantity || 0),
          category_id: i.category_id ? Number(i.category_id) : undefined,
          unit_price: i.unit_price,
          total_price: i.unit_price * (Number(i.quantity) - Number(i.redeemed_quantity || 0))
        })).filter(i => i.quantity > 0);
        const points = await calculateOrderPoints({
          customer_id: order.customer_id,
          items,
          total: order.total
        });
        // Sumar puntos por productos no canjeados
        await sql(`UPDATE customers SET points = COALESCE(points,0) + $1 WHERE id = $2`, [points, order.customer_id]);

        // Restar puntos por productos canjeados (solo si redeemed_quantity > 0)
        for (const item of itemsRaw) {
          const redeemedQty = Number(item.redeemed_quantity || 0);
          if (redeemedQty > 0) {
            const [config] = await sql(`SELECT redeem_points FROM points_config WHERE product_id = $1`, [item.product_id]);
            if (config && config.redeem_points) {
              const totalRedeem = config.redeem_points * redeemedQty;
              await sql(`UPDATE customers SET points = GREATEST(COALESCE(points,0) - $1, 0) WHERE id = $2`, [totalRedeem, order.customer_id]);
            }
          }
        }
      }
    }

    revalidatePath("/dashboard/ordenes")
    revalidatePath("/dashboard/clientes")
    return { success: true }
  } catch (error) {
    console.error("Error updating order status:", error)
    return { success: false, error: "Error al actualizar el estado" }
  }
}

export async function deleteOrder(orderId: number) {
  try {
    // Delete order items first
    await sql(`DELETE FROM order_items WHERE order_id = $1`, [orderId])

    // Delete order
    await sql(`DELETE FROM orders WHERE id = $1`, [orderId])

    revalidatePath("/dashboard/ordenes")
    return { success: true }
  } catch (error) {
    console.error("Error deleting order:", error)
    return { success: false, error: "Error al eliminar la orden" }
  }
}

export async function deleteAllOrders() {
  try {
    // Delete all order items first
    await sql(`DELETE FROM order_items`)

    // Delete all orders
    await sql(`DELETE FROM orders`)

    revalidatePath("/dashboard/ordenes")
    redirect("/dashboard/ordenes")
  } catch (error) {
    console.error("Error deleting all orders:", error)
    throw new Error("Error al eliminar todas las órdenes")
  }
}

export async function completeOrderWithPayment(orderId: number, paymentMethod: string) {
  try {
    await sql(`UPDATE orders SET status = 'completado', payment_method_name = $1, updated_at = NOW() WHERE id = $2`, [paymentMethod, orderId])
    
    // Ejecutar la lógica de puntos como en updateOrderStatus
    const [order] = await sql(`SELECT * FROM orders WHERE id = $1`, [orderId]);
    if (order && order.customer_id) {
      const itemsRaw = await sql(`SELECT product_id, quantity, category_id, unit_price, total_price, COALESCE(redeemed_quantity,0) as redeemed_quantity FROM order_items WHERE order_id = $1`, [orderId]);
      const items = itemsRaw.map((i: any) => ({
        product_id: Number(i.product_id),
        quantity: Number(i.quantity) - Number(i.redeemed_quantity || 0),
        category_id: Number(i.category_id || 0),
        unit_price: Number(i.unit_price),
        total_price: Number(i.total_price)
      })).filter(item => item.quantity > 0);

      if (items.length > 0) {
        await calculateOrderPoints({ 
          customer_id: order.customer_id, 
          items: items.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
          total: Number(order.total)
        });
      }

      // Items canjeados (restar puntos)
      const redeemedItems = itemsRaw.map((i: any) => ({
        product_id: Number(i.product_id),
        quantity: Number(i.redeemed_quantity || 0),
        category_id: Number(i.category_id || 0),
        unit_price: Number(i.unit_price),
        total_price: Number(i.total_price)
      })).filter(item => item.quantity > 0);

      if (redeemedItems.length > 0) {
        // Para items canjeados, necesitamos restar puntos - esto requiere lógica especial
        console.log('Redeemed items to subtract points:', redeemedItems);
      }
    }

    revalidatePath("/dashboard/ordenes");
    return { success: true };
  } catch (error) {
    console.error("Error completing order with payment:", error);
    return { success: false, error: "Error al completar el pedido" };
  }
}

// Función para actualizar órdenes existentes sin método de pago
export async function updateExistingOrdersPaymentMethod() {
  try {
    const result = await sql(`UPDATE orders SET payment_method_name = 'Efectivo' WHERE payment_method_name IS NULL AND payment_method_id IS NULL AND status IN ('completado', 'entregado')`)
    
    return { success: true, updatedCount: result.length || 0 }
  } catch (error) {
    console.error("Error updating existing orders:", error)
    return { success: false, error: "Error al actualizar órdenes existentes" }
  }
}