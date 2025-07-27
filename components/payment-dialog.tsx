"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Euro, X, AlertCircle } from "lucide-react"

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

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: Order | null
  onSaved: () => void
}

export function PaymentDialog({ open, onOpenChange, order, onSaved }: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (order && open) {
      // Sugerir el monto pendiente por defecto
      const pending = order.alex_percentage - order.paid_to_alex
      setPaymentAmount(pending > 0 ? pending.toFixed(2) : "0")
      setError(null)
    }
  }, [order, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return

    setLoading(true)
    setError(null)

    try {
      const newPaidAmount = Number.parseFloat(paymentAmount)

      // Validaciones
      if (isNaN(newPaidAmount) || newPaidAmount <= 0) {
        setError("El monto debe ser mayor a 0")
        setLoading(false)
        return
      }

      const totalPaid = order.paid_to_alex + newPaidAmount

      if (totalPaid > order.alex_percentage) {
        setError("El pago excede el monto pendiente")
        setLoading(false)
        return
      }

      const response = await fetch(`/api/orders/${order.id}/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid_to_alex: totalPaid,
          payment_amount: newPaidAmount,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        onSaved()
        onOpenChange(false)
        setPaymentAmount("")
        setError(null)
      } else {
        console.error("Error updating payment:", result)
        setError(result.error || "Error al registrar el pago")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  const pendingAmount = order.alex_percentage - order.paid_to_alex
  const maxPayment = Math.max(0, pendingAmount)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">{order.name}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Alex:</span>
                <p className="font-medium">€{order.alex_percentage.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Ya pagado:</span>
                <p className="font-medium">€{order.paid_to_alex.toFixed(2)}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Pendiente:</span>
                <p className="font-medium text-orange-600">€{pendingAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="payment">Cantidad a pagar (€)</Label>
              <Input
                id="payment"
                type="number"
                step="0.01"
                min="0.01"
                max={maxPayment}
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value)
                  setError(null)
                }}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Máximo: €{maxPayment.toFixed(2)}</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  setError(null)
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !paymentAmount || maxPayment <= 0}>
                <Euro className="w-4 h-4 mr-2" />
                {loading ? "Guardando..." : "Registrar Pago"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
