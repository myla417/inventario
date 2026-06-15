import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FileText, Eye, Printer, ShoppingCart, X, Calendar, Search, CheckCircle, AlertCircle, MessageCircle } from "lucide-react"
import html2canvas from "html2canvas"
import { formatAmount } from "@/Utils.functions"
import type { Sale, SaleItem } from "@/interfaces/data/Sale"
import type { Product } from "@/interfaces/data/Product"
import type { Customer } from "@/interfaces/data/Customer"
import type { PaymentMethod } from "@/interfaces/data/PaymentMethod"
import type { ExchangeRate } from "@/interfaces/data/ExchangeRate"
import { supabase } from "@/lib/supabase"

interface EstimatesProps {
  storeId: string
  products: Product[]
  customers: Customer[]
  paymentMethods: PaymentMethod[]
  exchangeRates: ExchangeRate[]
  storeName: string
  saveCustomers: (customers: Customer[]) => void
  saveProducts: (products: Product[]) => void
}

export default function Estimates({ storeId, storeName, products, paymentMethods, customers, exchangeRates, saveCustomers, saveProducts }: EstimatesProps) {
  const [estimates, setEstimates] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedEstimate, setSelectedEstimate] = useState<Sale | null>(null)
  const [estimateItems, setEstimateItems] = useState<SaleItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [converting, setConverting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [printEstimate, setPrintEstimate] = useState<Sale | null>(null)
  const [printItems, setPrintItems] = useState<SaleItem[]>([])
  const [whatsappPreview, setWhatsappPreview] = useState<{ estimate: Sale; dataUrl: string } | null>(null)
  const [sharing, setSharing] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState<Sale | null>(null)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [convertPaymentMethod, setConvertPaymentMethod] = useState("")
  const [keepExchangeRate, setKeepExchangeRate] = useState(false)
  const selectedEstimateRef = useRef<Sale | null>(null)
  const estimateItemsRef = useRef<SaleItem[]>([])
  const [client, setClient] = useState<string>("")
  const [bankReference, setBankReference] = useState("")
  const [bankReferenceName, setBankReferenceName] = useState("")
  const [shippingCost, setShippingCost] = useState(0)

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintEstimate(null)
      setPrintItems([])
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  useEffect(() => {
    const printEl = document.getElementById('print-estimate')
    if (printEl) {
      if (printEstimate) {
        printEl.style.display = 'block'
      } else {
        printEl.style.display = 'none'
      }
    }
  }, [printEstimate])

  const loadEstimates = async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('sales')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_estimate', true)
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false })

      if (data) {
        setEstimates(data as unknown as Sale[])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEstimates()
  }, [storeId, dateFrom, dateTo])

  useEffect(() => {
    setClient(selectedEstimate?.customer_id || '')
  }, [selectedEstimate?.customer_id])

  const filteredEstimates = estimates.filter(e => {
    if (filterStatus === "all") return true
    return e.status === filterStatus
  })

  const loadEstimateItems = async (estimateId: string) => {
    setLoadingItems(true)
    try {
      const { data } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', estimateId)

      if (data) {
        setEstimateItems(data as unknown as SaleItem[])
      }
    } finally {
      setLoadingItems(false)
    }
  }

  const openEstimateDetail = (estimate: Sale) => {
    setSelectedEstimate(estimate)
    setEstimateItems([])
    loadEstimateItems(estimate.id)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pendiente</Badge>
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Completada</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'VES': return 'Bs'
      default: return '$'
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setErrorMessage("")
    setTimeout(() => setSuccessMessage(""), 4000)
  }

  const showError = (msg: string) => {
    setErrorMessage(msg)
    setSuccessMessage("")
    setTimeout(() => setErrorMessage(""), 5000)
  }

  const handleConvertToSale = () => {
    if (!selectedEstimate) return
    setConvertPaymentMethod(selectedEstimate.payment_method || paymentMethods.find(p => p.currency === selectedEstimate.currency_paid)?.id || "")
    setKeepExchangeRate(false)
    setShippingCost(selectedEstimate.shipping_cost || 0)
    setShowConvertDialog(true)
  }
  const actualCurrency = paymentMethods.find(p => p.id === convertPaymentMethod)?.currency
  const exchangeRate = keepExchangeRate
        ? selectedEstimate?.exchange_rate
        : (exchangeRates.find(r => r.currency === actualCurrency)?.rate_exchange || selectedEstimate?.exchange_rate)

  const totalValue = ((selectedEstimate?.subtotal || 0) - (selectedEstimate?.discount || 0) + shippingCost) / (exchangeRate || 1)
  const confirmConvertToSale = async () => {
    if (converting || !selectedEstimate) return
    setConverting(true)
    try {
      const pm = paymentMethods.find(p => p.id === convertPaymentMethod)
      const customer = client && client !== 'walk-in'
        ? customers.find(c => c.id === client)
        : null

      const itemsPayload = estimateItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost: item.cost,
        is_wholesale: item.is_wholesale,
        total: item.total,
      }))

      const { data: saleId, error } = await supabase.rpc('create_sale', {
        p_store_id: storeId,
        p_customer_id: customer?.id || null,
        p_customer_name: customer?.name || '',
        p_subtotal: selectedEstimate.subtotal,
        p_discount: selectedEstimate.discount,
        p_tax: selectedEstimate.tax,
        p_total: selectedEstimate.subtotal - selectedEstimate.discount + shippingCost,
        p_payment_method: pm?.name || convertPaymentMethod,
        p_currency_paid: pm?.currency || selectedEstimate.currency_paid,
        p_exchange_rate: exchangeRate,
        p_amount_paid: totalValue,
        p_is_estimate: false,
        p_estimate_number: null,
        p_bank_reference: bankReference || null,
        p_bank_reference_name: bankReferenceName || null,
        p_shipping_cost: shippingCost,
        p_items: itemsPayload,
      })

      if (error) {
        showError(`Error al convertir: ${error.message}`)
        return
      }

      if (saleId) {
        saveProducts(products.map(p => {
          const soldItem = estimateItems.find(i => i.product_id === p.id)
          if (soldItem) {
            return { ...p, current_stock: p.current_stock - soldItem.quantity }
          }
          return p
        }))
        const { error: updateError } = await supabase
          .from('sales')
          .update({ status: 'completed' })
          .eq('id', selectedEstimate.id)

        if (updateError) {
          showError(`Venta creada pero no se pudo actualizar la cotización: ${updateError.message}`)
          return
        }

        if (client && convertPaymentMethod == 'A credito') {
          saveCustomers(customers.map(c => c.id === client ? { ...c , balance: c.balance + (selectedEstimate.subtotal - selectedEstimate.discount + shippingCost) } : c))
        }
        showSuccess(`Cotización convertida a venta exitosamente`)
        setEstimates(estimates.map(e => e.id === selectedEstimate.id ? { ...e, status: 'completed' as const } : e))
        setSelectedEstimate(null)
        setEstimateItems([])
        setBankReference("")
        setBankReferenceName("")
        setShippingCost(0)
      }
    } catch (err) {
      showError("Error inesperado al convertir la cotización")
      console.error(err)
    } finally {
      setConverting(false)
      setShowConvertDialog(false)
    }
  }

  const handleCancelEstimate = (estimate: Sale) => {
    setConfirmCancel(estimate)
  }

  const confirmCancelEstimate = async () => {
    if (cancelling || !confirmCancel) return
    setCancelling(true)
    try {
      const { error } = await supabase
        .from('sales')
        // .update({ status: 'cancelled' })
        .delete()
        .eq('id', confirmCancel.id)

      if (error) {
        showError(`Error al cancelar: ${error.message}`)
        return
      }

      showSuccess(`Cotización ${confirmCancel.estimate_number} cancelada`)
      setEstimates(estimates.map(e => e.id === confirmCancel.id ? { ...e, status: 'cancelled' as const } : e))
      if (selectedEstimate?.id === confirmCancel.id) {
        setSelectedEstimate(null)
        setEstimateItems([])
      }
    } catch (err) {
      showError("Error inesperado al cancelar")
      console.error(err)
    } finally {
      setCancelling(false)
      setConfirmCancel(null)
    }
  }

  const handlePrint = async (estimate: Sale) => {
    const { data } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', estimate.id)

    if (data) {
      selectedEstimateRef.current = selectedEstimate
      estimateItemsRef.current = estimateItems
      setPrintItems(data as unknown as SaleItem[])
      setPrintEstimate(estimate)
      setSelectedEstimate(null)
      await new Promise(resolve => setTimeout(resolve, 500))
      window.print()
      setTimeout(() => {
        if (selectedEstimateRef.current) {
          setSelectedEstimate(selectedEstimateRef.current)
          setEstimateItems(estimateItemsRef.current)
          loadEstimateItems(selectedEstimateRef.current.id)
        }
        setPrintEstimate(null)
        setPrintItems([])
      }, 100)
    }
  }

  const handleShareToWhatsApp = async (estimate: Sale) => {
    if (sharing) return
    setSharing(true)
    try {
      const { data } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', estimate.id)

      if (!data) return

      setPrintItems(data as unknown as SaleItem[])
      setPrintEstimate(estimate)

      await new Promise(resolve => setTimeout(resolve, 400))

      const printEl = document.getElementById('print-estimate')
      if (!printEl) return

      const canvas = await html2canvas(printEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (doc) => {
          const style = doc.createElement('style')
          style.textContent = `
            :root {
              --background: rgb(20 20 20);
              --foreground: rgb(250 250 250);
              --card: rgb(20 20 20);
              --card-foreground: rgb(250 250 250);
              --primary: rgb(252 201 14);
              --primary-foreground: rgb(20 20 20);
              --secondary: rgb(65 65 65);
              --secondary-foreground: rgb(250 250 250);
              --muted: rgb(38 38 38);
              --muted-foreground: rgb(165 165 165);
              --accent: rgb(46 46 46);
              --accent-foreground: rgb(250 250 250);
              --border: rgb(46 46 46);
              --input: rgb(38 38 38);
            }
            * {
              color: var(--foreground) !important;
              background-color: var(--background) !important;
              border-color: var(--border) !important;
            }
            p {
              background-color: transparent !important;
            }
            strong {
              background-color: transparent !important;
            }
          `
          doc.head.appendChild(style)
        }
      })
      const dataUrl = canvas.toDataURL('image/png')

      setPrintEstimate(null)
      setPrintItems([])
      setWhatsappPreview({ estimate, dataUrl })

      const message = `Cotización #${estimate.estimate_number} de ${storeName}\nCliente: ${estimate.customer_name || 'Cliente general'}\nTotal: ${getCurrencySymbol(estimate.currency_paid)}${formatAmount(estimate.total)} ${estimate.currency_paid}\n\n`

      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `cotizacion-${estimate.estimate_number}.png`, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: `Cotización #${estimate.estimate_number}`, text: message, files: [file] })
          showSuccess('Cotización compartida exitosamente')
          setWhatsappPreview(null)
          return
        }
      }

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    } catch (err) {
      console.error('Error sharing to WhatsApp:', err)
      showError('No se pudo compartir la cotización')
    } finally {
      setSharing(false)
      setPrintEstimate(null)
      setPrintItems([])
    }
  }

  const totalInCurrency = selectedEstimate ? selectedEstimate.total / selectedEstimate.exchange_rate : 0
  const printTotalInCurrency = printEstimate ? printEstimate.total / printEstimate.exchange_rate : 0

  return (
    <div className="p-4 md:p-6 space-y-6">
      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-500">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

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
            <div className="space-y-2 sm:w-48">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end">
              <Button onClick={() => loadEstimates()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Cotizaciones</CardTitle>
          <CardDescription>{filteredEstimates.length} cotizaciones encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando cotizaciones...</p>
          ) : filteredEstimates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay cotizaciones en el período seleccionado</p>
          ) : (
            <>
              <div className="block lg:hidden space-y-3">
                {filteredEstimates.map(estimate => (
                  <Card key={estimate.id} className="border-border bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-primary">{estimate.estimate_number}</p>
                          <p className="font-medium text-foreground">
                            {estimate.customer_name || 'Cliente general'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(estimate.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{getCurrencySymbol(estimate.currency_paid)}{formatAmount(estimate.total)}</p>
                          <div className="mt-1">{getStatusBadge(estimate.status)}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2 justify-end x-auto">
                        {estimate.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-foreground" onClick={() => handlePrint(estimate)}>
                              <Printer className="h-4 w-4 mr-1" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-green-500" onClick={() => handleShareToWhatsApp(estimate)} disabled={sharing}>
                              <MessageCircle className="h-4 w-4 mr-1" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleCancelEstimate(estimate)}>
                              <X className="h-4 w-4 mr-1" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="text-primary" onClick={() => openEstimateDetail(estimate)}>
                          <Eye className="h-4 w-4 mr-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">Número</TableHead>
                      <TableHead className="text-foreground">Fecha</TableHead>
                      <TableHead className="text-foreground">Cliente</TableHead>
                      <TableHead className="text-foreground">Moneda</TableHead>
                      <TableHead className="text-foreground text-right">Total</TableHead>
                      <TableHead className="text-foreground">Estado</TableHead>
                      <TableHead className="text-foreground">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEstimates.map(estimate => (
                      <TableRow key={estimate.id} className="border-border">
                        <TableCell className="font-bold text-primary">{estimate.estimate_number}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(estimate.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {estimate.customer_name || 'Cliente general'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary text-primary">
                            {estimate.currency_paid}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          ${formatAmount(estimate.total)}
                        </TableCell>
                        <TableCell>{getStatusBadge(estimate.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {estimate.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="sm" className="text-foreground" onClick={() => handlePrint(estimate)}>
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-green-500" onClick={() => handleShareToWhatsApp(estimate)} disabled={sharing}>
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleCancelEstimate(estimate)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="sm" className="text-primary" onClick={() => openEstimateDetail(estimate)}>
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                          </div>
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

      <Dialog open={!!selectedEstimate} onOpenChange={(open) => { if (!open) { setSelectedEstimate(null); setEstimateItems([]) } }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedEstimate?.estimate_number}
            </DialogTitle>
            <DialogDescription>
              {selectedEstimate && new Date(selectedEstimate.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </DialogDescription>
          </DialogHeader>

          {selectedEstimate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="text-sm font-medium text-foreground">{selectedEstimate.customer_name || 'Cliente general'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div>{getStatusBadge(selectedEstimate.status)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Moneda</Label>
                  <p className="text-sm text-foreground">{selectedEstimate.currency_paid}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Creada por</Label>
                  <p className="text-sm text-foreground">{selectedEstimate.created_by}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Label className="text-sm font-medium text-foreground mb-2">Productos</Label>
                {loadingItems ? (
                  <p className="text-muted-foreground text-sm py-4">Cargando items...</p>
                ) : estimateItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">Sin productos</p>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium pb-1">
                      <div className="col-span-5">Producto</div>
                      <div className="col-span-2 text-center">Cantidad</div>
                      <div className="col-span-2 text-right">Precio</div>
                      <div className="col-span-3 text-right">Total</div>
                    </div>
                    {estimateItems.map(item => (
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
                  <span className="text-foreground">${formatAmount(selectedEstimate.subtotal)}</span>
                </div>
                {selectedEstimate.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="text-red-500">-${formatAmount(selectedEstimate.discount)}</span>
                  </div>
                )}
                {selectedEstimate.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impuesto</span>
                    <span className="text-foreground">${formatAmount(selectedEstimate.tax)}</span>
                  </div>
                )}
                {selectedEstimate.shipping_cost ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="text-primary">+${formatAmount(selectedEstimate.shipping_cost)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">{getCurrencySymbol(selectedEstimate.currency_paid)}{formatAmount(selectedEstimate.total)}</span>
                </div>
                {selectedEstimate.currency_paid !== 'COP' && (
                  <div>
                    <div className="flex justify-between text-primary font-medium">
                      <span>Equivale</span>
                      <span>{selectedEstimate.currency_paid === 'VES' ? 'Bs' : '$'}{formatAmount(totalInCurrency)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tasa de cambio</span>
                      <span>{selectedEstimate.exchange_rate}</span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter data-print-hide>
                {selectedEstimate.status === 'pending' && (
                  <>
                    <div className="flex flex-row gap-2">
                      <Button variant="outline" className="flex-1 border-border" onClick={() => handlePrint(selectedEstimate)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="flex-1 border-green-500/50 text-green-500 hover:bg-green-500/10" onClick={() => handleShareToWhatsApp(selectedEstimate)} disabled={sharing}>
                        <MessageCircle className="h-4 w-4" />
                        {sharing ? ' Compartiendo...' : ''}
                      </Button>
                      <Button variant="outline" className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => handleCancelEstimate(selectedEstimate)} disabled={cancelling}>
                        <X className="h-4 w-4" />
                        {cancelling ? ' Cancelando...' : ''}
                      </Button>
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleConvertToSale} disabled={converting}>
                      <ShoppingCart className="h-4 w-4" />
                      {converting ? ' Convirtiendo...' : ' Convertir a Venta'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      
      {printEstimate && (
        <div id="print-estimate" className="fixed inset-0 z-50 bg-white p-8" style={{ display: 'none' }}>
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{storeName}</h1>
              <p className="text-sm text-gray-600">Cotización</p>
            </div>
            <div className="mb-4">
              <p><strong>Número:</strong> {printEstimate.estimate_number}</p>
              <p><strong>Fecha:</strong> {new Date(printEstimate.created_at).toLocaleDateString('es-CO')}</p>
              <p><strong>Cliente:</strong> {printEstimate.customer_name || 'Cliente general'}</p>
            </div>
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2">Cant</th>
                  <th className="text-left py-2">Producto</th>
                  <th className="text-right py-2">Precio</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {printItems.map(item => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2">{item.product_name}</td>
                    <td className="py-2 text-right">${formatAmount(item.unit_price)}</td>
                    <td className="py-2 text-right">${formatAmount(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-right">
              <p>Subtotal: ${formatAmount(printEstimate.subtotal)}</p>
              {printEstimate.discount > 0 && <p className="text-red-600">Descuento: -${formatAmount(printEstimate.discount)}</p>}
              {printEstimate.tax > 0 && <p>Impuesto: ${formatAmount(printEstimate.tax)}</p>}
              {printEstimate.shipping_cost ? <p>Envío: +${formatAmount(printEstimate.shipping_cost)}</p> : null}
              <p className="text-xl font-bold">Total: {getCurrencySymbol(printEstimate.currency_paid)}{formatAmount(printEstimate.total)}</p>
              {printEstimate.currency_paid !== 'COP' && (
                <p className="font-bold">Equivale: {printEstimate.currency_paid === 'VES' ? 'Bs' : '$'}{formatAmount(printTotalInCurrency)} {printEstimate.currency_paid}</p>
                )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!whatsappPreview} onOpenChange={() => setWhatsappPreview(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Compartir por WhatsApp
            </DialogTitle>
            <DialogDescription>
              Revisa la cotización antes de compartir
            </DialogDescription>
          </DialogHeader>
          {whatsappPreview && (
            <div className="space-y-4">
              <img
                src={whatsappPreview.dataUrl}
                alt="Vista previa de cotización"
                className="w-full border border-border rounded-lg"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => setWhatsappPreview(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => {
                    if (whatsappPreview) {
                      const message = `Cotización #${whatsappPreview.estimate.estimate_number} de ${storeName}\nCliente: ${whatsappPreview.estimate.customer_name || 'Cliente general'}\nTotal: ${getCurrencySymbol(whatsappPreview.estimate.currency_paid)}${formatAmount(whatsappPreview.estimate.total)} ${whatsappPreview.estimate.currency_paid}\n\n`
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                      window.open(whatsappUrl, '_blank')
                      setWhatsappPreview(null)
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Abrir WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmCancel} onOpenChange={() => !cancelling && setConfirmCancel(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Cancelar Cotización
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de cancelar la cotización {confirmCancel?.estimate_number}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => setConfirmCancel(null)}
              disabled={cancelling}
            >
              No, mantener
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelEstimate}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Convertir a Venta
            </DialogTitle>
            <DialogDescription>
              Selecciona el método de pago para la venta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(!selectedEstimate?.customer_id || selectedEstimate?.customer_id === '' || selectedEstimate?.customer_id === 'walk-in')  && (
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Cliente</Label>
                <Select value={client} onValueChange={setClient}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Cliente General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Cliente General</SelectItem>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Método de pago</Label>
              <Select value={convertPaymentMethod} onValueChange={setConvertPaymentMethod}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(pm => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name} ({pm.currency})</SelectItem>
                  ))}
                  {selectedEstimate && client && client !== 'walk-in' && (<SelectItem value="A credito">A credito</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {convertPaymentMethod && convertPaymentMethod !== 'A credito' && (
              (() => {
                const pm = paymentMethods.find(p => p.id === convertPaymentMethod)
                const pmName = pm?.name || convertPaymentMethod
                const needsBankRef = pmName === 'Transferencia' || pmName === 'Pago Movil' || pmName === 'Zelle'
                return needsBankRef ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm text-foreground">Nombre</Label>
                      <Input
                        value={bankReferenceName}
                        onChange={(e) => setBankReferenceName(e.target.value)}
                        placeholder="Nombre del usuario"
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-foreground">Referencia</Label>
                      <Input
                        value={bankReference}
                        onChange={(e) => setBankReference(e.target.value)}
                        placeholder="Número de transferencia"
                        className="bg-input border-border"
                      />
                    </div>
                  </>
                ) : null
              })()
            )}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Costo de envío ($)</Label>
              <Input
                type="number"
                value={shippingCost || ""}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                className="bg-input border-border"
                placeholder="0.00"
              />
            </div>
            {convertPaymentMethod && convertPaymentMethod !== 'A credito' && actualCurrency !== 'COP' && (
              <>
                {selectedEstimate?.exchange_rate && selectedEstimate.exchange_rate > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm text-foreground">Mantener Tasa</Label>
                      <p className="text-xs text-muted-foreground">Usar tasa de la cotización ({selectedEstimate?.exchange_rate})</p>
                    </div>
                    <Switch checked={keepExchangeRate} onCheckedChange={setKeepExchangeRate} />
                  </div>
                )}
                <div className="flex justify-between text-primary font-medium">
                  <span>Equivale</span>
                  <span>{getCurrencySymbol(actualCurrency || 'COP')}{formatAmount(totalValue)}</span>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => setShowConvertDialog(false)}
              disabled={converting}
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={confirmConvertToSale}
              disabled={converting || !convertPaymentMethod}
            >
              {converting ? 'Convirtiendo...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
