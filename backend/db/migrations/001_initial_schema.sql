CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buses (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status TEXT NOT NULL CHECK (status IN ('Ready', 'On route', 'Maintenance'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  bus_id TEXT REFERENCES buses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Ready',
  avatar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('blue', 'purple', 'orange')),
  bus_id TEXT REFERENCES buses(id) ON DELETE SET NULL,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  stops TEXT[] NOT NULL CHECK (cardinality(stops) >= 2),
  start_time TEXT NOT NULL,
  duration TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Paused'))
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  parent TEXT NOT NULL,
  phone TEXT NOT NULL,
  route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
  stop TEXT NOT NULL,
  pickup TEXT NOT NULL,
  avatar TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  route_id TEXT,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Morning pickup', 'Afternoon drop')),
  status TEXT NOT NULL CHECK (status IN ('Scheduled', 'In progress', 'Completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  eta TEXT NOT NULL,
  simulated BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS trip_attendance (
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Upcoming', 'Picked up', 'Dropped off')),
  PRIMARY KEY (trip_id, student_id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Emergency', 'Delay', 'Pickup', 'Drop', 'Info')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  time TIMESTAMPTZ NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS school_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS students_route_id_idx ON students(route_id);
CREATE INDEX IF NOT EXISTS trips_date_status_idx ON trips(date, status);
CREATE INDEX IF NOT EXISTS alerts_time_idx ON alerts(time DESC);
