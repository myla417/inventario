export interface Sale {
  id: string
  store_id: string
  customer_id: string | null
  customer_name: string
  subtotal: number
  discount: number
  tax: number
  total: number
  payment_method: string
  currency_paid: 'USD' | 'COP' | 'VES'
  exchange_rate: number
  amount_paid: number
  is_estimate: boolean
  estimate_number: string | null
  status: 'pending' | 'completed' | 'cancelled'
  paid: boolean
  created_at: string
  created_by: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  cost: number
  is_wholesale: boolean
  total: number
}

export interface CartItem {
  product_id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  cost: number
  is_wholesale: boolean
  total: number
}