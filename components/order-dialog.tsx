"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, X } from "lucide-react"

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

interface OrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: Order | null
  onSaved: () => void
  currentMonth: number
  currentYear: number
}

export function OrderDialog({ open, onOpenChange, order, onSaved, currentMonth, currentYear }: OrderDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    is_own_material: false,
    price: "",
    advance_payment: "",
    alex_percentage: "",
    paid_to_alex: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (order) {
      setFormData({
        name: order.name,
        is_own_material: order.is_own_material,
        price: order.price.toString(),
        advance_payment: order.advance_payment.toString(),
        alex_percentage: order.alex_percentage.toString(),
        paid_to_alex: order.paid_to_alex.toString(),
      })
    } else {
      setFormData({
        name: "",
        is_own_material: false,
        price: "",
        advance_payment: "0",
        alex_percentage: "",
        paid_to_alex: "0",
      })
    }
  }, [order, open])

  // Calcular automáticamente el 10% cuando cambie el precio
  useEffect(() => {
    if (formData.price) {
      const price = Number.parseFloat(formData.price)
      if (!isNaN(price)) {
        const percentage = (price * 0.1).toFixed(2)
        setFormData((prev) => ({ ...prev, alex_percentage: percentage }))
      }
    }
  }, [formData.price]) // Removí la condición !order para que siempre recalcule

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userId = localStorage.getItem("userId")
      const url = order ? `/api/orders/${order.id}` : "/api/orders"
      const method = order ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price: Number.parseFloat(formData.price),
          advance_payment: Number.parseFloat(formData.advance_payment || "0"),
          alex_percentage: Number.parseFloat(formData.alex_percentage),
          paid_to_alex: Number.parseFloat(formData.paid_to_alex || "0"),
          month: currentMonth,
          year: currentYear,
          created_by: Number.parseInt(userId || "1"),
        }),
      })

      if (response.ok) {
        onSaved()
        onOpenChange(false)
      } else {
        console.error("Error saving order")
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{order ? "Editar Pedido" : "Nuevo Pedido"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del pedido</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Caja del día, Pedido María..."
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="own-material"
              checked={formData.is_own_material}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_own_material: checked as boolean }))}
            />
            <Label htmlFor="own-material">Material propio</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Precio (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="advance">Adelanto (€)</Label>
              <Input
                id="advance"
                type="number"
                step="0.01"
                value={formData.advance_payment}
                onChange={(e) => setFormData((prev) => ({ ...prev, advance_payment: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="percentage">% Alex (€)</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                value={formData.alex_percentage}
                onChange={(e) => setFormData((prev) => ({ ...prev, alex_percentage: e.target.value }))}
                required
                className="bg-blue-50" // Indicar que se calcula automáticamente
              />
              <p className="text-xs text-blue-600 mt-1">Se calcula automáticamente (10%)</p>
            </div>
            <div>
              <Label htmlFor="paid">Pagado Alex (€)</Label>
              <Input
                id="paid"
                type="number"
                step="0.01"
                value={formData.paid_to_alex}
                onChange={(e) => setFormData((prev) => ({ ...prev, paid_to_alex: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
