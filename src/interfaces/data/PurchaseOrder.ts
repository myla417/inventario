export interface PurchaseOrder {
  id: string
  store_id: string
  supplier_id: string
  supplier_name?: string
  status: 'pending' | 'received' | 'cancelled'
  total: number
  notes: string
  created_at: string
  created_by: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  order_id: string
  product_id: string
  product_name?: string
  quantity: number
  unit_cost: number
  total: number
}