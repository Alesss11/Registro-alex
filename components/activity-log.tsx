"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, User, Edit, Plus, Euro, FileSpreadsheet } from "lucide-react"

interface ActivityLogEntry {
  id: number
  order_id: number
  user_name: string
  action: string
  old_value: string | null
  new_value: string | null
  field_changed: string | null
  created_at: string
  order_name: string
}

interface ActivityLogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivityLog({ open, onOpenChange }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (open) {
      fetchActivities()
    }
  }, [open])

  const fetchActivities = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/activity-log")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        setActivities(data)
      } else if (data.error) {
        setError(data.error)
        setActivities([])
      } else {
        setActivities([])
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
      setError("Error al cargar el registro de actividad")
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      const response = await fetch("/api/export/activity-log")

      if (!response.ok) {
        throw new Error("Error al generar el archivo")
      }

      // Obtener el blob del archivo
      const blob = await response.blob()

      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      // Nombre del archivo con fecha actual
      const now = new Date()
      const dateStr = now.toISOString().split("T")[0] // YYYY-MM-DD
      link.download = `registro-actividad-${dateStr}.xlsx`

      // Simular click para descargar
      document.body.appendChild(link)
      link.click()

      // Limpiar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      alert("Error al exportar a Excel. Inténtalo de nuevo.")
    } finally {
      setExporting(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Plus className="w-4 h-4 text-green-600" />
      case "UPDATE":
        return <Edit className="w-4 h-4 text-blue-600" />
      case "PAYMENT":
        return <Euro className="w-4 h-4 text-orange-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionText = (activity: ActivityLogEntry) => {
    switch (activity.action) {
      case "CREATE":
        return "creó el pedido"
      case "UPDATE":
        return `modificó ${activity.field_changed}`
      case "PAYMENT":
        return `registró un pago de €${activity.new_value}`
      default:
        return activity.action.toLowerCase()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Registro de Actividad
            </DialogTitle>
            <Button
              onClick={exportToExcel}
              disabled={exporting || activities.length === 0}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exportando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando actividad...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay actividad registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-1">{getActionIcon(activity.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        <User className="w-3 h-3 mr-1" />
                        {activity.user_name}
                      </Badge>
                      <span className="text-xs text-gray-500">{formatDate(activity.created_at)}</span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{activity.user_name}</span> {getActionText(activity)}{" "}
                      <span className="font-medium">"{activity.order_name}"</span>
                    </p>
                    {activity.old_value && activity.new_value && activity.action === "UPDATE" && (
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="line-through">€{activity.old_value}</span>
                        {" → "}
                        <span className="font-medium">€{activity.new_value}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
