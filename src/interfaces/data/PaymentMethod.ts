export interface PaymentMethod {
  id: string
  store_id: string
  name: string
  currency: 'USD' | 'COP' | 'VES'
  is_active: boolean
  created_at: string
}