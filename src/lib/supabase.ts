import type { StockMovement } from "@/interfaces/data/StockMovement"
import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

export const supabaseRpcSettings = async (id: string): Promise<StoreSettings> => {
  let settings: StoreSettings = {
    id: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
  }
  const { data } = await supabase.rpc('get_store_settings', { userid: id }).single().overrideTypes<StoreSettings>()
  if (data) {
    return data
  }
  return settings
}

export const supabaseRpcStockMovements = async (id: string): Promise<StockMovement[]> => {
  const { data } = await supabase.rpc('get_stock_movements', { storeid: id })
  if (data) {
    return data
  }
  return []
}

export interface StoreSettings {
  id: string
  name: string
  address: string
  phone: string
  email: string
  description: string
}