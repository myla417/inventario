import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ShoppingCart, AlertTriangle, TrendingUp, BarChart3, ArrowDown } from "lucide-react"
import { formatAmount } from "@/Utils.functions"
import type { Sale } from "@/interfaces/data/Sale"
import type { Product } from "@/interfaces/data/Product"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
interface DashboardProps {
  storeId: string
  products: Product[]
  userRole: string
}
const CHART_COLORS = {
  revenue: '#FCC90F',
  profit: '#22c55e',
}
export default function Dashboard({ storeId, products, userRole }: DashboardProps) {
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [weekData, setWeekData] = useState<{ date: string; revenue: number; profit: number; orders: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [statsRange, setStatsRange] = useState<'today' | '7days' | 'month'>('today')
  const lowStock = useMemo(() =>
    products.filter(p => p.is_active && p.current_stock <= p.min_stock),
    [products]
  )
  const loadDashboard = async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const now = new Date()
      const rangeStart = statsRange === 'today'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        : statsRange === '7days'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: salesData } = await supabase
        .from('sales')
        .select('id, customer_name, subtotal, discount, total, payment_method, currency_paid, exchange_rate, amount_paid, status, is_estimate, estimate_number, created_at, created_by')
        .eq('store_id', storeId)
        .eq('is_estimate', false)
        .gte('created_at', rangeStart)
        .order('created_at', { ascending: false })
        .limit(100)
      if (salesData) {
        const sales = salesData as unknown as Sale[]
        setRecentSales(sales.slice(0, 8))
        const dayMap = new Map<string, { date: string; revenue: number; profit: number; orders: number }>()
        for (const s of sales) {
          if (s.status !== 'completed') continue
          const day = s.created_at.split('T')[0]
          const existing = dayMap.get(day) || { date: day, revenue: 0, profit: 0, orders: 0 }
          existing.revenue += Number(s.subtotal)
          existing.profit += Number(s.total) - Number(s.subtotal) + Number(s.discount)
          existing.orders += 1
          dayMap.set(day, existing)
        }
        const sorted = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
        setWeekData(sorted)
      }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadDashboard()
  }, [storeId, statsRange])
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const filtered = recentSales.filter(s => s.status === 'completed' && s.created_at.startsWith(todayStr))
    return {
      todaySales: filtered.reduce((sum, s) => sum + Number(s.subtotal), 0),
      todayProfit: filtered.reduce((sum, s) => sum + (Number(s.total) - Number(s.subtotal) + Number(s.discount)), 0),
      todayOrders: filtered.length,
    }
  }, [recentSales])
  const chartTotalRevenue = weekData.reduce((sum, d) => sum + d.revenue, 0)
  const chartTotalProfit = weekData.reduce((sum, d) => sum + d.profit, 0)
  const shortLabels = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }).replace('.', '')
  }
  const isAdmin = userRole === 'admin'
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Panel de Control</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['today', '7days', 'month'] as const).map(r => (
            <button
              key={r}
              onClick={() => setStatsRange(r)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${statsRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {r === 'today' ? 'Hoy' : r === '7days' ? '7 días' : 'Mes'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">${formatAmount(statsRange === 'today' ? stats.todaySales : chartTotalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {statsRange === 'today' ? `Ventas del día` : statsRange === '7days' ? 'Últimos 7 días' : 'Este mes'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancias</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">${formatAmount(statsRange === 'today' ? stats.todayProfit : chartTotalProfit)}</div>
                <p className="text-xs text-muted-foreground">
                  {statsRange === 'today' ? 'Ganancia del día' : statsRange === '7days' ? 'Últimos 7 días' : 'Este mes'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transacciones</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {statsRange === 'today' ? stats.todayOrders : weekData.reduce((s, d) => s + d.orders, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statsRange === 'today' ? 'Ventas del día' : statsRange === '7days' ? 'Últimos 7 días' : 'Este mes'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bajo Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{lowStock.length}</div>
            <p className="text-xs text-muted-foreground">Productos por reabastecer</p>
          </CardContent>
        </Card>
      </div>
      {isAdmin && weekData.length > 0 && (
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Ventas por Día
            </CardTitle>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" /> Ingresos
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Ganancias
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={shortLabels} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `$${formatAmount(v)}`} width={70} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelFormatter={shortLabels}
                    formatter={(value: number, name: string) => [`$${formatAmount(value)}`, name === 'revenue' ? 'Ingresos' : 'Ganancias']}
                  />
                  <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Ventas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sin ventas en este período</p>
            ) : (
              <div className="space-y-1">
                {recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {sale.customer_name || 'Cliente General'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">${formatAmount(sale.total)}</span>
                      <Badge className={
                        sale.status === 'completed' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                        sale.status === 'cancelled' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                      }>
                        {sale.status === 'completed' ? 'Completada' : sale.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Productos en Bajo Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Todos los productos con stock adecuado</p>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className={`text-sm font-bold ${p.current_stock === 0 ? 'text-red-500' : 'text-secondary'}`}>
                        {p.current_stock} / {p.min_stock}
                      </span>
                      {p.current_stock === 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {p.current_stock > 0 && p.current_stock <= p.min_stock && <ArrowDown className="h-4 w-4 text-secondary" />}
                    </div>
                  </div>
                ))}
                {lowStock.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{lowStock.length - 8} más en bajo stock
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}