import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, Users, Pencil, Trash2, DollarSign, CreditCard, ChevronDown, AlertCircle } from "lucide-react"
import type { Customer, CustomerFormData } from "@/interfaces/data/Customer"
import type { Sale } from "@/interfaces/data/Sale"
import { supabase } from "@/lib/supabase"
import { formatAmount } from "@/Utils.functions"

interface CustomersProps {
  storeId: string
  initialCustomers: Customer[]
  saveCustomers: (customers: Customer[]) => void
}

export default function Customers({ storeId, initialCustomers, saveCustomers }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)
  const [newCustomer, setNewCustomer] = useState<CustomerFormData>({ name: "", phone: "", address: "", notes: "", credit_limit: 0 })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSales, setCustomerSales] = useState<Sale[]>([])
  const [loadingSales, setLoadingSales] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [customerFilter, setCustomerFilter] = useState("")
  const [showWithBalanceOnly, setShowWithBalanceOnly] = useState(false)

  const filteredCustomers = customers.filter(c =>
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)) &&
    (!showWithBalanceOnly || c.balance > 0)
  )

  const withBalanceCount = customers.filter(c => c.balance > 0).length

  const totalBalance = customers.reduce((sum, c) => sum + c.balance, 0)
  const customersWithBalance = customers.filter(c => c.balance > 0).length

  const getStatusBadge = (sale: Sale) => {
    switch (sale.status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pendiente</Badge>
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Completada</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelada</Badge>
      default:
        return <Badge variant="outline">{sale.status}</Badge>
    }
  }

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer)
      setNewCustomer({ name: customer.name, phone: customer.phone, address: customer.address, notes: customer.notes, credit_limit: customer.credit_limit })
    } else {
      setEditingCustomer(null)
      setNewCustomer({ name: "", phone: "", address: "", notes: "", credit_limit: 0 })
    }
    setIsDialogOpen(true)
  }

  const handleSaveCustomer = async () => {
    if (saving) return
    if (!newCustomer.name) return
    setSaving(true)
    try {
      if (editingCustomer) {
        const { data, error } = await supabase.from('customers').update({
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: newCustomer.address,
          notes: newCustomer.notes,
          credit_limit: newCustomer.credit_limit,
        }).eq('id', editingCustomer.id).select().single()
        if (error) { console.error(error); return }
        if (data) {
          const updated = data as unknown as Customer
          setCustomers(customers.map(c => c.id === editingCustomer.id ? updated : c))
          saveCustomers(customers.map(c => c.id === editingCustomer.id ? updated : c))
        }
      } else {
        const { data, error } = await supabase.from('customers').insert({
          store_id: storeId,
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: newCustomer.address,
          notes: newCustomer.notes,
          credit_limit: newCustomer.credit_limit,
          balance: 0,
        }).select().single()
        if (error) { console.error(error); return }
        if (data) {
          const customer = data as unknown as Customer
          setCustomers([...customers, customer])
          saveCustomers([...customers, customer])
        }
      }
      setNewCustomer({ name: "", phone: "", address: "", notes: "", credit_limit: 0 })
      setEditingCustomer(null)
      setIsDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("¿Eliminar este cliente?")) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) { console.error(error); return }
    setCustomers(customers.filter(c => c.id !== id))
    saveCustomers(customers.filter(c => c.id !== id))
  }

  const loadCustomerSales = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setLoadingSales(true)
    const { data } = await supabase.from('sales')
      .select()
      .eq('store_id', storeId)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .overrideTypes<Array<Sale>>()
    if (data) setCustomerSales(data)
    setLoadingSales(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Con Deuda</CardTitle>
            <CreditCard className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{customersWithBalance}</div>
            <p className="text-xs text-muted-foreground">Clientes con saldo</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Deuda Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${formatAmount(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-input border-border" />
            </div>
            <Button
              variant={showWithBalanceOnly ? "default" : "outline"}
              onClick={() => setShowWithBalanceOnly(!showWithBalanceOnly)}
              className={showWithBalanceOnly ? "bg-secondary hover:bg-secondary/90 text-primary-foreground" : "border-border"}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Con Deuda ({withBalanceCount})
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingCustomer(null); setNewCustomer({ name: "", phone: "", address: "", notes: "", credit_limit: 0 }) }}}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
                  <DialogDescription>{editingCustomer ? "Actualizar datos del cliente" : "Agregar un nuevo cliente al sistema"}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2"><Label>Nombre</Label><Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="bg-input border-border" /></div>
                  <div className="space-y-2"><Label>Teléfono</Label><Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="bg-input border-border" /></div>
                  <div className="space-y-2"><Label>Dirección</Label><Input value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className="bg-input border-border" /></div>
                  <div className="space-y-2"><Label>Notas</Label><Input value={newCustomer.notes} onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })} className="bg-input border-border" /></div>
                  <div className="space-y-2"><Label>Límite de Crédito (COP)</Label><Input type="number" step="0.01" value={newCustomer.credit_limit || ""} onChange={(e) => setNewCustomer({ ...newCustomer, credit_limit: parseFloat(e.target.value) || 0 })} className="bg-input border-border" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsDialogOpen(false); setEditingCustomer(null) }}>Cancelar</Button>
                  <Button disabled={!newCustomer.name || saving} onClick={handleSaveCustomer} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="block lg:hidden space-y-3">
            {filteredCustomers.map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(c)}><Pencil className="h-4 w-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteCustomer(c.id)}><Trash2 className="h-4 w-4 text-secondary" /></Button>
                  </div>
                </div>
                {c.balance > 0 && <p className="text-sm text-secondary">Saldo: ${formatAmount(c.balance)}</p>}
                {c.credit_limit > 0 && <p className="text-xs text-muted-foreground">Crédito: ${formatAmount(c.credit_limit)}</p>}
              </div>
            ))}
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm hidden lg:block">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Clientes</CardTitle>
              <CardDescription>{customers.length} clientes registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground">Nombre</TableHead>
                    <TableHead className="text-foreground">Teléfono</TableHead>
                    <TableHead className="text-foreground">Dirección</TableHead>
                    <TableHead className="text-foreground">Crédito</TableHead>
                    <TableHead className="text-foreground">Saldo</TableHead>
                    <TableHead className="text-foreground">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(c => (
                    <TableRow key={c.id} className="border-border">
                      <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{c.address || '—'}</TableCell>
                      <TableCell className="text-foreground">${formatAmount(c.credit_limit)}</TableCell>
                      <TableCell className={c.balance > 0 ? "text-secondary font-medium" : "text-foreground"}>${formatAmount(c.balance)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(c)}><Pencil className="h-4 w-4 text-primary" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteCustomer(c.id)}><Trash2 className="h-4 w-4 text-secondary" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                onFocus={() => setDropdownOpen(true)}
                className="pl-10 pr-10 bg-input border-border"
              />
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {dropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-md max-h-64 overflow-auto">
                {customers.filter(c => c.name.toLowerCase().includes(customerFilter.toLowerCase())).length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Sin resultados</div>
                ) : (
                  customers.filter(c => c.name.toLowerCase().includes(customerFilter.toLowerCase())).map(c => (
                    <div
                      key={c.id}
                      className="p-2 cursor-pointer hover:bg-accent text-foreground text-sm"
                      onClick={() => {
                        loadCustomerSales(c)
                        setCustomerFilter(c.name)
                        setDropdownOpen(false)
                      }}
                    >
                      {c.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Historial de Compras</CardTitle>
              <CardDescription>{selectedCustomer ? `Saldo total de ${selectedCustomer.name}: $${formatAmount(selectedCustomer.balance)}` : 'Seleccione un cliente'}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <p className="text-muted-foreground text-center py-4">Cargando...</p>
              ) : customerSales.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Sin compras registradas</p>
              ) : (
                <div className="block lg:hidden space-y-3">
                  {customerSales.map(s => (
                    <div key={s.id} className="p-3 rounded-lg border border-border bg-muted/50">
                      <div className="flex justify-between">
                        <p className="font-medium text-foreground">{s.is_estimate ? 'Cotización' : 'Venta'} #{s.estimate_number || s.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString('es-CO')}</p>
                      </div>
                      <p className="text-lg font-bold text-foreground">${formatAmount(s.total)}</p>
                      <p className="text-xs text-muted-foreground">{s.is_estimate ? 'Cotización' : s.status}</p>
                    </div>
                  ))}
                </div>
              )}
              {customerSales.length > 0 && (
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Fecha</TableHead>
                        <TableHead className="text-foreground">Tipo</TableHead>
                        <TableHead className="text-foreground">Total</TableHead>
                        <TableHead className="text-foreground">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerSales.map(s => (
                        <TableRow key={s.id} className="border-border">
                          <TableCell className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString('es-CO')}</TableCell>
                          <TableCell className="text-foreground">{s.is_estimate ? 'Cotización' : 'Venta'}</TableCell>
                          <TableCell className="font-medium text-foreground">${formatAmount(s.total)}</TableCell>
                          <TableCell>{getStatusBadge(s)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}