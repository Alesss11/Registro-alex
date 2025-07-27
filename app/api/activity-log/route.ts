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
      console.log("Using Vercel KV for activities")
      // Usar Vercel KV si está disponible
      const { kv } = await import("@vercel/kv")

      const activityIds = (await kv.lrange("activities", 0, 49)) || []

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
      console.log("Using memory database for activities")
      // Usar memoria como respaldo
      activities = memoryDB.getActivities()
    }

    console.log(`Returning ${activities.length} activities`)
    return NextResponse.json(activities)
  } catch (error) {
    console.error("Error fetching activity log:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch activity log",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
