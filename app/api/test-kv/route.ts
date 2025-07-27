import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Verificar variables de entorno
    const kvUrl = process.env.KV_REST_API_URL
    const kvToken = process.env.KV_REST_API_TOKEN

    if (!kvUrl || !kvToken) {
      return NextResponse.json({
        status: "❌ KV no configurado",
        details: "Faltan variables de entorno KV_REST_API_URL o KV_REST_API_TOKEN",
        hasUrl: !!kvUrl,
        hasToken: !!kvToken,
      })
    }

    // Probar conexión
    const { kv } = await import("@vercel/kv")

    // Test básico
    await kv.set("test-connection", "OK")
    const testValue = await kv.get("test-connection")
    await kv.del("test-connection")

    return NextResponse.json({
      status: "✅ KV funcionando correctamente",
      testResult: testValue,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: "❌ Error de conexión KV",
      error: error instanceof Error ? error.message : "Error desconocido",
    })
  }
}
