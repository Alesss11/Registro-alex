-- Ejecuta este script en tu base de datos Neon

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuarios por defecto
INSERT INTO users (name) VALUES ('Alex'), ('Isa') ON CONFLICT DO NOTHING;

-- Crear tabla de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_own_material BOOLEAN DEFAULT false,
  price DECIMAL(10,2) NOT NULL,
  advance_payment DECIMAL(10,2) DEFAULT 0,
  alex_percentage DECIMAL(10,2) NOT NULL,
  paid_to_alex DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL
);

-- Crear tabla de registro de cambios
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  field_changed VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_month_year ON orders(month, year);
CREATE INDEX IF NOT EXISTS idx_activity_log_order_id ON activity_log(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
