-- FleetTracker Database Schema
-- PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  vin VARCHAR(17) UNIQUE NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  mileage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  description TEXT,
  cost DECIMAL(10,2),
  performed_at DATE,
  technician VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for demo)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_logs(vehicle_id);

-- Seed data for demo
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@jlr.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrOe5N5AQFk5M0EqFWnN1FzsBq8YlQB4W/O', 'admin'),
  ('fleet@jlr.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrOe5N5AQFk5M0EqFWnN1FzsBq8YlQB4W/O', 'user'),
  ('manager@jlr.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrOe5N5AQFk5M0EqFWnN1FzsBq8YlQB4W/O', 'manager')
ON CONFLICT (email) DO NOTHING;

INSERT INTO vehicles (vin, model, year, owner_id, notes, status, mileage) VALUES
  ('SALWA2BK9LA123456', 'Range Rover Sport', 2024, 1, 'Executive vehicle - <script>alert("XSS")</script>', 'active', 12500),
  ('SADCA2BN5LA789012', 'Jaguar F-PACE', 2023, 2, 'Fleet vehicle for sales team', 'active', 28700),
  ('SALGS2SE1LA345678', 'Range Rover Evoque', 2024, 1, 'Pool vehicle', 'maintenance', 5200),
  ('SAJWA4FB3LA901234', 'Jaguar E-PACE', 2023, 3, 'Manager assigned vehicle', 'active', 18300),
  ('SALYK2EX5LA567890', 'Defender 110', 2024, 2, 'Off-road testing unit', 'active', 8900)
ON CONFLICT (vin) DO NOTHING;

INSERT INTO maintenance_logs (vehicle_id, description, cost, performed_at, technician) VALUES
  (1, 'Annual service and inspection', 850.00, '2024-03-15', 'John Smith'),
  (1, 'Brake pad replacement', 420.00, '2024-06-20', 'Mike Johnson'),
  (2, 'Oil change and filter', 180.00, '2024-04-10', 'John Smith'),
  (3, 'Tire rotation', 95.00, '2024-05-05', 'Sarah Williams'),
  (4, 'Battery replacement', 320.00, '2024-07-12', 'Mike Johnson');
