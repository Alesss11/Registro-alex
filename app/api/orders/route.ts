import { type NextRequest, NextResponse } from "next/server"
import { memoryDB } from "@/lib/memory-db"

// Función para verificar si KV está disponible
function isKVAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = Number.parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
    const year = Number.parseInt(searchParams.get("year") || new Date().getFullYear().toString())

    console.log(`Fetching orders for month: ${month}, year: ${year}`)

    let orders = []

    if (isKVAvailable()) {
      console.log("Using Vercel KV")
      // Usar Vercel KV si está disponible
      const { kv } = await import("@vercel/kv")
      const ordersKey = `orders:${year}:${month}`
      const orderIds = (await kv.smembers(ordersKey)) || []

      for (const id of orderIds) {
        const order = await kv.hgetall(`order:${id}`)
        if (order) {
          orders.push({
            ...order,
            id: Number.parseInt(id as string),
            price: Number.parseFloat(order.price as string),
            advance_payment: Number.parseFloat(order.advance_payment as string),
            alex_percentage: Number.parseFloat(order.alex_percentage as string),
            paid_to_alex: Number.parseFloat(order.paid_to_alex as string),
            month: Number.parseInt(order.month as string),
            year: Number.parseInt(order.year as string),
            created_by: Number.parseInt(order.created_by as string),
            is_own_material: order.is_own_material === "true",
          })
        }
      }
    } else {
      console.log("Using memory database")
      // Usar memoria como respaldo
      orders = memoryDB.getOrdersByMonth(month, year)
      console.log(`Found ${orders.length} orders in memory`)
    }

    // Ordenar por fecha de creación
    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log(`Returning ${orders.length} orders`)
    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, is_own_material, price, advance_payment, alex_percentage, paid_to_alex, month, year, created_by } =
      body

    console.log("Creating new order:", { name, price, month, year })

    const now = new Date().toISOString()

    if (isKVAvailable()) {
      console.log("Using Vercel KV for order creation")
      // Usar Vercel KV si está disponible
      const { kv } = await import("@vercel/kv")
      const orderId = await kv.incr("order_counter")

      const order = {
        id: orderId,
        name,
        is_own_material,
        price,
        advance_payment,
        alex_percentage,
        paid_to_alex,
        month,
        year,
        created_by,
        created_at: now,
        updated_at: now,
      }

      // Guardar el pedido
      await kv.hset(`order:${orderId}`, order)

      // Añadir a la lista del mes
      const ordersKey = `orders:${year}:${month}`
      await kv.sadd(ordersKey, orderId)

      // Registrar actividad
      const activityId = await kv.incr("activity_counter")
      await kv.hset(`activity:${activityId}`, {
        id: activityId,
        order_id: orderId,
        user_id: created_by,
        action: "CREATE",
        new_value: name,
        created_at: now,
        order_name: name,
        user_name: created_by === 1 ? "Alex" : "Isa",
      })

      await kv.lpush("activities", activityId)
      await kv.ltrim("activities", 0, 49)

      return NextResponse.json(order)
    } else {
      console.log("Using memory database for order creation")
      // Usar memoria como respaldo
      const orderId = memoryDB.getNextOrderId()

      const order = {
        id: orderId,
        name,
        is_own_material,
        price: Number.parseFloat(price.toString()),
        advance_payment: Number.parseFloat(advance_payment.toString()),
        alex_percentage: Number.parseFloat(alex_percentage.toString()),
        paid_to_alex: Number.parseFloat(paid_to_alex.toString()),
        month: Number.parseInt(month.toString()),
        year: Number.parseInt(year.toString()),
        created_by: Number.parseInt(created_by.toString()),
        created_at: now,
        updated_at: now,
      }

      memoryDB.setOrder(orderId, order)

      // Registrar actividad
      memoryDB.addActivity({
        order_id: orderId,
        user_id: created_by,
        action: "CREATE",
        new_value: name,
        created_at: now,
        order_name: name,
        user_name: created_by === 1 ? "Alex" : "Isa",
      })

      console.log(`Order created with ID: ${orderId}`)
      return NextResponse.json(order)
    }
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json(
      {
        error: "Failed to create order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
