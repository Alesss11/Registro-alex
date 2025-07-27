import { NextResponse } from "next/server"
import { memoryDB } from "@/lib/memory-db"

// Función para verificar si KV está disponible
function isKVAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

export async function GET() {
  try {
    let activities = []

    if (isKVAvailable()) {
      console.log("Using Vercel KV for activities export")
      const { kv } = await import("@vercel/kv")

      const activityIds = (await kv.lrange("activities", 0, -1)) || [] // Obtener todas las actividades

      for (const id of activityIds) {
        const activity = await kv.hgetall(`activity:${id}`)
        if (activity) {
          activities.push({
            ...activity,
            id: Number.parseInt(id as string),
            order_id: Number.parseInt(activity.order_id as string),
            user_id: Number.parseInt(activity.user_id as string),
          })
        }
      }
    } else {
      console.log("Using memory database for activities export")
      activities = memoryDB.getActivities()
    }

    // Ordenar por fecha (más recientes primero)
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Crear contenido CSV
    const csvHeaders = [
      "ID",
      "Fecha y Hora",
      "Usuario",
      "Acción",
      "Pedido",
      "Campo Modificado",
      "Valor Anterior",
      "Valor Nuevo",
      "ID Pedido",
    ]

    const csvRows = activities.map((activity) => {
      const date = new Date(activity.created_at).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      const actionText =
        {
          CREATE: "Crear pedido",
          UPDATE: "Modificar pedido",
          PAYMENT: "Registrar pago",
        }[activity.action] || activity.action

      return [
        activity.id,
        date,
        activity.user_name || "Usuario desconocido",
        actionText,
        `"${activity.order_name || "Sin nombre"}"`, // Comillas para manejar comas en nombres
        activity.field_changed || "",
        activity.old_value || "",
        activity.new_value || "",
        activity.order_id,
      ]
    })

    // Convertir a CSV
    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n")

    // Crear respuesta con headers para descarga
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registro-actividad-${new Date().toISOString().split("T")[0]}.csv"`,
        "Cache-Control": "no-cache",
      },
    })

    return response
  } catch (error) {
    console.error("Error exporting activity log:", error)
    return NextResponse.json(
      {
        error: "Failed to export activity log",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
