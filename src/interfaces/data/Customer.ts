export interface Customer {
  id: string
  store_id: string
  name: string
  phone: string
  address: string
  notes: string
  credit_limit: number
  balance: number
  created_at: string
}

export interface CustomerFormData {
  name: string
  phone: string
  address: string
  notes: string
  credit_limit: number
}