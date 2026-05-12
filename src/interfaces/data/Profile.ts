export interface Profile {
  id: string
  user_id: string
  store_id: string
  name: string
  role: 'admin' | 'cashier'
  created_at: string
  deleted_at: string | null
}