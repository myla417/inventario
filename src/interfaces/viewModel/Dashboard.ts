export interface SalesSummary {
  date: string
  revenue: number
  profit: number
  orders: number
  paymentMethod: string
}

export interface SalesByProduct {
  id: string
  category: string
  name: string
  price: number
  margin: number
  cost: number
  profit: number
  revenue: number
  totalSales: number
}

export interface SalesByPaymentMethod {
  name: string
  amount: number
  percentage: number
}

export interface SalesDateSummary {
  date: string
  revenue: number
  profit: number
  orders: number
}

export interface DashboardStats {
  todaySales: number
  todayProfit: number
  todayOrders: number
  lowStockCount: number
  totalInventoryValue: number
  monthlyRevenue: number
}