# Concreto - Inventario y Ventas

Sistema de inventario-ventas para una ferretería (hardware construction store). Gestiona catálogo de productos, inventario, punto de venta (POS), cotizaciones, clientes, proveedores, gastos y reportes. Desarrollado como MVP con tecnología moderna, alojado en Vercel y usando Supabase free tier.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router v7 |
| Auth & DB | Supabase (Auth + PostgreSQL + RPC) |
| Hosting | Vercel |
| Language | Español (UI) |
| Design | Mobile-first responsive |

## Design Principles

### Mobile-First Responsive

All pages are designed mobile-first:
- **Mobile (< 768px)**: Full-width cards, stacked layouts, hamburger menu, touch-friendly targets
- **Tablet (768px - 1024px)**: Two-column grids, collapsible sidebar
- **Desktop (> 1024px)**: Full sidebar, multi-column tables, expanded charts

Key responsive patterns:
- Sidebar: Hidden on mobile with hamburger menu, visible on desktop
- Tables: Hidden on mobile, replaced with card layout; visible on desktop
- POS: Full-screen cart on mobile, side-panel cart on desktop
- Forms: Full-width inputs on mobile, grid layouts on desktop
- Cards: Single column on mobile, multi-column grid on desktop

### Dark Theme

Always-on dark theme using oklch colors, matching the Area51 PWA style:
- Primary: Yellow (#FCC90F)
- Secondary: Gray (#4A4036)
- Background: Near-black (oklch 0.08)
- Foreground: Near-white (oklch 0.98)
- Muted/borders: Dark grays

### Printable Estimates

HTML-based estimate printing using `@media print` CSS:
- `.no-print` class hides navigation/sidebar during printing
- `.print-only` class shows estimate-specific layout during printing
- Clean black-on-white print layout for estimates
- Accessed via `window.print()` from estimate view

## Currency System

- **Base currency:** COP (all amounts stored in DB as COP `numeric(12,2)`)
- **Supported display currencies:** USD, COP, VES
- Admin manually sets exchange rates in Settings page
- `exchange_rates` table has exactly 3 rows per store (one per currency)
- COP rate is always 1.0 (base); USD and VES rates are manually set
- When creating a sale: select payment currency, system converts using stored rate
- Sale records store `exchange_rate` and `currency_paid` at time of sale for audit
- Helper functions: `formatCurrency(amount, currency, rates)`, `convertCurrency(amount, currency, rates)`

## Estimates (Cotizaciones)

### Flow
1. Cashier/Admin clicks "Cotizar" from POS or "Nueva Cotización" from Estimates page
2. Adds products to cart (same as sale, but `is_estimate = true`)
3. Optionally selects a customer
4. System generates `estimate_number` (format: `COT-0001`, auto-increment per store)
5. "Imprimir" button triggers `window.print()` with print-specific CSS
6. Estimates are saved and can be:
   - Viewed / re-printed at any time
   - Converted to a real sale (deducts stock, creates sale record)

### Printable Estimate Format
```
┌─────────────────────────────────────┐
│  [Store Name]                       │
│  [Store Address] [Phone]            │
│                                     │
│  Cotización #: COT-0001             │
│  Fecha: 07/05/2026                  │
│  Cliente: [Name] (opcional)          │
│                                     │
│  ┌─────┬──────────┬────┬────┬────┐  │
│  │ Cant│ Producto │Unid│Precio│Tot│  │
│  ├─────┼──────────┼────┼────┼────┤  │
│  │  2  │Cemento   │ sac│ 8.5│17.0│  │
│  │  10 │Varilla   │ ml │ 3.0│30.0│  │
│  └─────┴──────────┴────┴────┴────┘  │
│                                     │
│  Subtotal:            $47.00 COP    │
│  Descuento:           $0.00 COP     │
│  Total:               $47.00 COP    │
│  Equivalente:         19 BTC VES... │
│                                     │
│  Vigencia: 15 días                  │
│  ___________________________         │
│  Firma                              │
└─────────────────────────────────────┘
```

## Database Schema

### Stores
```
stores
  id          uuid PK
  name        text
  address     text
  phone       text
  email       text
  description text
  created_at  timestamptz
```

### Profiles (extends auth.users)
```
profiles
  id          uuid PK
  user_id     uuid FK → auth.users
  store_id    uuid FK → stores
  name        text
  role        text CHECK ('admin' | 'cashier')
  created_at  timestamptz
  deleted_at  timestamptz (nullable)
```

### Exchange Rates
```
exchange_rates
  id          uuid PK
  store_id    uuid FK → stores
  currency    text CHECK ('USD' | 'COP' | 'VES')
  rate_exchange numeric(12,4)  -- how many of X = 1 COP
  updated_at  timestamptz
  updated_by  text
  UNIQUE(store_id, currency)
```

### Categories
```
categories
  id          uuid PK
  store_id    uuid FK → stores
  name        text
  description text
  created_at  timestamptz
```

### Products
```
products
  id               uuid PK
  store_id         uuid FK → stores
  sku              text (unique per store)
  name             text
  description      text
  category_id      uuid FK → categories
  unit             text ('unidad','metro','kg','litro','bolsa','caja','saco','barra','lamina','rollo','galon','pieza')
  cost             numeric(12,2)       -- purchase cost in COP
  retail_price     numeric(12,2)       -- retail unit price in COP
  wholesale_price  numeric(12,2)       -- wholesale price in COP
  current_stock    integer DEFAULT 0
  min_stock        integer DEFAULT 0
  is_active        boolean DEFAULT true
  created_at       timestamptz
  updated_at       timestamptz
  deleted_at       timestamptz (nullable)
  UNIQUE(store_id, sku)
```

### Suppliers
```
suppliers
  id          uuid PK
  store_id    uuid FK → stores
  name        text
  phone       text
  email       text
  address     text
  notes       text
  created_at  timestamptz
```

### Purchase Orders
```
purchase_orders
  id           uuid PK
  store_id     uuid FK → stores
  supplier_id  uuid FK → suppliers
  status       text CHECK ('pending'|'received'|'cancelled')
  total        numeric(12,2)
  notes        text
  created_at   timestamptz
  created_by   text
```

### Purchase Order Items
```
purchase_order_items
  id          uuid PK
  order_id    uuid FK → purchase_orders
  product_id  uuid FK → products
  quantity    integer
  unit_cost   numeric(12,2)
  total       numeric(12,2)
```

### Customers
```
customers
  id            uuid PK
  store_id      uuid FK → stores
  name          text
  phone         text
  address       text
  notes         text
  credit_limit  numeric(12,2) DEFAULT 0  -- in COP
  balance       numeric(12,2) DEFAULT 0  -- money owed in COP
  created_at    timestamptz
```

### Payment Methods
```
payment_methods
  id        uuid PK
  store_id  uuid FK → stores
  name      text
  currency  text CHECK ('USD'|'COP'|'VES')
  is_active boolean DEFAULT true
  created_at timestamptz
```

### Sales
```
sales
  id              uuid PK
  store_id        uuid FK → stores
  customer_id     uuid FK → customers (nullable)
  customer_name   text
  subtotal        numeric(12,2)
  discount        numeric(12,2) DEFAULT 0
  tax             numeric(12,2) DEFAULT 0
  total           numeric(12,2)
  payment_method  text
  currency_paid   text CHECK ('USD'|'COP'|'VES')
  exchange_rate   numeric(12,4)
  amount_paid     numeric(12,2)
  is_estimate     boolean DEFAULT false
  estimate_number text (unique per store)
  status          text CHECK ('pending'|'completed'|'cancelled')
  paid           boolean DEFAULT false
  created_at      timestamptz
  created_by      text
```

### Sale Items
```
sale_items
  id           uuid PK
  sale_id      uuid FK → sales
  product_id   uuid FK → products
  product_name text  -- snapshot at sale time
  quantity     integer
  unit_price   numeric(12,2)
  cost         numeric(12,2)
  is_wholesale boolean DEFAULT false
  total        numeric(12,2)
```

### Stock Movements
```
stock_movements
  id               uuid PK
  store_id         uuid FK → stores
  product_id       uuid FK → products
  type             text CHECK ('entry'|'exit'|'adjustment')
  quantity         integer
  previous_quantity integer
  new_quantity     integer
  reason           text
  reference_type  text (nullable)  -- 'sale'|'purchase_order'|'adjustment'|'initial'
  reference_id    uuid (nullable)
  created_at      timestamptz
  created_by       text
```

### Expenses
```
expenses
  id          uuid PK
  store_id    uuid FK → stores
  category    text ('Alquiler'|'Servicios'|'Nómina'|'Transporte'|'Mantenimiento'|'Publicidad'|'Otro')
  description text
  amount      numeric(12,2) -- in COP
  date        date
  created_at  timestamptz
  created_by  text
```

## Role-Based Access Control

| Module | Admin | Cajero (Cashier) |
|--------|-------|-------------------|
| Dashboard | Full access | Limited (own sales today) |
| POS (Ventas) | Full access | Full access |
| Estimates (Cotizaciones) | Full access | Create + print |
| Products | CRUD | Read-only |
| Inventory | CRUD + stock movements | No access |
| Sales Reports | Full access | Own sales only |
| Customers | CRUD | Read-only |
| Suppliers | CRUD | No access |
| Expenses | CRUD | No access |
| Settings | Full access | No access |

## Frontend Pages

### /login
- Email/password login via Supabase Auth
- Redirect to /dashboard on success

### /dashboard
- KPI cards: ventas del día, ganancias, transacciones, bajo stock
- Recent sales list
- Low stock alerts
- Charts: ventas por día (7 días), top 5 products

### /pos
- Product search by name/SKU (responsive grid)
- Cart with quantity controls, wholesale/retail toggle, currency selection
- Customer selection (optional)
- Payment method + currency selection
- Discount field
- "Cobrar" → complete sale (deducts stock)
- "Cotizar" → save as estimate + open print view
- Mobile: full-screen cart overlay; Desktop: side panel

### /estimates
- List of saved estimates (number, date, customer, total, status)
- Actions: view, print, convert to sale, cancel
- Filter by date range
- Print triggers `window.print()` with print-specific CSS

### /products
- Product CRUD (admin only for create/edit/delete)
- Category filter + search
- Mobile: card layout; Desktop: table layout
- Dual pricing: retail + wholesale
- SKU field for quick lookup
- Units: unidad, metro, kg, litro, bolsa, caja, saco, barra, lamina, rollo, galon, pieza
- Current stock table with filters
- Stock movement dialog (entry/exit/adjustment)
- Movement history tab
- Low stock alerts

### /sales
- Sales list with filters (date range, payment method, status)
- Sale detail view
- Tabs: General, Por Producto, Por Método de Pago, Tendencia

### /customers
- Customer CRUD (admin full, cashier read)
- Purchase history per customer
- Account balance (credit) display
- Mobile: card layout; Desktop: table layout

### /suppliers
- Supplier CRUD (admin only)
- Purchase orders per supplier
- Contact info

### /expenses
- Expense CRUD (admin only)
- Categories: Alquiler, Servicios, Nómina, Transporte, Mantenimiento, Publicidad, Otro
- Monthly summary chart

### /settings
- Store info (name, address, phone, email)
- Payment methods management
- Exchange rates (USD, COP, VES) — manual update
- User management (admin only)

## Project Structure

```
ferreteria/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthContext.tsx
│   │   ├── ui/
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   └── tabs.tsx
│   │   ├── Layout.tsx         (mobile-responsive sidebar + topbar)
│   │   ├── Sidebar.tsx        (collapsible, mobile overlay)
│   │   ├── Topbar.tsx         (hamburger menu on mobile)
│   │   └── PrintableEstimate.tsx  (print-optimized estimate view)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── POS.tsx
│   │   ├── Estimates.tsx
│   │   ├── Products.tsx
│   │   ├── Inventory.tsx
│   │   ├── Sales.tsx
│   │   ├── Customers.tsx
│   │   ├── Suppliers.tsx
│   │   ├── Expenses.tsx
│   │   └── Settings.tsx
│   ├── interfaces/
│   │   ├── data/
│   │   │   ├── Store.ts
│   │   │   ├── Profile.ts
│   │   │   ├── Product.ts
│   │   │   ├── Category.ts
│   │   │   ├── Supplier.ts
│   │   │   ├── PurchaseOrder.ts
│   │   │   ├── Customer.ts
│   │   │   ├── Sale.ts
│   │   │   ├── StockMovement.ts
│   │   │   ├── Expense.ts
│   │   │   ├── PaymentMethod.ts
│   │   │   └── ExchangeRate.ts
│   │   └── view/
│   │       └── MenuItem.ts
│   │   └── viewModel/
│   │       └── Dashboard.ts
│   ├── hooks/
│   │   └── useCurrency.tsx    (currency conversion context)
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css              (Tailwind v4 + dark theme + print styles)
│   └── Utils.functions.ts     (formatAmount, formatCurrency, convertCurrency, constants)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  (all tables, RLS, RPC functions)
├── .env.example
├── .gitignore
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── PROJECT_PLAN.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
└── vite.config.ts
```

## Key RPC Functions (Supabase)

| Function | Purpose |
|----------|---------|
| `get_store_settings(userid)` | Returns store row for the authenticated user |
| `get_date_sales_summary(storeid, filterdate)` | Daily sales aggregates |
| `get_stock_movements(storeid)` | Stock movement history |
| `create_sale(...)` | Creates sale + items + deducts stock |
| `get_monthly_sales(storeid)` | Monthly revenue/profit trend |

## Implementation Order

| Phase | Module | Description |
|-------|--------|-------------|
| 1 | Scaffold | Vite + React project, Tailwind, shadcn, Supabase client, Vercel config, env setup |
| 2 | Auth | Login page, AuthContext, Supabase auth, role-based routing |
| 3 | Database | Supabase migrations, tables, RLS policies, RPC functions |
| 4 | Products | Product catalog CRUD, categories, SKU, dual pricing, stock movements, low stock alerts |
| 5 | POS | Sale creation, cart, payment methods, currency selection, stock deduction on completion |
| 6 | Estimates | Estimate creation from POS, printable HTML view, estimate list, convert to sale |
| 7 | Customers | Customer CRUD, purchase history, credit tracking |
| 8 | Dashboard | KPI cards, charts, daily/monthly trends, low stock alerts |
| 9 | Sales Reports | Sales list, filters, product breakdown, payment method breakdown |
| 10 | Expenses | Expense CRUD, monthly summary, category chart |
| 11 | Settings | Store config, payment methods, exchange rates (USD/COP/VES), user management |
| 12 | Polish | Mobile responsiveness refinement, error handling, loading states, toast notifications |
| 13 | Deploy | Vercel deployment, env variables, production Supabase, testing |

## Sidebar Navigation

```
Inicio          → /dashboard       (BarChart3 icon)
Ventas (POS)    → /pos             (ShoppingCart icon)
Cotizaciones    → /estimates       (FileText icon)
Productos       → /products         (Package icon)
Inventario      → /inventory        (Warehouse icon)
Reportes        → /sales             (DollarSign icon)
Clientes        → /customers         (Users icon)
Proveedores     → /suppliers         (Truck icon)
Gastos          → /expenses           (Receipt icon)
Configuración   → /settings          (Settings icon)
```

**Cashier sees only:** Inicio, Ventas, Cotizaciones, Productos (read-only), Clientes (read-only)

## Environment Variables

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Deployment (Vercel)

1. Connect repo to Vercel
2. Set environment variables in Vercel dashboard
3. Build command: `npm run build`
4. Output directory: `dist`
5. Redirects configured in `vercel.json` for SPA routing

## Notes

- All monetary values stored in **COP** as `numeric(12,2)`
- Currency conversion happens at display time and at time of payment
- Estimates (`is_estimate = true`) do NOT deduct stock
- Converting an estimate to sale creates new sale record + deducts stock
- Mobile-first: all pages work on phones first, then enhanced for larger screens
- Print-friendly estimate layout using `@media print` CSS
- RLS policies ensure users can only see data from their own store