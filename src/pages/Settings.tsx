import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Settings, DollarSign, CreditCard, Save, Plus, Pencil, Trash2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { StoreSettings } from "@/lib/supabase"
import type { PaymentMethod } from "@/interfaces/data/PaymentMethod"
import type { ExchangeRate } from '@/interfaces/data/ExchangeRate'
import { CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/Utils.functions'
import { supabase } from "@/lib/supabase"

interface SettingsPageProps {
  storeId: string
  initialStore: StoreSettings
  initialPaymentMethods: PaymentMethod[]
  initialExchangeRates: ExchangeRate[]
  saveStore: (store: StoreSettings) => void
  savePaymentMethods: (methods: PaymentMethod[]) => void
}

export default function SettingsPage({ storeId, initialStore, initialPaymentMethods, initialExchangeRates, saveStore, savePaymentMethods }: SettingsPageProps) {
  const [store, setStore] = useState<StoreSettings>(initialStore)
  const [rates, setRates] = useState<ExchangeRate[]>(initialExchangeRates)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [formData, setFormData] = useState({ name: '', currency: 'COP' as 'USD' | 'COP' | 'VES' })
  const [savingStore, setSavingStore] = useState(false)
  const [savingRates, setSavingRates] = useState(false)
  const [savingMethod, setSavingMethod] = useState(false)

  const handleSaveStore = async () => {
    if (savingStore) return
    setSavingStore(true)
    const { error } = await supabase.from('stores').update({
      name: store.name, address: store.address, phone: store.phone, email: store.email, description: store.description,
    }).eq('id', storeId)
    setSavingStore(false)
    if (error) { console.error(error); return }
    saveStore(store)
  }

  const handleSaveRates = async () => {
    if (savingRates) return
    setSavingRates(true)
    for (const rate of rates) {
      if (rate.id) {
        await supabase.from('exchange_rates').update({ rate_exchange: rate.rate_exchange }).eq('id', rate.id)
      } else {
        await supabase.from('exchange_rates').insert({ store_id: storeId, currency: rate.currency, rate_exchange: rate.rate_exchange })
      }
    }
    setSavingRates(false)
  }

  const updateRate = (currency: 'USD' | 'COP' | 'VES', value: number) => {
    setRates(rates.map(r => r.currency === currency ? { ...r, rate_exchange: value } : r))
  }

  const openDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method)
      setFormData({ name: method.name, currency: method.currency })
    } else {
      setEditingMethod(null)
      setFormData({ name: '', currency: 'COP' })
    }
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingMethod(null)
    setFormData({ name: '', currency: 'COP' })
  }

  const handleSaveMethod = async () => {
    if (!formData.name.trim() || savingMethod) return
    setSavingMethod(true)

    if (editingMethod) {
      const { error } = await supabase.from('payment_methods').update({
        name: formData.name.trim(),
        currency: formData.currency,
      }).eq('id', editingMethod.id)
      setSavingMethod(false)
      if (error) { console.error(error); return }

      const updated = paymentMethods.map(m => m.id === editingMethod.id ? { ...m, name: formData.name.trim(), currency: formData.currency } : m)
      setPaymentMethods(updated)
      savePaymentMethods(updated)
    } else {
      const { data, error } = await supabase.from('payment_methods').insert({
        store_id: storeId,
        name: formData.name.trim(),
        currency: formData.currency,
        is_active: true,
      }).select().single()
      setSavingMethod(false)
      if (error) { console.error(error); return }

      setPaymentMethods([...paymentMethods, data as PaymentMethod])
      savePaymentMethods([...paymentMethods, data as PaymentMethod])
    }
    closeDialog()
  }

  const handleDeleteMethod = async (id: string) => {
    const { error } = await supabase.from('payment_methods').update({ is_active: false }).eq('id', id)
    if (error) { console.error(error); return }

    const updated = paymentMethods.filter(m => m.id !== id)
    setPaymentMethods(updated)
    savePaymentMethods(updated)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="border-border bg-card/50 backdrop-blur-sm hidden">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Información de la Tienda</CardTitle>
          <CardDescription>Datos generales del negocio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} className="bg-input border-border" /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} className="bg-input border-border" /></div>
          </div>
          <div className="space-y-2"><Label>Dirección</Label><Input value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} className="bg-input border-border" /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={store.email} onChange={(e) => setStore({ ...store, email: e.target.value })} className="bg-input border-border" /></div>
          <div className="space-y-2"><Label>Descripción</Label><Input value={store.description} onChange={(e) => setStore({ ...store, description: e.target.value })} className="bg-input border-border" /></div>
          <Button onClick={handleSaveStore} disabled={savingStore} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Save className="h-4 w-4 mr-2" /> {savingStore ? 'Guardando...' : 'Guardar'}</Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Tasas de Cambio</CardTitle>
          <CardDescription>Tasa de Conversión a Pesos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rates.map(rate => (
            <div key={rate.currency} className="flex items-center gap-4">
              <span className="text-foreground font-medium w-40">{CURRENCY_NAMES[rate.currency] || rate.currency}</span>
              <Input
                type="number"
                step="0.01"
                value={rate.rate_exchange}
                onChange={(e) => updateRate(rate.currency as 'USD' | 'COP' | 'VES', parseFloat(e.target.value) || 0)}
                className="bg-input border-border w-40"
              />
            </div>
          ))}
          <Button onClick={handleSaveRates} disabled={savingRates} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Save className="h-4 w-4 mr-2" /> {savingRates ? 'Guardando...' : 'Guardar Tasas'}</Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Métodos de Pago</CardTitle>
          <CardDescription>Configura los métodos de pago disponibles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {paymentMethods.filter(m => m.is_active).map(method => (
              <div key={method.id} className="flex items-center gap-2 bg-input border border-border rounded-lg px-3 py-2">
                <span className="text-foreground text-sm">{method.name}</span>
                <span className="text-muted-foreground text-xs">({CURRENCY_SYMBOLS[method.currency]})</span>
                <button onClick={() => openDialog(method)} className="text-muted-foreground hover:text-primary ml-1"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDeleteMethod(method.id)} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {paymentMethods.filter(m => m.is_active).length === 0 && (
              <p className="text-muted-foreground text-sm">No hay métodos de pago configurados</p>
            )}
          </div>
          <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="h-4 w-4 mr-2" /> Agregar</Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingMethod ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-input border-border" placeholder="Ej: Efectivo, Transferencia..." />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v as 'USD' | 'COP' | 'VES' })}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="VES">VES - Bolívar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
            <Button onClick={handleSaveMethod} disabled={savingMethod} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Save className="h-4 w-4 mr-2" /> {savingMethod ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}