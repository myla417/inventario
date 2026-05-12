-- Dashboard Tasks (Kanban) table
CREATE TABLE dashboard_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

CREATE INDEX idx_dashboard_tasks_store_id ON dashboard_tasks(store_id);
CREATE INDEX idx_dashboard_tasks_due_date ON dashboard_tasks(due_date);

-- RLS
ALTER TABLE dashboard_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboard tasks" ON dashboard_tasks FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Users can manage own dashboard tasks" ON dashboard_tasks FOR ALL USING (store_id = public.store_id());

-- Dashboard Columns (customizable kanban columns)
CREATE TABLE dashboard_columns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sin título',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, position)
);

CREATE INDEX idx_dashboard_columns_store_id ON dashboard_columns(store_id);

-- RLS for dashboard_columns
ALTER TABLE dashboard_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboard columns" ON dashboard_columns FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Users can manage own dashboard columns" ON dashboard_columns FOR ALL USING (store_id = public.store_id());

-- Default columns for new stores
CREATE OR REPLACE FUNCTION create_default_dashboard_columns(p_store_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO dashboard_columns (store_id, name, position) VALUES
    (p_store_id, 'Por hacer', 0),
    (p_store_id, 'En progreso', 1),
    (p_store_id, 'Hecho', 2);
END;
$$;