export interface ExchangeRate {
  id: string
  store_id: string
  currency: 'USD' | 'COP' | 'VES' | 'DLS'
  rate_exchange: number
  updated_at: string
  updated_by: string
}