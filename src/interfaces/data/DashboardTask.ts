export interface DashboardTask {
  id: string
  store_id: string
  title: string
  description: string
  due_date: string | null
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
  created_by: string
}

export interface DashboardColumn {
  id: string
  store_id: string
  name: string
  position: number
  created_at: string
}

export interface KanbanItem {
  id: string
  title: string
  description: string
  due_date: string | null
  columnId: string
}