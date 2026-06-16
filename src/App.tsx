import { AuthProvider, useAuth } from './components/auth/AuthContext'
import { CurrencyProvider } from './hooks/useCurrency'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import { BarChart3, ShoppingCart, FileText, Package, DollarSign, Users, Settings } from "lucide-react"
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Estimates from './pages/Estimates'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Customers from './pages/Customers'
import SettingsPage from './pages/Settings'
import { useEffect, useState } from 'react'
import type { StoreSettings } from './lib/supabase'
import { supabase, supabaseRpcSettings } from './lib/supabase'
import type { Profile } from './interfaces/data/Profile'
import type { PaymentMethod } from './interfaces/data/PaymentMethod'
import type { Product } from './interfaces/data/Product'
import type { Customer } from './interfaces/data/Customer'
import type { Category } from './interfaces/data/Category'
import type { ExchangeRate } from './interfaces/data/ExchangeRate'
import type { DashboardColumn } from './interfaces/data/DashboardTask'

function App() {
  return (
    <AuthProvider>
      <AppContext />
    </AuthProvider>
  )
}

function AppContext() {
  const { login, logout, user } = useAuth()
  const navigate = useNavigate()

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    id: '', name: '', address: '', phone: '', email: '', description: '',
  })
  const [userRole, setUserRole] = useState<{ name: string; role: string } | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [kanbanColumns, setKanbanColumns] = useState<DashboardColumn[]>([])
  const [kanbanTasks, setKanbanTasks] = useState<any[]>([])

  const getSettings = async () => {
    if (!user?.id) return
    const settings = await supabaseRpcSettings(user.id)
    setStoreSettings(settings)
    const { data } = await supabase.from('profiles')
      .select()
      .eq('user_id', user.id)
      .eq('store_id', settings.id)
      .single()
    if (data) {
      const profile = data as unknown as Profile
      if (profile.deleted_at) {
        await logoutRedirect()
        return
      }
      setUserRole({ name: profile.name, role: profile.role })
    }
  }

  const getPaymentMethods = async () => {
    if (!storeSettings.id) return
    const { data } = await supabase.from('payment_methods')
      .select()
      .eq('store_id', storeSettings.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .overrideTypes<Array<PaymentMethod>>()
    if (data) setPaymentMethods(data)
  }

  const getProducts = async () => {
    if (!storeSettings.id) return
    const { data } = await supabase.from('products')
      .select('*, categories(name)')
      .eq('store_id', storeSettings.id)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    if (data) {
      const mapped = data.map((p: any) => ({
        ...p,
        category_name: p.categories?.name || '',
      }))
      setProducts(mapped)
    }
  }

  const getCustomers = async () => {
    if (!storeSettings.id) return
    const { data } = await supabase.from('customers')
      .select()
      .eq('store_id', storeSettings.id)
      .order('name', { ascending: true })
      .overrideTypes<Array<Customer>>()
    if (data) setCustomers(data)
  }

  const getCategories = async () => {
    if (!storeSettings.id) return
    const { data } = await supabase.from('categories')
      .select()
      .eq('store_id', storeSettings.id)
      .order('name', { ascending: true })
      .overrideTypes<Array<Category>>()
    if (data) setCategories(data)
  }

  const getExchangeRates = async () => {
    if (!storeSettings.id) return
    const { data } = await supabase.from('exchange_rates')
      .select()
      .eq('store_id', storeSettings.id)
      .overrideTypes<Array<ExchangeRate>>()
    if (data) setExchangeRates(data)
  }

  const getKanbanData = async () => {
    if (!storeSettings.id) return
    const { data: cols } = await supabase
      .from('dashboard_columns')
      .select('*')
      .eq('store_id', storeSettings.id)
      .order('position', { ascending: true })
      .overrideTypes<Array<DashboardColumn>>()
    const { data: tasks } = await supabase
      .from('dashboard_tasks')
      .select('*')
      .eq('store_id', storeSettings.id)
    setKanbanColumns(cols || [])
    setKanbanTasks(tasks || [])
  }

  useEffect(() => {
    getPaymentMethods()
    getProducts()
    getCustomers()
    getCategories()
    getExchangeRates()
    getKanbanData()
  }, [storeSettings.id])

  useEffect(() => {
    getSettings()
  }, [user])

  const loginRedirect = async (data: any) => {
    login(data)
  }

  const logoutRedirect = async () => {
    setStoreSettings({ id: '', name: '', address: '', phone: '', email: '', description: '' })
    setUserRole(null)
    setPaymentMethods([])
    setProducts([])
    setCustomers([])
    setCategories([])
    setExchangeRates([])
    await logout()
  }

  const redirect = (page: string) => {
    navigate(page)
  }

  const adminMenuItems = [
    { id: "/dashboard", label: "Inicio", icon: BarChart3 },
    { id: "/pos", label: "Ventas", icon: ShoppingCart },
    { id: "/estimates", label: "Cotizaciones", icon: FileText },
    { id: "/sales", label: "Reportes", icon: DollarSign },
    { id: "/products", label: "Inventario", icon: Package },
    { id: "/customers", label: "Clientes", icon: Users },
    // { id: "/expenses", label: "Gastos", icon: Receipt },
    { id: "/settings", label: "Configuración", icon: Settings },
  ]

  const cashierMenuItems = [
    { id: "/dashboard", label: "Inicio", icon: BarChart3 },
    { id: "/pos", label: "Ventas", icon: ShoppingCart },
    { id: "/estimates", label: "Cotizaciones", icon: FileText },
    { id: "/sales", label: "Reportes", icon: DollarSign },
    { id: "/products", label: "Inventario", icon: Package },
    { id: "/customers", label: "Clientes", icon: Users },
    { id: "/settings", label: "Configuración", icon: Settings },
  ]

  const menuItems = userRole?.role === 'cashier' ? cashierMenuItems : adminMenuItems

  return (
    <CurrencyProvider storeId={storeSettings.id || ''}>
      <Routes>
        <Route path="/login" element={<Login onLogin={loginRedirect} />} />
        <Route path="/" element={<Login onLogin={loginRedirect} />} />
        <Route element={
          <Layout
            onLogout={logoutRedirect}
            redirect={redirect}
            menuItems={menuItems}
            name={userRole?.name || ''}
            role={userRole?.role || ''}
          />
        }>
          <Route path="/dashboard" element={<Dashboard storeId={storeSettings.id} kanbanColumns={kanbanColumns} kanbanTasks={kanbanTasks} setKanbanColumns={setKanbanColumns} setKanbanTasks={setKanbanTasks} />} />
          <Route path="/pos" element={<POS storeId={storeSettings.id} products={products} customers={customers} saveCustomers={setCustomers} saveProducts={setProducts} paymentMethods={paymentMethods} exchangeRates={exchangeRates} storeName={storeSettings.name} />} />
          <Route path="/estimates" element={<Estimates storeId={storeSettings.id} products={products} customers={customers} saveCustomers={setCustomers} saveProducts={setProducts} paymentMethods={paymentMethods} exchangeRates={exchangeRates} storeName={storeSettings.name} />} />
          <Route path="/products" element={<Products storeId={storeSettings.id} userRole={userRole?.role || ''} initialProducts={products} initialCategories={categories} saveProducts={setProducts} saveCategories={setCategories} />} />
          <Route path="/sales" element={<Sales storeId={storeSettings.id} userRole={userRole?.role || ''} products={products} customers={customers} saveCustomers={setCustomers} saveProducts={setProducts} />} />
          <Route path="/customers" element={<Customers storeId={storeSettings.id} userRole={userRole?.role || ''} initialCustomers={customers} paymentMethods={paymentMethods} saveCustomers={setCustomers} />} />
          {/* <Route path="/expenses" element={<Expenses storeId={storeSettings.id} />} /> */}
          <Route path="/settings" element={<SettingsPage storeId={storeSettings.id} initialStore={storeSettings} initialPaymentMethods={paymentMethods} initialExchangeRates={exchangeRates} saveStore={setStoreSettings} savePaymentMethods={setPaymentMethods} />} />
        </Route>
      </Routes>
    </CurrencyProvider>
  )
}

export default App