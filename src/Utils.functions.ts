export const difference = (num1: number, num2: number): string => {
  if (num2 === 0) {
    return num1 > 0 ? "+100.00%" : num1 < 0 ? "-100.00%" : "0.00%"
  }
  const diff = ((num1 - num2) / num2) * 100
  return diff > 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`
}

export const formatAmount = (num: number): string =>
  num?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatCurrency = (amountCop: number, currency: 'USD' | 'COP' | 'VES' | 'DLS', rates: ExchangeRates): string => {
  const converted = convertCurrency(amountCop, currency, rates)
  const symbols: Record<string, string> = { USD: '$', COP: '$', VES: 'Bs', DLS: '$' }
  return `${symbols[currency] || ''}${formatAmount(converted)}`
}

export const convertCurrency = (amountCop: number, currency: 'USD' | 'COP' | 'VES' | 'DLS', rates: ExchangeRates): number => {
  if (currency === 'COP') return amountCop
  return amountCop / (rates[currency] || 1)
}

export interface ExchangeRates {
  USD: number
  COP: number
  VES: number
  DLS: number
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: 'USD',
  COP: '$',
  VES: 'Bs',
  DLS: 'DLS'
}

export const CURRENCY_NAMES: Record<string, string> = {
  USD: 'Dólar (USD)',
  COP: 'Peso Colombiano (COP)',
  VES: 'Bolívar (VES)',
  DLS: 'Dólar'
}

export const PRODUCT_UNITS = [
  { label: 'Unidad', value: 'unidad' },
  { label: 'Metro', value: 'metro' },
  { label: 'Metro Cubico', value: 'm3' },
  { label: 'Kilogramo', value: 'kg' },
  { label: 'Litro', value: 'litro' },
  { label: 'Bolsa', value: 'bolsa' },
  { label: 'Caja', value: 'caja' },
  { label: 'Saco', value: 'saco' },
  { label: 'Barra', value: 'barra' },
  { label: 'Lámina', value: 'lamina' },
  { label: 'Rollo', value: 'rollo' },
  { label: 'Galón', value: 'galon' },
  { label: 'Pieza', value: 'pieza' },
]

export const EXPENSE_CATEGORIES = [
  'Alquiler',
  'Servicios',
  'Nómina',
  'Transporte',
  'Mantenimiento',
  'Publicidad',
  'Otro',
]