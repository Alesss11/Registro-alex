import { type NextRequest, NextResponse } from "next/server"
import { memoryDB } from "@/lib/memory-db"

// Función para verificar si KV está disponible
function isKVAvailable() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

export async function GET(request: NextRequest) {
  try {
    // Obtener el mes y año de los parámetros de consulta
    const { searchParams } = new URL(request.url)
    const selectedMonth = Number.parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
    const selectedYear = Number.parseInt(searchParams.get("year") || new Date().getFullYear().toString())

    console.log(`Calculating summary relative to: ${selectedMonth}/${selectedYear}`)

    let allOrders = []

    if (isKVAvailable()) {
      console.log("Using Vercel KV for summary")
      // Usar Vercel KV si está disponible
      const { kv } = await import("@vercel/kv")

      // Obtener todos los pedidos de todos los meses
      for (let year = selectedYear - 1; year <= selectedYear + 1; year++) {
        for (let month = 1; month <= 12; month++) {
          const ordersKey = `orders:${year}:${month}`
          const orderIds = (await kv.smembers(ordersKey)) || []

          for (const id of orderIds) {
            const order = await kv.hgetall(`order:${id}`)
            if (order) {
              allOrders.push({
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
    } else {
      console.log("Using memory database for summary")
      // Usar memoria como respaldo
      allOrders = memoryDB.getAllOrders()
    }

    // Usar el mes/año seleccionado como referencia, no la fecha actual
    const currentMonthOrders = allOrders.filter((order) => order.month === selectedMonth && order.year === selectedYear)

    // Meses anteriores: solo meses/años que sean anteriores al mes SELECCIONADO
    const previousMonthsOrders = allOrders.filter((order) => {
      if (order.year < selectedYear) return true
      if (order.year === selectedYear && order.month < selectedMonth) return true
      return false
    })

    console.log(`Current month orders (${selectedMonth}/${selectedYear}):`, currentMonthOrders.length)
    console.log(`Previous months orders:`, previousMonthsOrders.length)

    // Crear desglose por mes de los pendientes
    const monthlyBreakdown = allOrders.reduce(
      (acc, order) => {
        const pending = order.alex_percentage - order.paid_to_alex
        if (pending > 0) {
          const key = `${order.year}-${order.month.toString().padStart(2, "0")}`
          const monthName = [
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
          ][order.month - 1]

          if (!acc[key]) {
            acc[key] = {
              month: order.month,
              year: order.year,
              monthName,
              pending: 0,
              orders: 0,
            }
          }
          acc[key].pending += pending
          acc[key].orders += 1
        }
        return acc
      },
      {} as Record<string, { month: number; year: number; monthName: string; pending: number; orders: number }>,
    )

    // Convertir a array y ordenar por fecha
    const pendingByMonth = Object.values(monthlyBreakdown).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    const summary = {
      // Totales generales
      totalOrders: allOrders.length,
      totalAlexPercentage: allOrders.reduce((sum, order) => sum + order.alex_percentage, 0),
      totalPaid: allOrders.reduce((sum, order) => sum + order.paid_to_alex, 0),
      totalPending: allOrders.reduce((sum, order) => sum + (order.alex_percentage - order.paid_to_alex), 0),

      // Mes seleccionado
      currentMonth: {
        orders: currentMonthOrders.length,
        alexPercentage: currentMonthOrders.reduce((sum, order) => sum + order.alex_percentage, 0),
        paid: currentMonthOrders.reduce((sum, order) => sum + order.paid_to_alex, 0),
        pending: currentMonthOrders.reduce((sum, order) => sum + (order.alex_percentage - order.paid_to_alex), 0),
      },

      // Meses anteriores al seleccionado
      previousMonths: {
        orders: previousMonthsOrders.length,
        alexPercentage: previousMonthsOrders.reduce((sum, order) => sum + order.alex_percentage, 0),
        paid: previousMonthsOrders.reduce((sum, order) => sum + order.paid_to_alex, 0),
        pending: previousMonthsOrders.reduce((sum, order) => sum + (order.alex_percentage - order.paid_to_alex), 0),
      },

      // Desglose por mes de los pendientes
      pendingByMonth,

      // Información de referencia
      referenceMonth: selectedMonth,
      referenceYear: selectedYear,
    }

    console.log(`Summary calculated for ${selectedMonth}/${selectedYear}:`, {
      currentMonth: summary.currentMonth.pending,
      previousMonths: summary.previousMonths.pending,
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error("Error fetching summary:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
