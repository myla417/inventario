import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, Trash2, Package, AlertTriangle, TrendingUp, ArrowUpDown, Pencil, AlertCircle, ArrowDownToLine, ArrowUpFromLine, Settings2, History } from "lucide-react"
import { formatAmount, PRODUCT_UNITS } from "@/Utils.functions"
import type { Product, ProductFormData } from "@/interfaces/data/Product"
import type { Category } from "@/interfaces/data/Category"
import type { StockMovement } from "@/interfaces/data/StockMovement"
import { supabase, supabaseRpcStockMovements } from "@/lib/supabase"

interface ProductsProps {
  storeId: string
  initialProducts: Product[]
  initialCategories: Category[]
  saveProducts: (products: Product[]) => void
  saveCategories: (categories: Category[]) => void
}

export default function Products({ storeId, initialProducts, initialCategories, saveProducts, saveCategories }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [savingProduct, setSavingProduct] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [newProduct, setNewProduct] = useState<ProductFormData>({
    sku: "", name: "", description: "", category_id: "",
    unit: "unidad", cost: 0, retail_price: 0, wholesale_price: 0, min_stock: 0,
  })
  const [newCategory, setNewCategory] = useState({ name: "", description: "" })
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false)
  const [savingMovement, setSavingMovement] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [movementType, setMovementType] = useState<'entry' | 'exit' | 'adjustment'>('entry')
  const [movementQuantity, setMovementQuantity] = useState(0)
  const [movementReason, setMovementReason] = useState("")

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory
    const matchesLowStock = !showLowStockOnly || p.current_stock <= p.min_stock
    return matchesSearch && matchesCategory && matchesLowStock
  })

  const handleSaveProduct = async () => {
    if (savingProduct) return
    if (!newProduct.name || !newProduct.category_id) return
    setSavingProduct(true)
    try {
      if (editingProduct) {
        const { data, error } = await supabase.from('products').update({
          sku: newProduct.sku,
          name: newProduct.name,
          description: newProduct.description,
          category_id: newProduct.category_id,
          unit: newProduct.unit,
          cost: newProduct.cost,
          retail_price: newProduct.retail_price,
          wholesale_price: newProduct.wholesale_price,
          min_stock: newProduct.min_stock,
        }).eq('id', editingProduct.id).select().single()
        if (error) { console.error(error); return }
        if (data) {
          const updated = { ...data, category_name: categories.find(c => c.id === data.category_id)?.name || '' } as Product
          setProducts(products.map(p => p.id === editingProduct.id ? updated : p))
          saveProducts(products.map(p => p.id === editingProduct.id ? updated : p))
        }
      } else {
        const { data, error } = await supabase.from('products').insert({
          store_id: storeId,
          sku: newProduct.sku,
          name: newProduct.name,
          description: newProduct.description,
          category_id: newProduct.category_id,
          unit: newProduct.unit,
          cost: newProduct.cost,
          retail_price: newProduct.retail_price,
          wholesale_price: newProduct.wholesale_price,
          current_stock: 0,
          min_stock: newProduct.min_stock,
          is_active: true,
        }).select().single()
        if (error) { console.error(error); return }
        if (data) {
          const product = { ...data, category_name: categories.find(c => c.id === data.category_id)?.name || '' } as Product
          setProducts([...products, product])
          saveProducts([...products, product])
        }
      }
      setNewProduct({ sku: "", name: "", description: "", category_id: "", unit: "unidad", cost: 0, retail_price: 0, wholesale_price: 0, min_stock: 0 })
      setEditingProduct(null)
      setIsAddDialogOpen(false)
    } finally {
      setSavingProduct(false)
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setNewProduct({
      sku: product.sku,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      unit: product.unit,
      cost: product.cost,
      retail_price: product.retail_price,
      wholesale_price: product.wholesale_price,
      min_stock: product.min_stock,
    })
    setIsAddDialogOpen(true)
  }

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id)
    if (error) { console.error(error); return }
    setProducts(products.filter(p => p.id !== id))
    saveProducts(products.filter(p => p.id !== id))
  }

  const handleSaveCategory = async () => {
    if (savingCategory) return
    if (!newCategory.name) return
    setSavingCategory(true)
    try {
      if (editingCategory) {
        const { data, error } = await supabase.from('categories').update({
          name: newCategory.name,
          description: newCategory.description,
        }).eq('id', editingCategory.id).select().single()
        if (error) { console.error(error); return }
        if (data) {
          setCategories(categories.map(c => c.id === editingCategory.id ? data as Category : c))
          saveCategories(categories.map(c => c.id === editingCategory.id ? data as Category : c))
        }
      } else {
        const { data, error } = await supabase.from('categories').insert({
          store_id: storeId, name: newCategory.name, description: newCategory.description,
        }).select().single()
        if (error) { console.error(error); return }
        if (data) {
          setCategories([...categories, data as Category])
          saveCategories([...categories, data as Category])
        }
      }
      setNewCategory({ name: "", description: "" })
      setEditingCategory(null)
      setIsCategoryDialogOpen(false)
    } finally {
      setSavingCategory(false)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setNewCategory({ name: category.name, description: category.description })
    setIsCategoryDialogOpen(true)
  }

  const handleDeleteCategory = async (id: string) => {
    const productsInCategory = products.filter(p => p.category_id === id).length
    if (productsInCategory > 0) {
      alert(`No se puede eliminar la categoría: tiene ${productsInCategory} productos asociados.`)
      return
    }
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) { console.error(error); return }
    setCategories(categories.filter(c => c.id !== id))
    saveCategories(categories.filter(c => c.id !== id))
  }

  const lowStockCount = products.filter(p => p.current_stock <= p.min_stock).length
  const totalValue = products.reduce((sum, p) => sum + p.current_stock * p.cost, 0)

  const loadMovements = async () => {
    if (!storeId) return
    setLoadingMovements(true)
    try {
      const data = await supabaseRpcStockMovements(storeId);
      if (data) { setMovements(data) }
    } finally {
      setLoadingMovements(false)
    }
  }

  useEffect(() => {
    loadMovements()
  }, [storeId])

  const handleSaveMovement = async () => {
    if (savingMovement || !selectedProduct) return
    if (movementQuantity <= 0) return

    setSavingMovement(true)
    try {
      let newQuantity: number
      if (movementType === 'entry') {
        newQuantity = selectedProduct.current_stock + movementQuantity
      } else if (movementType === 'exit') {
        newQuantity = Math.max(0, selectedProduct.current_stock - movementQuantity)
      } else {
        newQuantity = movementQuantity
      }

      const { error: movementError } = await supabase.from('stock_movements').insert({
        store_id: storeId,
        product_id: selectedProduct.id,
        type: movementType,
        quantity: movementQuantity,
        previous_quantity: selectedProduct.current_stock,
        new_quantity: newQuantity,
        reason: movementReason,
        reference_type: 'adjustment',
      })
      if (movementError) { console.error(movementError); return }

      const { error: productError } = await supabase.from('products').update({ current_stock: newQuantity }).eq('id', selectedProduct.id)
      if (productError) { console.error(productError); return }

      const updatedProducts = products.map(p => p.id === selectedProduct.id ? { ...p, current_stock: newQuantity } : p)
      setProducts(updatedProducts)
      saveProducts(updatedProducts)

      setSelectedProduct(null)
      setMovementType('entry')
      setMovementQuantity(0)
      setMovementReason("")
      setIsMovementDialogOpen(false)
      loadMovements()
    } finally {
      setSavingMovement(false)
    }
  }

  const openMovementDialog = (product: Product, type: 'entry' | 'exit' | 'adjustment') => {
    setSelectedProduct(product)
    setMovementType(type)
    setMovementQuantity(type === 'adjustment' ? product.current_stock : 0)
    setMovementReason("")
    setIsMovementDialogOpen(true)
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entry': return <ArrowDownToLine className="h-4 w-4 text-green-500" />
      case 'exit': return <ArrowUpFromLine className="h-4 w-4 text-red-500" />
      default: return <Settings2 className="h-4 w-4 text-primary" />
    }
  }

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'entry': return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Entrada</Badge>
      case 'exit': return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Salida</Badge>
      default: return <Badge className="bg-primary/20 text-primary border-primary/30">Ajuste</Badge>
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Bajo Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Productos por reabastecer</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${formatAmount(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Valor del inventario</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-3 bg-card border border-border">
          <TabsTrigger value="products" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1">
            <ArrowUpDown className="h-4 w-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o codigo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-input border-border" />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 bg-input border-border">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStockOnly ? "default" : "outline"}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={showLowStockOnly ? "bg-secondary hover:bg-secondary/90 text-primary-foreground" : "border-border"}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Bajo Stock ({lowStockCount})
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) { setEditingProduct(null); setNewProduct({ sku: "", name: "", description: "", category_id: "", unit: "unidad", cost: 0, retail_price: 0, wholesale_price: 0, min_stock: 0 }) }}}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                  <DialogDescription>{editingProduct ? "Actualizar datos del producto" : "Agregar un nuevo producto al catálogo"}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Codigo</Label>
                      <Input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="bg-input border-border" placeholder="SKU-001" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="bg-input border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="bg-input border-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={newProduct.category_id} onValueChange={(v) => setNewProduct({ ...newProduct, category_id: v })}>
                        <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Unidad</Label>
                      <Select value={newProduct.unit} onValueChange={(v) => setNewProduct({ ...newProduct, unit: v })}>
                        <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Costo (COP)</Label>
                      <Input type="number" step="0.01" value={newProduct.cost || ""} onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })} className="bg-input border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio Minorista</Label>
                      <Input type="number" step="0.01" value={newProduct.retail_price || ""} onChange={(e) => setNewProduct({ ...newProduct, retail_price: parseFloat(e.target.value) || 0 })} className="bg-input border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio Mayorista</Label>
                      <Input type="number" step="0.01" value={newProduct.wholesale_price || ""} onChange={(e) => setNewProduct({ ...newProduct, wholesale_price: parseFloat(e.target.value) || 0 })} className="bg-input border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Mínimo</Label>
                    <Input type="number" value={newProduct.min_stock || ""} onChange={(e) => setNewProduct({ ...newProduct, min_stock: parseInt(e.target.value) || 0 })} className="bg-input border-border" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setEditingProduct(null) }}>Cancelar</Button>
                  <Button disabled={!newProduct.name || !newProduct.category_id || savingProduct} onClick={handleSaveProduct} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {savingProduct ? 'Guardando...' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Mobile: cards; Desktop: table */}
          <div className="block lg:hidden space-y-3">
            {filteredProducts.map(p => (
              <Card key={p.id} className="border-border bg-card/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku} · {p.category_name || 'Sin categoría'}</p>
                    </div>
                    <Badge variant={p.current_stock <= p.min_stock ? "destructive" : "outline"} className={p.current_stock <= p.min_stock ? "bg-secondary" : "border-primary text-primary"}>
                      {p.current_stock} {p.unit}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="text-sm">
                      <span className="text-foreground font-bold">${formatAmount(p.retail_price)}</span>
                      <span className="text-muted-foreground"> / ${formatAmount(p.wholesale_price)} may.</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMovementDialog(p, 'entry')} title="Entrada">
                        <ArrowDownToLine className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProduct(p)}>
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteProduct(p.id)}>
                        <Trash2 className="h-4 w-4 text-secondary" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm hidden lg:block">
            <CardHeader>
              <CardTitle className="text-foreground">Catálogo de Productos</CardTitle>
              <CardDescription>Gestiona los productos del inventario</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground">Codigo</TableHead>
                    <TableHead className="text-foreground">Nombre</TableHead>
                    <TableHead className="text-foreground">Categoría</TableHead>
                    <TableHead className="text-foreground">Stock</TableHead>
<TableHead className="text-foreground">Minorista</TableHead>
                    <TableHead className="text-foreground">Mayorista</TableHead>
                    <TableHead className="text-foreground">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(p => (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="text-muted-foreground font-mono">{p.sku}</TableCell>
                      <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.category_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.current_stock <= p.min_stock ? "bg-secondary" : "border-primary text-primary"}>
                          {p.current_stock} {p.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">${formatAmount(p.retail_price)}</TableCell>
                      <TableCell className="text-foreground">${formatAmount(p.wholesale_price)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMovementDialog(p, 'entry')} title="Entrada">
                            <ArrowDownToLine className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMovementDialog(p, 'exit')} title="Salida">
                            <ArrowUpFromLine className="h-4 w-4 text-red-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMovementDialog(p, 'adjustment')} title="Ajuste">
                            <Settings2 className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEditProduct(p)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-secondary" onClick={() => handleDeleteProduct(p.id)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { setIsCategoryDialogOpen(open); if (!open) { setEditingCategory(null); setNewCategory({ name: "", description: "" }) }}}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="h-4 w-4 mr-2" /> Nueva Categoría</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} className="bg-input border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} className="bg-input border-border" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsCategoryDialogOpen(false); setEditingCategory(null) }}>Cancelar</Button>
                  <Button disabled={!newCategory.name || savingCategory} onClick={handleSaveCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {savingCategory ? 'Guardando...' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map(c => (
                  <div key={c.id} className="p-3 rounded-lg border border-border bg-muted/50">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCategory(c)}>
                          <Pencil className="h-3 w-3 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(c.id)}>
                          <Trash2 className="h-3 w-3 text-secondary" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.description || 'Sin descripción'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{products.filter(p => p.category_id === c.id).length} productos</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => { loadMovements() }} variant="outline" className="border-border">
              <History className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>

          <div className="block lg:hidden space-y-3">
            {loadingMovements ? (
              <Card className="border-border bg-card/50">
                <CardContent className="p-4 text-center text-muted-foreground">
                  Cargando movimientos...
                </CardContent>
              </Card>
            ) : movements.length === 0 ? (
              <Card className="border-border bg-card/50">
                <CardContent className="p-4 text-center text-muted-foreground">
                  No hay movimientos registrados
                </CardContent>
              </Card>
            ) : (
              movements.slice(0, 20).map(m => (
                <Card key={m.id} className="border-border bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {getMovementIcon(m.type)}
                        <div>
                          <p className="font-medium text-foreground">{m.product_name || 'Producto'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>
                      {getMovementBadge(m.type)}
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {m.previous_quantity} → {m.new_quantity}
                      </span>
                      <span className={m.type === 'entry' ? 'text-green-500' : m.type === 'exit' ? 'text-red-500' : 'text-primary'}>
                        {m.type === 'entry' ? '+' : m.type === 'exit' ? '-' : ''}{m.quantity}
                      </span>
                    </div>
                    {m.reason && <p className="text-xs text-muted-foreground mt-1">Razón: {m.reason}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm hidden lg:block">
            <CardHeader>
              <CardTitle className="text-foreground">Historial de Movimientos</CardTitle>
              <CardDescription>Entradas, salidas y ajustes de inventario</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMovements ? (
                <p className="text-center text-muted-foreground py-8">Cargando movimientos...</p>
              ) : movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay movimientos registrados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">Fecha</TableHead>
                      <TableHead className="text-foreground">Producto</TableHead>
                      <TableHead className="text-foreground">Tipo</TableHead>
                      <TableHead className="text-foreground text-right">Cantidad</TableHead>
                      <TableHead className="text-foreground text-right">Anterior</TableHead>
                      <TableHead className="text-foreground text-right">Nuevo</TableHead>
                      <TableHead className="text-foreground">Razón</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.slice(0, 50).map(m => (
                      <TableRow key={m.id} className="border-border">
                        <TableCell className="text-muted-foreground">
                          {new Date(m.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{m.product_name || '—'}</TableCell>
                        <TableCell>{getMovementBadge(m.type)}</TableCell>
                        <TableCell className={`text-right font-medium ${m.type === 'entry' ? 'text-green-500' : m.type === 'exit' ? 'text-red-500' : 'text-primary'}`}>
                          {m.type === 'entry' ? '+' : m.type === 'exit' ? '-' : ''}{m.quantity}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{m.previous_quantity}</TableCell>
                        <TableCell className="text-right text-foreground">{m.new_quantity}</TableCell>
                        <TableCell className="text-muted-foreground">{m.reason || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isMovementDialogOpen} onOpenChange={(open) => {
        setIsMovementDialogOpen(open)
        if (!open) { setSelectedProduct(null); setMovementQuantity(0); setMovementReason("") }
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {movementType === 'entry' ? 'Entrada de Stock' : movementType === 'exit' ? 'Salida de Stock' : 'Ajuste de Stock'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Stock actual: {selectedProduct?.current_stock} {selectedProduct?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Movimiento</Label>
              <Select value={movementType} onValueChange={(v: 'entry' | 'exit' | 'adjustment') => {
                setMovementType(v)
                if (v === 'adjustment' && selectedProduct) setMovementQuantity(selectedProduct.current_stock)
                else setMovementQuantity(0)
              }}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entrada (+)</SelectItem>
                  <SelectItem value="exit">Salida (-)</SelectItem>
                  <SelectItem value="adjustment">Ajuste (Set)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="0"
                value={movementQuantity || ""}
                onChange={(e) => setMovementQuantity(parseInt(e.target.value) || 0)}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Razón / Referencia</Label>
              <Input
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                className="bg-input border-border"
                placeholder={movementType === 'entry' ? "Ej: Compra a proveedor" : movementType === 'exit' ? "Ej: Venta, devolución" : "Ej: Inventario físico"}
              />
            </div>
            {selectedProduct && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock actual:</span>
                    <span className="text-foreground font-medium">{selectedProduct.current_stock} {selectedProduct.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Movimiento:</span>
                    <span className={`font-medium ${movementType === 'entry' ? 'text-green-500' : movementType === 'exit' ? 'text-red-500' : 'text-primary'}`}>
                      {movementType === 'entry' ? '+' : movementType === 'exit' ? '-' : ''}{movementQuantity}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1">
                    <span className="text-muted-foreground">Nuevo stock:</span>
                    <span className="text-foreground font-bold">
                      {movementType === 'entry'
                        ? selectedProduct.current_stock + movementQuantity
                        : movementType === 'exit'
                          ? Math.max(0, selectedProduct.current_stock - movementQuantity)
                          : movementQuantity} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!selectedProduct || movementQuantity <= 0 || savingMovement}
              onClick={handleSaveMovement}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {savingMovement ? 'Guardando...' : 'Guardar Movimiento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}