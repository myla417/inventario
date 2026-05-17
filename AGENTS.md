# AGENTS.md

## Project Overview
Concreto - Inventory & POS for a hardware store. UI in Spanish. Mobile-first dark theme.

## Tech Stack
- React 19 + TypeScript + Vite 6
- Tailwind CSS v4 + shadcn/ui (Radix primitives)
- React Router v7
- Supabase (Auth + PostgreSQL + RLS + RPC)
- Recharts, Lucide React, html2canvas

## Commands
- `npm run dev` - Dev server
- `npm run build` - Type-check + build
- `npm run lint` - ESLint
- `npm run preview` - Preview production build

## Architecture
- `src/pages/` - Route components (Dashboard, POS, Products and Inventory, Sales, Customers, Expenses, Settings, Login, Estimates)
- `src/components/ui/` - shadcn/ui primitives (do not edit)
- `src/components/` - Layout, Sidebar, Topbar, AuthContext, PrintableEstimate
- `src/interfaces/data/` - TypeScript types matching DB schema
- `src/interfaces/view/` - View model types (MenuItem)
- `src/interfaces/viewModel/` - View model types (Dashboard)
- `src/hooks/` - Custom hooks (useCurrency)
- `src/lib/` - Supabase client, utils
- `src/Utils.functions.ts` - formatAmount, formatCurrency, convertCurrency, constants
- `supabase/migrations/` - SQL schema with RLS + RPC functions

## Key Conventions
- All monetary values stored in COP (`numeric(12,2)`)
- Currency display supports USD, COP, VES via manually-set exchange rates
- Dark theme only — primary: `#FCC90F` (yellow), background: near-black (oklch 0.08)
- Mobile-first: cards on mobile, tables on desktop
- RLS enforced per store — users only see their own store's data
- Estimates (`is_estimate = true`) do NOT deduct stock
- Estimates printed via html2canvas + window.print() (PrintableEstimate.tsx)
- Soft deletes use `deleted_at` column
- All UI text in Spanish
- **Prevent double-click on save/create**: Use a `saving` state boolean per action (e.g. `const [savingStore, setSavingStore] = useState(false)`). Check `if (savingX) return` at start, set `true` before await, reset in finally/after error. Disable button with `{saving ? 'Guardando...' : 'Guardar'}`.

## RBAC
- **Admin**: full access to all modules
- **Cajero (Cashier)**: POS, Estimates (create/print), Products (read), Customers (read), Dashboard (limited)

## Supabase RPC Functions
- `get_store_settings(userid)` - Returns store row for authenticated user
- `get_products(storeid)` - Returns products with category name
- `get_date_sales_summary(storeid, filterdate)` - Daily sales aggregates
- `get_stock_movements(storeid)` - Stock movement history
- `create_sale(...)` - Creates sale + items, deducts stock (except estimates)
- `delete_product(productid)` - Soft deletes a product

## Key Implementation Notes
- Estimates flow: POS "Cotizar" → saves with `is_estimate=true`, prints via html2canvas
- Converting estimate to sale creates new sale record + deducts stock
- `public.store_id()` and `public.username()` helper functions used in RLS policies
- Vercel deployment with SPA routing rewrites in `vercel.json`
- `@/` alias maps to `./src/`