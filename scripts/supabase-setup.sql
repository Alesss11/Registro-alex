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

-- Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acceso público (para esta app simple)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on activity_log" ON activity_log FOR ALL USING (true);
