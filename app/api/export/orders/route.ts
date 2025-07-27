import { type NextRequest, NextResponse } from "next/server"
import { memoryDB } from "@/lib/memory-db"

// Función para verificar si KV está disponible
function isKVAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const allMonths = searchParams.get("all") === "true"

    let orders = []

    if (isKVAvailable()) {
      console.log("Using Vercel KV for orders export")
      const { kv } = await import("@vercel/kv")

      if (allMonths) {
        // Exportar todos los pedidos
        const currentYear = new Date().getFullYear()
        for (let y = currentYear - 1; y <= currentYear + 1; y++) {
          for (let m = 1; m <= 12; m++) {
            const ordersKey = `orders:${y}:${m}`
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
          }
        }
      } else if (month && year) {
        // Exportar solo un mes específico
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
      }
    } else {
      console.log("Using memory database for orders export")
      if (allMonths) {
        orders = memoryDB.getAllOrders()
      } else if (month && year) {
        orders = memoryDB.getOrdersByMonth(Number.parseInt(month), Number.parseInt(year))
      }
    }

    // Ordenar por fecha de creación
    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Crear contenido CSV
    const csvHeaders = [
      "ID",
      "Nombre del Pedido",
      "Precio (€)",
      "Adelanto (€)",
      "Porcentaje Alex (€)",
      "Pagado a Alex (€)",
      "Pendiente (€)",
      "Material Propio",
      "Estado",
      "Mes",
      "Año",
      "Creado por",
      "Fecha Creación",
      "Última Actualización",
    ]

    const csvRows = orders.map((order) => {
      const pending = order.alex_percentage - order.paid_to_alex
      const status = pending <= 0 ? "Pagado" : "Pendiente"
      const createdDate = new Date(order.created_at).toLocaleString("es-ES")
      const updatedDate = new Date(order.updated_at).toLocaleString("es-ES")
      const createdBy = order.created_by === 1 ? "Alex" : "Isa"

      const months = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ]

      return [
        order.id,
        `"${order.name}"`, // Comillas para manejar comas en nombres
        order.price.toFixed(2),
        order.advance_payment.toFixed(2),
        order.alex_percentage.toFixed(2),
        order.paid_to_alex.toFixed(2),
        pending.toFixed(2),
        order.is_own_material ? "Sí" : "No",
        status,
        months[order.month - 1],
        order.year,
        createdBy,
        createdDate,
        updatedDate,
      ]
    })

    // Convertir a CSV
    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n")

    // Nombre del archivo
    let filename = "pedidos"
    if (month && year && !allMonths) {
      const months = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ]
      filename = `pedidos-${months[Number.parseInt(month) - 1]}-${year}`
    } else if (allMonths) {
      filename = "pedidos-todos"
    }
    filename += `-${new Date().toISOString().split("T")[0]}.csv`

    // Crear respuesta con headers para descarga
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    })

    return response
  } catch (error) {
    console.error("Error exporting orders:", error)
    return NextResponse.json(
      {
        error: "Failed to export orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
