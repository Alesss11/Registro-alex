"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Briefcase, Shield } from "lucide-react"

export default function UserSelectionPage() {
  const router = useRouter()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar autenticación
    const authToken = localStorage.getItem("auth-token")
    const authTimestamp = localStorage.getItem("auth-timestamp")

    if (authToken === "authenticated-raquel19" && authTimestamp) {
      // Verificar que no haya expirado (7 días)
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
      const isExpired = Date.now() - Number.parseInt(authTimestamp) > sevenDaysInMs

      if (!isExpired) {
        setIsAuthenticated(true)
      } else {
        // Token expirado, limpiar y redirigir
        localStorage.removeItem("auth-token")
        localStorage.removeItem("auth-timestamp")
        router.push("/login")
        return
      }
    } else {
      // No autenticado, redirigir al login
      router.push("/login")
      return
    }

    setLoading(false)
  }, [router])

  const handleLogin = (userName: string) => {
    localStorage.setItem("currentUser", userName)
    localStorage.setItem("userId", userName === "Alex" ? "1" : "2")
    router.push("/dashboard")
  }

  const handleLogout = () => {
    localStorage.removeItem("auth-token")
    localStorage.removeItem("auth-timestamp")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("userId")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Se redirigirá al login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Gestor de Pedidos</CardTitle>
          <CardDescription>Selecciona tu usuario para continuar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
              <Shield className="w-4 h-4" />
              Acceso autorizado
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cambiar contraseña
            </Button>
          </div>

          <div className="grid gap-3">
            <Button
              variant={selectedUser === "Alex" ? "default" : "outline"}
              className="h-16 text-left justify-start"
              onClick={() => setSelectedUser("Alex")}
            >
              <User className="mr-3 h-5 w-5" />
              <div>
                <div className="font-medium">Alex</div>
              </div>
            </Button>
            <Button
              variant={selectedUser === "Isa" ? "default" : "outline"}
              className="h-16 text-left justify-start"
              onClick={() => setSelectedUser("Isa")}
            >
              <User className="mr-3 h-5 w-5" />
              <div>
                <div className="font-medium">Isa</div>
              </div>
            </Button>
          </div>

          {selectedUser && (
            <Button className="w-full mt-6" onClick={() => handleLogin(selectedUser)}>
              Entrar como {selectedUser}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
