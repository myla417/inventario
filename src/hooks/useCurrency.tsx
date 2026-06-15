import { useContext, createContext, useState, useEffect } from 'react'
import type { ExchangeRate } from '@/interfaces/data/ExchangeRate'
import type { ExchangeRates } from '@/Utils.functions'
import { supabase } from '@/lib/supabase'

interface CurrencyContextType {
  rates: ExchangeRates
  exchangeRates: ExchangeRate[]
  loading: boolean
  refreshRates: (storeId: string) => Promise<void>
}

const defaultRates: ExchangeRates = {
  USD: 3700,
  DLS: 3700,
  COP: 1,
  VES: 6.5,
}

const CurrencyContext = createContext<CurrencyContextType>({
  rates: defaultRates,
  exchangeRates: [],
  loading: true,
  refreshRates: async () => {},
})

export function CurrencyProvider({ children, storeId }: { children: React.ReactNode; storeId: string }) {
  const [rates, setRates] = useState<ExchangeRates>(defaultRates)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)

  const refreshRates = async (sId: string) => {
    if (!sId) return
    setLoading(true)
    const { data } = await supabase
      .from('exchange_rates')
      .select()
      .eq('store_id', sId)
      .overrideTypes<Array<ExchangeRate>>()
    if (data && data.length > 0) {
      setExchangeRates(data)
      const newRates: ExchangeRates = { USD: 3700, COP: 1, VES: 6.5, DLS: 3700 }
      data.forEach((r) => {
        if (r.currency === 'USD') newRates.USD = r.rate_exchange
        if (r.currency === 'COP') newRates.COP = r.rate_exchange
        if (r.currency === 'VES') newRates.VES = r.rate_exchange
        if (r.currency === 'DLS') newRates.DLS = r.rate_exchange
      })
      setRates(newRates)
    }
    setLoading(false)
  }

  useEffect(() => {
    refreshRates(storeId)
  }, [storeId])

  return (
    <CurrencyContext.Provider value={{ rates, exchangeRates, loading, refreshRates }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}