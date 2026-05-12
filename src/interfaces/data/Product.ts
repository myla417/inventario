export interface Product {
  id: string
  store_id: string
  sku: string
  name: string
  description: string
  category_id: string
  category_name?: string
  unit: string
  cost: number
  retail_price: number
  wholesale_price: number
  current_stock: number
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ProductFormData {
  sku: string
  name: string
  description: string
  category_id: string
  unit: string
  cost: number
  retail_price: number
  wholesale_price: number
  min_stock: number
}