import { NextResponse } from "next/server"
import { memoryDB } from "@/lib/memory-db"

export async function POST() {
  try {
    // Verificar que KV esté disponible
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return NextResponse.json({ error: "KV no está configurado" }, { status: 400 })
    }

    const { kv } = await import("@vercel/kv")

    // Obtener todos los pedidos de memoria
    const memoryOrders = memoryDB.getAllOrders()
    const memoryActivities = memoryDB.getActivities()

    let migratedOrders = 0
    let migratedActivities = 0

    // Migrar pedidos
    for (const order of memoryOrders) {
      // Guardar el pedido
      await kv.hset(`order:${order.id}`, {
        ...order,
        price: order.price.toString(),
        advance_payment: order.advance_payment.toString(),
        alex_percentage: order.alex_percentage.toString(),
        paid_to_alex: order.paid_to_alex.toString(),
        month: order.month.toString(),
        year: order.year.toString(),
        created_by: order.created_by.toString(),
        is_own_material: order.is_own_material.toString(),
      })

      // Añadir a la lista del mes
      const ordersKey = `orders:${order.year}:${order.month}`
      await kv.sadd(ordersKey, order.id)

      // Actualizar contador si es necesario
      const currentCounter = await kv.get("order_counter")
      if (!currentCounter || Number(currentCounter) < order.id) {
        await kv.set("order_counter", order.id)
      }

      migratedOrders++
    }

    // Migrar actividades
    for (const activity of memoryActivities) {
      await kv.hset(`activity:${activity.id}`, {
        ...activity,
        id: activity.id.toString(),
        order_id: activity.order_id.toString(),
        user_id: activity.user_id.toString(),
      })

      await kv.lpush("activities", activity.id)

      // Actualizar contador si es necesario
      const currentCounter = await kv.get("activity_counter")
      if (!currentCounter || Number(currentCounter) < activity.id) {
        await kv.set("activity_counter", activity.id)
      }

      migratedActivities++
    }

    // Limpiar lista de actividades (mantener solo las últimas 50)
    await kv.ltrim("activities", 0, 49)

    return NextResponse.json({
      success: true,
      migratedOrders,
      migratedActivities,
      message: "Migración completada exitosamente",
    })
  } catch (error) {
    console.error("Error migrating to KV:", error)
    return NextResponse.json(
      {
        error: "Error durante la migración",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
