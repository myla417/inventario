import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, ShoppingCart, Search, Calendar, Eye, Package, CreditCard, BarChart3, Trash2, AlertCircle } from "lucide-react"
import { formatAmount } from "@/Utils.functions"
import type { Sale, SaleItem } from "@/interfaces/data/Sale"
import type { Product } from "@/interfaces/data/Product"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"

interface SalesProps {
  storeId: string
  userRole: string
  products: Product[]
}

interface ProductSales {
  product_name: string
  quantity: number
  revenue: number
  profit: number
}

interface PaymentMethodSales {
  method: string
  count: number
  total: number
}

interface DailySales {
  date: string
  revenue: number
  profit: number
  count: number
}

const CHART_COLORS = ['#FCC90F', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#06b6d4']

export default function Sales({ storeId, userRole }: SalesProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [allSaleItems, setAllSaleItems] = useState<SaleItem[]>([])
  const [loadingAggregates, setLoadingAggregates] = useState(false)
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Sale | null>(null)
  const isAdmin = userRole === 'admin'

  const loadSales = async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('sales')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_estimate', false)
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false })

      if (data) {
        setSales(data as unknown as Sale[])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadAllSaleItems = async () => {
    if (!storeId || sales.length === 0) return
    setLoadingAggregates(true)
    try {
      const saleIds = sales.map(s => s.id)
      const { data } = await supabase
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds)

      if (data) {
        setAllSaleItems(data as unknown as SaleItem[])
      }
    } finally {
      setLoadingAggregates(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [storeId, dateFrom, dateTo])

  useEffect(() => {
    loadAllSaleItems()
  }, [sales])

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
  const totalProfit = totalRevenue - allSaleItems.reduce((sum, s) => sum + s.cost, 0)
  const totalCompleted = sales.length

  const loadSaleItems = async (saleId: string) => {
    setLoadingItems(true)
    try {
      const { data } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId)

      if (data) {
        setSaleItems(data as unknown as SaleItem[])
      }
    } finally {
      setLoadingItems(false)
    }
  }

  const openSaleDetail = (sale: Sale) => {
    setSelectedSale(sale)
    setSaleItems([])
    loadSaleItems(sale.id)
  }

  const deleteSale = async () => {
    if (!confirmDelete) return
    setDeletingSaleId(confirmDelete.id)
    try {
      const { error } = await supabase.rpc('delete_sale', { p_sale_id: confirmDelete.id })
      if (error) throw error
      await loadSales()
      setConfirmDelete(null)
    } catch (err) {
      console.error('Error deleting sale:', err)
      alert('Error al eliminar la venta: ' + (err as Error).message)
    } finally {
      setDeletingSaleId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Completada</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelada</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pendiente</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProductSales = (): ProductSales[] => {
    const map = new Map<string, ProductSales>()
    for (const item of allSaleItems) {
      const existing = map.get(item.product_name)
      if (existing) {
        existing.quantity += item.quantity
        existing.revenue += item.total
        existing.profit += (item.total - item.cost * item.quantity)
      } else {
        map.set(item.product_name, {
          product_name: item.product_name,
          quantity: item.quantity,
          revenue: item.total,
          profit: item.total - item.cost * item.quantity,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }

  const getPaymentMethodSales = (): PaymentMethodSales[] => {
    const map = new Map<string, PaymentMethodSales>()
    for (const sale of sales) {
      const method = sale.payment_method || 'Sin método'
      const existing = map.get(method)
      if (existing) {
        existing.count += 1
        existing.total += sale.total
      } else {
        map.set(method, { method, count: 1, total: sale.total })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }

  const getDailySales = (): DailySales[] => {
    const saleCostMap = new Map<string, number>()
    for (const item of allSaleItems) {
      saleCostMap.set(item.sale_id, (saleCostMap.get(item.sale_id) || 0) + item.cost * item.quantity)
    }

    const map = new Map<string, DailySales>()
    for (const sale of sales) {
      if (sale.status !== 'completed') continue
      const date = new Date(sale.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      const existing = map.get(date)
      const cost = saleCostMap.get(sale.id) || 0
      const profit = sale.total - cost
      if (existing) {
        existing.revenue += sale.total
        existing.profit += profit
        existing.count += 1
      } else {
        map.set(date, {
          date,
          revenue: sale.total,
          profit,
          count: 1,
        })
      }
    }
    return Array.from(map.values()).reverse()
  }

  const productSales = getProductSales()
  const paymentMethodSales = getPaymentMethodSales()
  const dailySales = getDailySales()

  const totalInCurrency = selectedSale ? selectedSale.total / selectedSale.exchange_rate : 0

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className={"grid grid-cols-2 sm:grid-cols-2 gap-4 md:gap-6 " + (isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-2")}>
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Ventas</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${formatAmount(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Ingresos del período</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Ganancias</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">${formatAmount(totalProfit)}</div>
              <p className="text-xs text-muted-foreground">Ganancia estimada</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCompleted}</div>
            <p className="text-xs text-muted-foreground">Ventas completadas</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Promedio por Venta</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">${formatAmount(totalCompleted > 0 ? totalRevenue / totalCompleted : 0)}</div>
              <p className="text-xs text-muted-foreground">Por venta completada</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-2 flex-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-input border-border [appearance:none] [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-input border-border [appearance:none] [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <div className="space-y-2 flex items-end">
              <Button onClick={() => loadSales()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="general" className="space-y-6">
        {isAdmin && (
          <TabsList className={"grid w-full bg-card border border-border h-auto gap-1 p-1" + (isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-1")}>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
              <>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Por Producto</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Por Pago</span>
                </TabsTrigger>
                <TabsTrigger value="trend" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Tendencia</span>
                </TabsTrigger>
              </>
          </TabsList>
        )}

        <TabsContent value="general" className="space-y-4">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Historial de Ventas</CardTitle>
              <CardDescription>{sales.length} ventas encontradas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Cargando ventas...</p>
              ) : sales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay ventas en el período seleccionado</p>
              ) : (
                <>
                  <div className="block lg:hidden space-y-3">
                    {sales.map(sale => (
                      <Card key={sale.id} className="border-border bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-foreground">
                                {sale.customer_name || 'Cliente general'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(sale.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {sale.payment_method || 'Sin método'} · {sale.currency_paid}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground">${formatAmount(sale.total)}</p>
                              <div className="mt-1">{getStatusBadge(sale.status)}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="text-primary" onClick={() => openSaleDetail(sale)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-400"
                                onClick={() => setConfirmDelete(sale)}
                                disabled={deletingSaleId === sale.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-foreground">Fecha</TableHead>
                          <TableHead className="text-foreground">Cliente</TableHead>
                          <TableHead className="text-foreground">Método de Pago</TableHead>
                          <TableHead className="text-foreground">Moneda</TableHead>
                          <TableHead className="text-foreground text-right">Total</TableHead>
                          {/* <TableHead className="text-foreground">Estado</TableHead> */}
                          <TableHead className="text-foreground">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map(sale => (
                          <TableRow key={sale.id} className="border-border">
                            <TableCell className="text-muted-foreground">
                              {new Date(sale.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {sale.customer_name || 'Cliente general'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{sale.payment_method || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-primary text-primary">
                                {sale.currency_paid}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              ${formatAmount(sale.total)}
                            </TableCell>
                            {/* <TableCell>{getStatusBadge(sale.status)}</TableCell> */}
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-primary" onClick={() => openSaleDetail(sale)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-400"
                                  onClick={() => setConfirmDelete(sale)}
                                  disabled={deletingSaleId === sale.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Ventas por Producto</CardTitle>
              <CardDescription>Productos más vendidos en el período</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAggregates ? (
                <p className="text-center text-muted-foreground py-8">Cargando datos...</p>
              ) : productSales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay datos de productos</p>
              ) : (
                <>
                  <div className="h-64 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productSales.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                        <XAxis dataKey="product_name" tick={{ fill: 'oklch(0.6 0 0)', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fill: 'oklch(0.6 0 0)', fontSize: 11 }} tickFormatter={(v: number) => `$${formatAmount(v)}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'oklch(0.15 0 0)', border: '1px solid oklch(0.3 0 0)', borderRadius: '8px' }}
                          labelStyle={{ color: 'oklch(0.98 0 0)' }}
                          formatter={(value: number, name: string) => [`${name === 'revenue' ? '$' : ''}${formatAmount(value)}`, name === 'revenue' ? 'Ingresos' : name === 'profit' ? 'Ganancia' : 'Cantidad']}
                        />
                        <Bar dataKey="revenue" fill="#FCC90F" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="block lg:hidden space-y-3">
                    {productSales.map((ps) => (
                      <Card key={ps.product_name} className="border-border bg-card/50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-foreground">{ps.product_name}</p>
                              <p className="text-xs text-muted-foreground">{ps.quantity} unidades vendidas</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">${formatAmount(ps.revenue)}</p>
                              <p className="text-xs text-green-500">Ganancia: ${formatAmount(ps.profit)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-foreground">#</TableHead>
                          <TableHead className="text-foreground">Producto</TableHead>
                          <TableHead className="text-foreground text-right">Cantidad</TableHead>
                          <TableHead className="text-foreground text-right">Ingresos</TableHead>
                          <TableHead className="text-foreground text-right">Ganancia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productSales.map((ps, i) => (
                          <TableRow key={ps.product_name} className="border-border">
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium text-foreground">{ps.product_name}</TableCell>
                            <TableCell className="text-right text-foreground">{ps.quantity}</TableCell>
                            <TableCell className="text-right text-primary font-medium">${formatAmount(ps.revenue)}</TableCell>
                            <TableCell className="text-right text-green-500">${formatAmount(ps.profit)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-foreground">Distribución por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAggregates ? (
                  <p className="text-center text-muted-foreground py-8">Cargando datos...</p>
                ) : paymentMethodSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay datos</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodSales}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ method, percent }: { method: string; percent: number }) => `${method} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="total"
                        >
                          {paymentMethodSales.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'oklch(0.15 0 0)', border: '1px solid oklch(0.3 0 0)', borderRadius: '8px' }}
                          itemStyle={{ color: '#FFF' }}
                          formatter={(value: number) => [`$${formatAmount(value)}`, 'Total']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-foreground">Resumen por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAggregates ? (
                  <p className="text-center text-muted-foreground py-8">Cargando datos...</p>
                ) : paymentMethodSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay datos</p>
                ) : (
                  <div className="space-y-3">
                    {paymentMethodSales.map(pm => (
                      <div key={pm.method} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-foreground">{pm.method}</p>
                          <p className="text-xs text-muted-foreground">{pm.count} transacciones</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">${formatAmount(pm.total)}</p>
                          <p className="text-xs text-muted-foreground">{totalRevenue > 0 ? ((pm.total / totalRevenue) * 100).toFixed(1) : 0}% del total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trend" className="space-y-4">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Tendencia de Ventas</CardTitle>
              <CardDescription>Ingresos y ganancias por día</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAggregates ? (
                <p className="text-center text-muted-foreground py-8">Cargando datos...</p>
              ) : dailySales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay datos de tendencia</p>
              ) : (
                <>
                  <div className="h-72 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                        <XAxis dataKey="date" tick={{ fill: 'oklch(0.6 0 0)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'oklch(0.6 0 0)', fontSize: 11 }} tickFormatter={(v: number) => `$${formatAmount(v)}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'oklch(0.15 0 0)', border: '1px solid oklch(0.3 0 0)', borderRadius: '8px' }}
                          labelStyle={{ color: 'oklch(0.98 0 0)' }}
                          formatter={(value: number, name: string) => [`$${formatAmount(value)}`, name === 'revenue' ? 'Ingresos' : 'Ganancia']}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#FCC90F" strokeWidth={2} dot={{ fill: '#FCC90F', r: 4 }} name="Ingresos" />
                        <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} name="Ganancia" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="block lg:hidden space-y-3">
                    {dailySales.map(ds => (
                      <Card key={ds.date} className="border-border bg-card/50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-foreground">{ds.date}</p>
                              <p className="text-xs text-muted-foreground">{ds.count} ventas</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">${formatAmount(ds.revenue)}</p>
                              <p className="text-xs text-green-500">Ganancia: ${formatAmount(ds.profit)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-foreground">Fecha</TableHead>
                          <TableHead className="text-foreground text-right">Ventas</TableHead>
                          <TableHead className="text-foreground text-right">Ingresos</TableHead>
                          <TableHead className="text-foreground text-right">Ganancia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailySales.map(ds => (
                          <TableRow key={ds.date} className="border-border">
                            <TableCell className="font-medium text-foreground">{ds.date}</TableCell>
                            <TableCell className="text-right text-foreground">{ds.count}</TableCell>
                            <TableCell className="text-right text-primary font-medium">${formatAmount(ds.revenue)}</TableCell>
                            <TableCell className="text-right text-green-500">${formatAmount(ds.profit)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedSale} onOpenChange={(open) => { if (!open) { setSelectedSale(null); setSaleItems([]) } }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalle de Venta</DialogTitle>
            <DialogDescription>
              {selectedSale && new Date(selectedSale.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="text-sm font-medium text-foreground">{selectedSale.customer_name || 'Cliente general'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div>{getStatusBadge(selectedSale.status)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Método de Pago</Label>
                  <p className="text-sm text-foreground">{selectedSale.payment_method || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Moneda</Label>
                  <p className="text-sm text-foreground">{selectedSale.currency_paid}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vendido por</Label>
                  <p className="text-sm text-foreground">{selectedSale.created_by}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pagada</Label>
                  <p className="text-sm text-foreground">{selectedSale.paid ? 'Sí' : 'No'}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Label className="text-sm font-medium text-foreground mb-2">Productos</Label>
                {loadingItems ? (
                  <p className="text-muted-foreground text-sm py-4">Cargando items...</p>
                ) : saleItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">Sin productos</p>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium pb-1">
                      <div className="col-span-5">Producto</div>
                      <div className="col-span-2 text-center">Cantidad</div>
                      <div className="col-span-2 text-right">Precio</div>
                      <div className="col-span-3 text-right">Total</div>
                    </div>
                    {saleItems.map(item => (
                      <div key={item.id} className="sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center">
                        <div className="sm:col-span-5">
                          <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                          {item.is_wholesale && (
                            <Badge variant="outline" className="text-xs border-primary text-primary mt-1">Mayorista</Badge>
                          )}
                        </div>
                        <div className="sm:col-span-2 sm:text-center">
                          <span className="sm:hidden text-xs text-muted-foreground">Cantidad: </span>
                          <span className="text-sm text-foreground">{item.quantity}</span>
                        </div>
                        <div className="sm:col-span-2 sm:text-right">
                          <span className="sm:hidden text-xs text-muted-foreground">Precio: </span>
                          <span className="text-sm text-muted-foreground">${formatAmount(item.unit_price)}</span>
                        </div>
                        <div className="sm:col-span-3 sm:text-right">
                          <span className="sm:hidden text-xs text-muted-foreground">Total: </span>
                          <span className="text-sm font-medium text-foreground">${formatAmount(item.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${formatAmount(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="text-red-500">-${formatAmount(selectedSale.discount)}</span>
                  </div>
                )}
                {selectedSale.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impuesto</span>
                    <span className="text-foreground">${formatAmount(selectedSale.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">${formatAmount(selectedSale.total)}</span>
                </div>
                {selectedSale.currency_paid !== 'COP' && (
                  <div>
                    <div className="flex justify-between text-primary font-medium">
                      <span>Equivale</span>
                      <span>{selectedSale.currency_paid === 'USD' ? '$' : 'Bs'}{formatAmount(totalInCurrency)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tasa de cambio</span>
                      <span>{selectedSale.exchange_rate}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => !deletingSaleId && setConfirmDelete(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Eliminar Venta
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar la venta del {confirmDelete && new Date(confirmDelete.created_at).toLocaleDateString('es-CO')}? El stock será revertido y esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => setConfirmDelete(null)}
              disabled={!!deletingSaleId}
            >
              No, mantener
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSale}
              disabled={!!deletingSaleId}
            >
              {deletingSaleId ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
