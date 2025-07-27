import { type NextRequest, NextResponse } from "next/server"
import { memoryDB } from "@/lib/memory-db"

// Función para verificar si KV está disponible
function isKVAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { paid_to_alex, payment_amount } = body
    const orderId = Number.parseInt(params.id)

    console.log(`Processing payment for order ${orderId}:`, { paid_to_alex, payment_amount })

    if (isKVAvailable()) {
      // Usar Vercel KV si está disponible
      const { kv } = await import("@vercel/kv")

      const currentOrder = await kv.hgetall(`order:${params.id}`)
      if (!currentOrder) {
        console.log(`Order ${orderId} not found in KV`)
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      const updatedOrder = {
        ...currentOrder,
        paid_to_alex,
        updated_at: new Date().toISOString(),
      }

      await kv.hset(`order:${params.id}`, updatedOrder)

      // Registrar actividad de pago
      const activityId = await kv.incr("activity_counter")
      await kv.hset(`activity:${activityId}`, {
        id: activityId,
        order_id: params.id,
        user_id: 2,
        action: "PAYMENT",
        new_value: payment_amount,
        created_at: new Date().toISOString(),
        order_name: currentOrder.name,
        user_name: "Isa",
      })

      await kv.lpush("activities", activityId)
      await kv.ltrim("activities", 0, 49)

      return NextResponse.json({
        ...updatedOrder,
        id: Number.parseInt(params.id),
        price: Number.parseFloat(currentOrder.price as string),
        advance_payment: Number.parseFloat(currentOrder.advance_payment as string),
        alex_percentage: Number.parseFloat(currentOrder.alex_percentage as string),
        paid_to_alex: Number.parseFloat(paid_to_alex.toString()),
        month: Number.parseInt(currentOrder.month as string),
        year: Number.parseInt(currentOrder.year as string),
        created_by: Number.parseInt(currentOrder.created_by as string),
        is_own_material: currentOrder.is_own_material === "true",
      })
    } else {
      // Usar memoria como respaldo
      const currentOrder = memoryDB.getOrder(orderId)

      console.log(`Looking for order ${orderId} in memory...`)
      console.log(
        `All orders in memory:`,
        memoryDB.getAllOrders().map((o) => ({ id: o.id, name: o.name })),
      )

      if (!currentOrder) {
        console.log(`Order ${orderId} not found in memory`)
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      console.log(`Found order:`, currentOrder)

      const updatedOrder = {
        ...currentOrder,
        paid_to_alex: Number.parseFloat(paid_to_alex.toString()),
        updated_at: new Date().toISOString(),
      }

      memoryDB.setOrder(orderId, updatedOrder)

      // Registrar actividad de pago
      memoryDB.addActivity({
        order_id: orderId,
        user_id: 2,
        action: "PAYMENT",
        new_value: payment_amount.toString(),
        created_at: new Date().toISOString(),
        order_name: currentOrder.name,
        user_name: "Isa",
      })

      console.log(`Payment processed successfully for order ${orderId}`)
      return NextResponse.json(updatedOrder)
    }
  } catch (error) {
    console.error("Error updating payment:", error)
    return NextResponse.json(
      {
        error: "Failed to update payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
