// Base de datos en memoria compartida globalmente
interface Order {
  id: number
  name: string
  is_own_material: boolean
  price: number
  advance_payment: number
  alex_percentage: number
  paid_to_alex: number
  created_at: string
  updated_at: string
  month: number
  year: number
  created_by: number
}

interface Activity {
  id: number
  order_id: number
  user_id: number
  action: string
  old_value?: string
  new_value?: string
  field_changed?: string
  created_at: string
  order_name: string
  user_name: string
}

class MemoryDatabase {
  private orders: Map<number, Order> = new Map()
  private activities: Activity[] = []
  private counters = { order: 0, activity: 0 }

  // Orders
  getOrder(id: number): Order | undefined {
    return this.orders.get(id)
  }

  setOrder(id: number, order: Order): void {
    this.orders.set(id, order)
  }

  getOrdersByMonth(month: number, year: number): Order[] {
    return Array.from(this.orders.values()).filter((order) => order.month === month && order.year === year)
  }

  // Activities
  addActivity(activity: Omit<Activity, "id">): Activity {
    const id = ++this.counters.activity
    const newActivity = { ...activity, id }
    this.activities.unshift(newActivity)

    // Mantener solo las últimas 50
    if (this.activities.length > 50) {
      this.activities = this.activities.slice(0, 50)
    }

    return newActivity
  }

  getActivities(): Activity[] {
    return this.activities.slice(0, 50)
  }

  // Counters
  getNextOrderId(): number {
    return ++this.counters.order
  }

  // Debug
  getAllOrders(): Order[] {
    return Array.from(this.orders.values())
  }
}

// Instancia global
declare global {
  var MemoryDatabaseInstance: MemoryDatabase | undefined
}

const memoryDB = globalThis.MemoryDatabaseInstance ?? new MemoryDatabase()

if (process.env.NODE_ENV !== "production") {
  globalThis.MemoryDatabaseInstance = memoryDB
}

export { memoryDB }
export type { Order, Activity }
