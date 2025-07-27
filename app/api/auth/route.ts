import { type NextRequest, NextResponse } from "next/server"

const CORRECT_PASSWORD = "Raquel19"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Verificar contraseña
    if (password !== CORRECT_PASSWORD) {
      return NextResponse.json({ success: false, error: "Contraseña incorrecta" }, { status: 401 })
    }

    // Crear respuesta exitosa
    const response = NextResponse.json({ success: true })

    // Establecer cookie segura (httpOnly para que no se pueda acceder desde JavaScript)
    response.cookies.set("auth-token", "authenticated-raquel19", {
      httpOnly: true, // No accesible desde JavaScript del cliente
      secure: process.env.NODE_ENV === "production", // Solo HTTPS en producción
      sameSite: "lax", // Cambiar de "strict" a "lax" para mejor compatibilidad
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/", // Válida para toda la aplicación
    })

    return response
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error del servidor" }, { status: 500 })
  }
}

// Endpoint para logout
export async function DELETE() {
  const response = NextResponse.json({ success: true })

  // Eliminar cookie de autenticación
  response.cookies.delete("auth-token")

  return response
}
