"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  LogOut,
  Edit,
  Calendar,
  Euro,
  TrendingUp,
  Clock,
  AlertCircle,
  Calculator,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react"
import { OrderDialog } from "@/components/order-dialog"
import { ActivityLog } from "@/components/activity-log"
import { PaymentDialog } from "@/components/payment-dialog"

interface Order {
  id: number
  name: string
  is_own_material: boolean
  price: number
  advance_payment: number
  alex_percentage: number
  paid_to_alex: number
  created_at: string
  month: number
  year: number
  created_by: number
}

interface Summary {
  totalOrders: number
  totalAlexPercentage: number
  totalPaid: number
  totalPending: number
  currentMonth: {
    orders: number
    alexPercentage: number
    paid: number
    pending: number
  }
  previousMonths: {
    orders: number
    alexPercentage: number
    paid: number
    pending: number
  }
  pendingByMonth: Array<{
    month: number
    year: number
    monthName: string
    pending: number
    orders: number
  }>
  referenceMonth: number
  referenceYear: number
}

export default function Dashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<string>("")
  const [orders, setOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [isUsingMemory, setIsUsingMemory] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    // Verificar autenticación
    const authToken = localStorage.getItem("auth-token")
    const user = localStorage.getItem("currentUser")

    if (authToken !== "authenticated-raquel19" || !user) {
      router.push("/login")
      return
    }

    setCurrentUser(user)
    fetchOrders()
    fetchSummary()
  }, [selectedMonth, selectedYear, router])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/orders?month=${selectedMonth}&year=${selectedYear}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Verificar que data es un array
      if (Array.isArray(data)) {
        setOrders(data)
        // Detectar si estamos usando memoria (datos temporales)
        setIsUsingMemory(data.length === 0 || !process.env.KV_REST_API_URL)
      } else if (data.error) {
        setError(data.error)
        setOrders([])
      } else {
        console.error("Unexpected response format:", data)
        setOrders([])
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      setError("Error al cargar los pedidos")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      // Pasar el mes y año seleccionados al API
      const response = await fetch(`/api/orders/summary?month=${selectedMonth}&year=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error("Error fetching summary:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth-token")
    localStorage.removeItem("auth-timestamp")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("userId")
    router.push("/login")
  }

  const handleOrderSaved = () => {
    fetchOrders()
    fetchSummary() // Actualizar resumen también
    setShowOrderDialog(false)
    setEditingOrder(null)
  }

  const handlePaymentSaved = () => {
    fetchOrders()
    fetchSummary() // Actualizar resumen también
    setShowPaymentDialog(false)
    setPaymentOrder(null)
  }

  const exportOrders = async (allMonths = false) => {
    setExporting(true)
    setShowExportMenu(false)

    try {
      let url = "/api/export/orders"
      if (allMonths) {
        url += "?all=true"
      } else {
        url += `?month=${selectedMonth}&year=${selectedYear}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Error al generar el archivo")
      }

      // Obtener el blob del archivo
      const blob = await response.blob()

      // Crear URL temporal para descarga
      const urlBlob = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = urlBlob

      // Nombre del archivo
      const dateStr = new Date().toISOString().split("T")[0]
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

      if (allMonths) {
        link.download = `pedidos-todos-${dateStr}.csv`
      } else {
        link.download = `pedidos-${months[selectedMonth - 1]}-${selectedYear}-${dateStr}.csv`
      }

      // Simular click para descargar
      document.body.appendChild(link)
      link.click()

      // Limpiar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(urlBlob)
    } catch (error) {
      console.error("Error exporting orders:", error)
      alert("Error al exportar pedidos. Inténtalo de nuevo.")
    } finally {
      setExporting(false)
    }
  }

  // Asegurar que orders es un array antes de usar reduce
  const safeOrders = Array.isArray(orders) ? orders : []
  const totalPending = safeOrders.reduce((sum, order) => sum + (order.alex_percentage - order.paid_to_alex), 0)
  const totalPaid = safeOrders.reduce((sum, order) => sum + order.paid_to_alex, 0)
  const totalOrders = safeOrders.length

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="text-red-600 mb-4">⚠️</div>
            <h3 className="font-semibold mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button className="mt-4" onClick={fetchOrders}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestor de Pedidos</h1>
              <p className="text-gray-600">Bienvenido, {currentUser}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Menú de exportación */}
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Exportando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Exportar
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border z-10">
                    <div className="py-1">
                      <button
                        onClick={() => exportOrders(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📊 Pedidos del mes actual
                      </button>
                      <button
                        onClick={() => exportOrders(true)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📈 Todos los pedidos
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <div className="px-4 py-2 text-xs text-gray-500">
                        El registro de actividad se exporta desde el botón "Registro"
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button variant="outline" onClick={() => setShowActivityLog(true)}>
                <Clock className="w-4 h-4 mr-2" />
                Registro
              </Button>
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cerrar menú de exportación al hacer click fuera */}
      {showExportMenu && <div className="fixed inset-0 z-5" onClick={() => setShowExportMenu(false)}></div>}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Aviso de modo temporal */}
        {isUsingMemory && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <h4 className="font-medium text-orange-800">Modo temporal activo</h4>
                  <p className="text-sm text-orange-700">
                    Los datos se guardan temporalmente. Para sincronización permanente, añade Vercel KV en las
                    integraciones.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen Global */}
        {summary && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Calculator className="w-5 h-5" />
                Resumen Global de Pagos
                <span className="text-sm font-normal text-blue-600">
                  (relativo a {months[selectedMonth - 1]} {selectedYear})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Total a pagar (Alex):</div>
                  <div className="text-xl font-bold text-blue-600">€{summary.totalAlexPercentage.toFixed(2)}</div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Total pagado:</div>
                  <div className="text-xl font-bold text-green-600">€{summary.totalPaid.toFixed(2)}</div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Falta por pagar:</div>
                  <div className="text-xl font-bold text-red-600">€{summary.totalPending.toFixed(2)}</div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">
                    Falta meses anteriores a {months[selectedMonth - 1]}:
                  </div>
                  <div className="text-xl font-bold text-orange-600">€{summary.previousMonths.pending.toFixed(2)}</div>
                </div>
              </div>

              {/* Desglose por mes de pendientes */}
              {summary.pendingByMonth.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Pendientes por mes:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {summary.pendingByMonth.map((monthData) => (
                      <div
                        key={`${monthData.year}-${monthData.month}`}
                        className={`bg-white p-3 rounded-lg border-l-4 ${
                          monthData.year < selectedYear ||
                          (monthData.year === selectedYear && monthData.month < selectedMonth)
                            ? "border-l-red-500"
                            : monthData.year === selectedYear && monthData.month === selectedMonth
                              ? "border-l-blue-500"
                              : "border-l-orange-500"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-800">
                              {monthData.monthName} {monthData.year}
                            </div>
                            <div className="text-xs text-gray-500">
                              {monthData.orders} pedido{monthData.orders !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600">€{monthData.pending.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Desglose adicional */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Mes Seleccionado ({months[selectedMonth - 1]} {selectedYear})
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pendiente:</span>
                      <span className="font-medium text-orange-600">€{summary.currentMonth.pending.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagado:</span>
                      <span className="font-medium text-green-600">€{summary.currentMonth.paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pedidos:</span>
                      <span className="font-medium">{summary.currentMonth.orders}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-800 mb-2">Meses Anteriores a {months[selectedMonth - 1]}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pendiente:</span>
                      <span className="font-medium text-red-600">€{summary.previousMonths.pending.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagado:</span>
                      <span className="font-medium text-green-600">€{summary.previousMonths.paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pedidos:</span>
                      <span className="font-medium">{summary.previousMonths.orders}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards del mes actual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos del Mes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {months[selectedMonth - 1]} {selectedYear}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagado del Mes</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">€{totalPaid.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendiente del Mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">€{totalPending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Por cobrar</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={() => setShowOrderDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Pedido
          </Button>
        </div>

        {/* Orders List */}
        <div className="grid gap-4">
          {safeOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">No hay pedidos para este mes</p>
                <Button className="mt-4" onClick={() => setShowOrderDialog(true)}>
                  Crear primer pedido
                </Button>
              </CardContent>
            </Card>
          ) : (
            safeOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{order.name}</h3>
                        {order.is_own_material && <Badge variant="secondary">Material propio</Badge>}
                        {order.paid_to_alex >= order.alex_percentage && (
                          <Badge className="bg-green-100 text-green-800">Pagado</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Precio:</span>
                          <p className="font-medium">€{order.price.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Adelanto:</span>
                          <p className="font-medium">€{order.advance_payment.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">% Alex:</span>
                          <p className="font-medium">€{order.alex_percentage.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pagado:</span>
                          <p className="font-medium text-green-600">€{order.paid_to_alex.toFixed(2)}</p>
                        </div>
                      </div>

                      {order.paid_to_alex < order.alex_percentage && (
                        <div className="mt-2">
                          <span className="text-sm text-orange-600 font-medium">
                            Pendiente: €{(order.alex_percentage - order.paid_to_alex).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPaymentOrder(order)
                          setShowPaymentDialog(true)
                        }}
                      >
                        <Euro className="w-4 h-4 mr-1" />
                        Pagar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingOrder(order)
                          setShowOrderDialog(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialogs */}
      <OrderDialog
        open={showOrderDialog}
        onOpenChange={setShowOrderDialog}
        order={editingOrder}
        onSaved={handleOrderSaved}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        order={paymentOrder}
        onSaved={handlePaymentSaved}
      />

      <ActivityLog open={showActivityLog} onOpenChange={setShowActivityLog} />
    </div>
  )
}
