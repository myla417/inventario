import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Search, Plus, Minus, ShoppingCart, FileText, X, Package, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CartItem, SaleItem } from "@/interfaces/data/Sale"
import type { Product } from "@/interfaces/data/Product"
import type { Customer } from "@/interfaces/data/Customer"
import type { PaymentMethod } from "@/interfaces/data/PaymentMethod"
import type { ExchangeRate } from "@/interfaces/data/ExchangeRate"
import { formatAmount, convertCurrency, type ExchangeRates } from "@/Utils.functions"
import { supabase } from "@/lib/supabase"

interface POSProps {
  storeId: string
  products: Product[]
  customers: Customer[]
  paymentMethods: PaymentMethod[]
  exchangeRates: ExchangeRate[]
  storeName: string
  saveCustomers: (customers: Customer[]) => void
  saveProducts: (products: Product[]) => void
}

export default function POS({ storeId, products, customers, paymentMethods, exchangeRates, saveCustomers, saveProducts }: POSProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [discount, setDiscount] = useState(0)
  const [shippingCost, setShippingCost] = useState(0)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [showBankRefDialog, setShowBankRefDialog] = useState(false)
  const [bankReference, setBankReference] = useState("")
  const [bankReferenceName, setBankReferenceName] = useState("")
  const [estimateSearch, setEstimateSearch] = useState("")
  const [estimateLoading, setEstimateLoading] = useState(false)

  const localProducts = useMemo(() => {
    const map = new Map<string, Product>()
    products.forEach(p => map.set(p.id, p))
    return map
  }, [products])

  const rates: ExchangeRates = {
    USD: exchangeRates.find(r => r.currency === 'USD')?.rate_exchange || 3700,
    DLS: exchangeRates.find(r => r.currency === 'DLS')?.rate_exchange || 3700,
    COP: exchangeRates.find(r => r.currency === 'COP')?.rate_exchange || 1,
    VES: exchangeRates.find(r => r.currency === 'VES')?.rate_exchange || 6.5,
  }

  const activeProducts = products.filter(p => p.is_active)

  const filteredProducts = activeProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addToCart = (productId: string) => {
    const product = localProducts.get(productId)
    if (!product) return
    const existing = cart.find(c => c.product_id === productId && c.is_wholesale === false)
    if (existing) {
      setCart(cart.map(c =>
        c.product_id === productId && c.is_wholesale === false
          ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price }
          : c
      ))
    } else {
      setCart([{
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.retail_price,
        cost: product.cost,
        is_wholesale: false,
        total: product.retail_price,
      }, ...cart])
    }
  }

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(cart.map((c, i) => {
      if (i !== index) return c
      const newQty = c.quantity + delta
      if (newQty <= 0) return c
      return { ...c, quantity: newQty, total: newQty * c.unit_price }
    }))
  }

  const setCartQuantity = (index: number, value: string) => {
    const qty = parseFloat(value) || 1
    if (qty <= 0) return
    setCart(cart.map((c, i) => {
      if (i !== index) return c
      return { ...c, quantity: qty, total: qty * c.unit_price }
    }))
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const toggleWholesale = (index: number) => {
    setCart(cart.map((c, i) => {
      if (i !== index) return c
      const product = localProducts.get(c.product_id)
      if (!product) return c
      const newPrice = c.is_wholesale ? product.retail_price : product.wholesale_price
      return { ...c, is_wholesale: !c.is_wholesale, unit_price: newPrice, total: c.quantity * newPrice }
    }))
  }

  const selectedPm = paymentMethods.find(pm => pm.id === paymentMethod)
  const selectedCurrency = selectedPm?.currency || "COP"

  const subtotal = cart.reduce((sum, c) => sum + c.total, 0)
  const total = subtotal - discount + shippingCost
  const totalInCurrency = convertCurrency(total, selectedCurrency, rates)

  const getExchangeRate = (currency: string): number => {
    const rate = exchangeRates.find(r => r.currency === currency)?.rate_exchange
    return rate || (currency === 'COP' ? 1 : 3700)
  }

  const generateEstimateNumber = async (): Promise<string> => {
    const { data } = await supabase
      .from('sales')
      .select('estimate_number')
      .eq('store_id', storeId)
      .eq('is_estimate', true)
      .order('estimate_number', { ascending: false })
      .limit(1)

    let nextNum = 1
    if (data && data.length > 0 && data[0].estimate_number) {
      const match = data[0].estimate_number.match(/COT-(\d+)/)
      if (match) {
        nextNum = parseInt(match[1]) + 1
      }
    }
    return `COT-${String(nextNum).padStart(4, '0')}`
  }

  const clearForm = () => {
    setCart([])
    setSelectedCustomer("")
    setPaymentMethod("")
    setDiscount(0)
    setShippingCost(0)
    setSearchTerm("")
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

  const handleCheckout = async () => {
    if (saving || cart.length === 0) return
    if (!paymentMethod) {
      showError("Selecciona un método de pago")
      return
    }
    if (total <= 0) {
      showError("El total debe ser mayor a 0")
      return
    }

    const pm = paymentMethods.find(p => p.id === paymentMethod)
    const pmName = pm?.name || paymentMethod
    const needsBankRef = pmName === 'Transferencia' || pmName === 'Pago Movil' || pmName === 'Zelle'

    if (needsBankRef) {
      setShowBankRefDialog(true)
      return
    }

    await confirmCheckout(pmName)
  }

  const confirmCheckout = async (pmName: string) => {
    setSaving(true)
    try {
      const customer = selectedCustomer && selectedCustomer !== 'walk-in'
        ? customers.find(c => c.id === selectedCustomer)
        : null

      const itemsPayload = cart.map(c => ({
        product_id: c.product_id,
        product_name: c.product_name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        cost: c.cost,
        is_wholesale: c.is_wholesale,
        total: c.total,
      }))

      const exchangeRate = getExchangeRate(selectedCurrency)
      const amountPaid = convertCurrency(total, selectedCurrency, rates)

      const { data: saleId, error } = await supabase.rpc('create_sale', {
        p_store_id: storeId,
        p_customer_id: customer?.id || null,
        p_customer_name: customer?.name || '',
        p_subtotal: subtotal,
        p_discount: discount,
        p_tax: 0,
        p_total: total,
        p_payment_method: pmName,
        p_currency_paid: selectedCurrency,
        p_exchange_rate: exchangeRate,
        p_amount_paid: amountPaid,
        p_is_estimate: false,
        p_estimate_number: null,
        p_bank_reference: bankReference || null,
        p_bank_reference_name: bankReferenceName || null,
        p_shipping_cost: shippingCost,
        p_items: itemsPayload,
      })

      if (error) {
        showError(`Error al procesar la venta: ${error.message}`)
        return
      }

      if (saleId) {
        saveProducts(products.map(p => {
          const cartItem = cart.find(c => c.product_id === p.id)
          if (cartItem) {
            return { ...p, current_stock: p.current_stock - cartItem.quantity }
          }
          return p
        }))
        showSuccess(`Venta completada exitosamente`)
        if (customer && paymentMethod == 'A credito') {
          saveCustomers(customers.map(c => c.id === customer.id ? { ...c , balance: c.balance + total } : c))
        }
        clearForm()
        setBankReference("")
        setBankReferenceName("")
      }
    } catch (err) {
      showError("Error inesperado al procesar la venta")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleEstimate = async () => {
    if (saving || cart.length === 0) return

    setSaving(true)
    try {
      const estimateNumber = await generateEstimateNumber()
      const customer = selectedCustomer && selectedCustomer !== 'walk-in'
        ? customers.find(c => c.id === selectedCustomer)
        : null

      const itemsPayload = cart.map(c => ({
        product_id: c.product_id,
        product_name: c.product_name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        cost: c.cost,
        is_wholesale: c.is_wholesale,
        total: c.total,
      }))

      const exchangeRate = getExchangeRate(selectedCurrency)
      const amountPaid = convertCurrency(total, selectedCurrency, rates)

      const { data: saleId, error } = await supabase.rpc('create_sale', {
        p_store_id: storeId,
        p_customer_id: customer?.id || null,
        p_customer_name: customer?.name || '',
        p_subtotal: subtotal,
        p_discount: discount,
        p_tax: 0,
        p_total: total,
        p_payment_method: '',
        p_currency_paid: selectedCurrency,
        p_exchange_rate: exchangeRate,
        p_amount_paid: amountPaid,
        p_is_estimate: true,
        p_estimate_number: estimateNumber,
        p_shipping_cost: shippingCost,
        p_items: itemsPayload,
      })

      if (error) {
        showError(`Error al crear cotización: ${error.message}`)
        return
      }

      if (saleId) {
        showSuccess(`Cotización ${estimateNumber} creada exitosamente`)
        clearForm()
      }
    } catch (err) {
      showError("Error inesperado al crear la cotización")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const loadEstimate = async () => {
    if (estimateLoading || !estimateSearch.trim()) return
    setEstimateLoading(true)
    try {
      const { data: estimate, error } = await supabase
        .from('sales')
        .select('*')
        .eq('estimate_number', estimateSearch.trim())
        .eq('is_estimate', true)
        .eq('status', 'pending')
        .single()

      if (error || !estimate) {
        showError('Cotización no encontrada')
        return
      }

      const { data: items } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', estimate.id)

      if (items) {
        setCart(items.map((i: SaleItem) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          sku: localProducts.get(i.product_id)?.sku || '',
          quantity: i.quantity,
          unit_price: i.unit_price,
          cost: i.cost,
          is_wholesale: i.is_wholesale,
          total: i.total,
        })))
      }

      setDiscount(estimate.discount || 0)
      setShippingCost(estimate.shipping_cost || 0)

      const customer = customers.find(c => c.name === estimate.customer_name)
      setSelectedCustomer(customer?.id || (estimate.customer_name ? 'walk-in' : ''))

      const pm = paymentMethods.find(p => p.name === estimate.payment_method)
      setPaymentMethod(pm?.id || '')

      showSuccess(`Cotización ${estimate.estimate_number} cargada`)
      setEstimateSearch("")
    } catch (err) {
      showError('Error al buscar cotización')
      console.error(err)
    } finally {
      setEstimateLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="space-y-4">
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product.id)}
                className="flex flex-col items-center p-3 rounded-lg border border-border bg-card/50 hover:bg-accent/50 transition-colors text-left"
              >
                <Package className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-foreground truncate w-full text-center">{product.name}</span>
                <span className="text-xs text-muted-foreground">{product.sku} ({product.current_stock})</span>
                <span className="text-sm font-bold text-primary mt-1">${formatAmount(product.retail_price)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-96 xl:w-[420px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col max-lg:max-h-[65vh]">
        <div className="p-4 border-b border-border flex justify-between gap-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrito ({cart.length})
          </h2>
          <div className="flex gap-2 flex-1">
            <Input
              value={estimateSearch}
              onChange={(e) => setEstimateSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEstimate()}
              placeholder="Buscar COT-..."
              className="bg-input border-border h-8 text-sm"
            />
            <Button
              size="icon"
              className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              onClick={loadEstimate}
              disabled={estimateLoading}
            >
              {estimateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto space-y-3 bg-yellow-500/20">
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Carrito vacío</p>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => toggleWholesale(index)}
                      className={`text-xs px-2 py-0.5 rounded ${item.is_wholesale ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      {item.is_wholesale ? 'Mayorista' : 'Minorista'}
                    </button>
                    <span className="text-sm font-medium text-foreground">${formatAmount(item.unit_price)}/u</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(index, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => setCartQuantity(index, e.target.value)}
                      className="w-14 h-7 text-center text-foreground bg-input border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="1"
                    />
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(index, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-bold text-foreground">${formatAmount(item.total)}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-secondary" onClick={() => removeFromCart(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Cliente General</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(pm => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name} ({pm.currency})</SelectItem>
                  ))}
                  {selectedCustomer !== '' && selectedCustomer !== 'walk-in' && (<SelectItem value="A credito">A credito</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Descuento ($)</label>
                <Input
                  type="number"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="bg-input border-border"
                  placeholder="0.00"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Costo de envío ($)</label>
                <Input
                  type="number"
                  value={shippingCost || ""}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="bg-input border-border"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${formatAmount(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-secondary">
                <span>Descuento</span>
                <span>-${formatAmount(discount)}</span>
              </div>
            )}
            {shippingCost > 0 && (
              <div className="flex justify-between text-primary">
                <span>Envío</span>
                <span>+${formatAmount(shippingCost)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-foreground">
              <span>Total</span>
              <span>${formatAmount(total)}</span>
            </div>
            {selectedCurrency !== 'COP' && (
              <div className="flex justify-between text-primary font-medium">
                <span>Equivale</span>
                <span>{selectedCurrency === 'VES' ? 'Bs' : '$'}{formatAmount(totalInCurrency)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={cart.length === 0 || saving || !paymentMethod}
              onClick={handleCheckout}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {saving ? 'Procesando...' : 'Cobrar'}
            </Button>
            <Button
              variant="outline"
              className="border-border"
              disabled={cart.length === 0 || saving}
              onClick={handleEstimate}
            >
              <FileText className="h-4 w-4 mr-2" />
              {saving ? 'Procesando...' : 'Cotizar'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showBankRefDialog} onOpenChange={setShowBankRefDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <span className="text-primary">Referencia Bancaria</span>
            </DialogTitle>
            <DialogDescription>
              Ingresa los datos de transferencia para registrar la venta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => {
                setShowBankRefDialog(false)
                setBankReference("")
                setBankReferenceName("")
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                setShowBankRefDialog(false)
                const pm = paymentMethods.find(p => p.id === paymentMethod)
                const pmName = pm?.name || paymentMethod
                confirmCheckout(pmName)
              }}
              disabled={saving}
            >
              {saving ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
