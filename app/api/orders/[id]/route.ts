import { type NextRequest, NextResponse } from "next/server"
import { memoryDB } from "@/lib/memory-db"

// Función para verificar si KV está disponible
function isKVAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, is_own_material, price, advance_payment, alex_percentage, paid_to_alex } = body
    const orderId = Number.parseInt(params.id)

    console.log(`Updating order ${orderId}:`, { name, price })

    if (isKVAvailable()) {
      // Usar Vercel KV si está disponible
      const { kv } = await import("@vercel/kv")

      const currentOrder = await kv.hgetall(`order:${params.id}`)
      if (!currentOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      const updatedOrder = {
        ...currentOrder,
        name,
        is_own_material,
        price,
        advance_payment,
        alex_percentage,
        paid_to_alex,
        updated_at: new Date().toISOString(),
      }

      await kv.hset(`order:${params.id}`, updatedOrder)

      // Registrar actividad
      const activityId = await kv.incr("activity_counter")
      await kv.hset(`activity:${activityId}`, {
        id: activityId,
        order_id: params.id,
        user_id: 1,
        action: "UPDATE",
        old_value: currentOrder.price,
        new_value: price,
        field_changed: "precio",
        created_at: new Date().toISOString(),
        order_name: name,
        user_name: "Alex",
      })

      await kv.lpush("activities", activityId)
      await kv.ltrim("activities", 0, 49)

      return NextResponse.json({
        ...updatedOrder,
        id: Number.parseInt(params.id),
        price: Number.parseFloat(price.toString()),
        advance_payment: Number.parseFloat(advance_payment.toString()),
        alex_percentage: Number.parseFloat(alex_percentage.toString()),
        paid_to_alex: Number.parseFloat(paid_to_alex.toString()),
        month: Number.parseInt(updatedOrder.month as string),
        year: Number.parseInt(updatedOrder.year as string),
        created_by: Number.parseInt(updatedOrder.created_by as string),
        is_own_material: is_own_material,
      })
    } else {
      // Usar memoria como respaldo
      const currentOrder = memoryDB.getOrder(orderId)
      if (!currentOrder) {
        console.log(`Order ${orderId} not found in memory`)
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      const updatedOrder = {
        ...currentOrder,
        name,
        is_own_material,
        price: Number.parseFloat(price.toString()),
        advance_payment: Number.parseFloat(advance_payment.toString()),
        alex_percentage: Number.parseFloat(alex_percentage.toString()),
        paid_to_alex: Number.parseFloat(paid_to_alex.toString()),
        updated_at: new Date().toISOString(),
      }

      memoryDB.setOrder(orderId, updatedOrder)

      // Registrar actividad
      memoryDB.addActivity({
        order_id: orderId,
        user_id: 1,
        action: "UPDATE",
        old_value: currentOrder.price.toString(),
        new_value: price.toString(),
        field_changed: "precio",
        created_at: new Date().toISOString(),
        order_name: name,
        user_name: "Alex",
      })

      console.log(`Order ${orderId} updated successfully`)
      return NextResponse.json(updatedOrder)
    }
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      {
        error: "Failed to update order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
