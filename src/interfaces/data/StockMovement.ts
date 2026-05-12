export interface StockMovement {
  id: string
  store_id: string
  product_id: string
  product_name?: string
  type: 'entry' | 'exit' | 'adjustment'
  quantity: number
  previous_quantity: number
  new_quantity: number
  reason: string
  reference_type: string | null
  reference_id: string | null
  created_at: string
  created_by: string
}