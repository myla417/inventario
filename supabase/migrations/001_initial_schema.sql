-- Concreto - Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STORES
-- ============================================
CREATE TABLE stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- EXCHANGE RATES
-- ============================================
CREATE TABLE exchange_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'COP', 'VES')),
  rate_exchange NUMERIC(12,4) NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT NOT NULL,
  UNIQUE(store_id, currency)
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id UUID REFERENCES categories(id),
  unit TEXT NOT NULL DEFAULT 'unidad',
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  retail_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(store_id, sku)
);

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PURCHASE ORDERS
-- ============================================
CREATE TABLE purchase_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- ============================================
-- PURCHASE ORDER ITEMS
-- ============================================
CREATE TABLE purchase_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENT METHODS
-- ============================================
CREATE TABLE payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('USD', 'COP', 'VES')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SALES
-- ============================================
CREATE TABLE sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT DEFAULT '',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT '',
  currency_paid TEXT NOT NULL DEFAULT 'COP' CHECK (currency_paid IN ('USD', 'COP', 'VES')),
  exchange_rate NUMERIC(12,4) NOT NULL DEFAULT 1,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_estimate BOOLEAN NOT NULL DEFAULT FALSE,
  estimate_number TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  paid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- ============================================
-- SALE ITEMS
-- ============================================
CREATE TABLE sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_wholesale BOOLEAN DEFAULT FALSE,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ============================================
-- STOCK MOVEMENTS
-- ============================================
CREATE TABLE stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity INTEGER NOT NULL DEFAULT 0,
  reason TEXT DEFAULT '',
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- ============================================
-- EXPENSES
-- ============================================
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otro',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_customers_store_id ON customers(store_id);
CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_expenses_store_id ON expenses(store_id);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Get store settings for a user
CREATE OR REPLACE FUNCTION get_store_settings(userid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT store_id INTO v_store_id FROM profiles WHERE user_id = userid AND deleted_at IS NULL LIMIT 1;
  RETURN QUERY SELECT s.id, s.name, s.address, s.phone, s.email, s.description
  FROM stores s WHERE s.id = v_store_id;
END;
$$;

-- Soft delete a product
CREATE OR REPLACE FUNCTION delete_product(productid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products SET deleted_at = NOW(), is_active = FALSE WHERE id = productid;
END;
$$;

-- Create a sale with stock deduction
CREATE OR REPLACE FUNCTION create_sale(
  p_store_id UUID,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_subtotal NUMERIC,
  p_discount NUMERIC,
  p_tax NUMERIC,
  p_total NUMERIC,
  p_payment_method TEXT,
  p_currency_paid TEXT,
  p_exchange_rate NUMERIC,
  p_amount_paid NUMERIC,
  p_is_estimate BOOLEAN,
  p_estimate_number TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_insufficient_stock TEXT;
BEGIN
  -- Validate stock for all items before inserting anything
  IF NOT p_is_estimate THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      IF (SELECT current_stock FROM products WHERE id = (v_item->>'product_id')::UUID) < (v_item->>'quantity')::INTEGER THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto: %', v_item->>'product_name';
      END IF;
    END LOOP;
  END IF;
  INSERT INTO sales (store_id, customer_id, customer_name, subtotal, discount, tax, total,
    payment_method, currency_paid, exchange_rate, amount_paid, is_estimate, estimate_number, created_by)
  VALUES (p_store_id, p_customer_id, p_customer_name, p_subtotal, p_discount, p_tax, p_total,
    p_payment_method, p_currency_paid, p_exchange_rate, p_amount_paid, p_is_estimate, p_estimate_number, public.username())
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, cost, is_wholesale, total)
    VALUES (v_sale_id, (v_item->>'product_id')::UUID, v_item->>'product_name',
      (v_item->>'quantity')::INTEGER, (v_item->>'unit_price')::NUMERIC,
      (v_item->>'cost')::NUMERIC, (v_item->>'is_wholesale')::BOOLEAN, (v_item->>'total')::NUMERIC);

    -- Deduct stock only for completed sales (not estimates)
    IF NOT p_is_estimate THEN
      UPDATE products SET current_stock = current_stock - (v_item->>'quantity')::INTEGER,
        updated_at = NOW()
      WHERE id = (v_item->>'product_id')::UUID;

      INSERT INTO stock_movements (store_id, product_id, type, quantity, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
      SELECT p_store_id, (v_item->>'product_id')::UUID, 'exit', (v_item->>'quantity')::INTEGER,
        p.current_stock, p.current_stock - (v_item->>'quantity')::INTEGER, 'Venta',
        'sale', v_sale_id, public.username()
      FROM products p WHERE p.id = (v_item->>'product_id')::UUID;
    END IF;
  END LOOP;

  RETURN v_sale_id;
END;
$$;

-- Get products with category name
CREATE OR REPLACE FUNCTION get_products(storeid UUID)
RETURNS TABLE (
  id UUID,
  store_id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  category_id UUID,
  unit TEXT,
  cost NUMERIC,
  retail_price NUMERIC,
  wholesale_price NUMERIC,
  current_stock INTEGER,
  min_stock INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  category_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.store_id, p.sku, p.name, p.description, p.category_id, p.unit,
    p.cost, p.retail_price, p.wholesale_price, p.current_stock, p.min_stock,
    p.is_active, p.created_at, p.updated_at, p.deleted_at,
    COALESCE(c.name, '') as category_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.store_id = storeid AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

-- Get date sales summary
CREATE OR REPLACE FUNCTION get_date_sales_summary(storeid UUID, filterdate TEXT)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  date TIMESTAMPTZ,
  total NUMERIC,
  profit NUMERIC,
  revenue NUMERIC,
  orders BIGINT,
  paymentMethod TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.customer_name, s.created_at as date, s.total,
    SUM((si.unit_price - si.cost) * si.quantity) as profit,
    s.subtotal as revenue, COUNT(*) as orders, s.payment_method as "paymentMethod"
  FROM sales s
  JOIN sale_items si ON s.id = si.sale_id
  WHERE s.store_id = storeid AND s.is_estimate = FALSE AND s.status = 'completed'
    AND s.created_at >= filterdate::TIMESTAMPTZ
  GROUP BY s.id
  ORDER BY s.created_at DESC;
END;
$$;

-- Get stock movements for a store
CREATE OR REPLACE FUNCTION get_stock_movements(storeid UUID)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name TEXT,
  type TEXT,
  quantity INTEGER,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  reason TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ,
  created_by TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT sm.id, sm.product_id, p.name as product_name, sm.type, sm.quantity,
    sm.previous_quantity, sm.new_quantity, sm.reason, sm.reference_type,
    sm.reference_id, sm.created_at, sm.created_by
  FROM stock_movements sm
  JOIN products p ON sm.product_id = p.id
  WHERE sm.store_id = storeid
  ORDER BY sm.created_at DESC;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's store_id
/*CREATE OR REPLACE FUNCTION auth.store_id()
RETURNS UUID
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT store_id INTO v_store_id FROM profiles WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
  RETURN v_store_id;
END;
$$;*/
CREATE OR REPLACE FUNCTION public.store_id()
RETURNS uuid
LANGUAGE plpgsql STABLE
SECURITY definer
SET search_path = ''
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  SELECT store_id
    INTO v_store_id
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN v_store_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.username()
RETURNS text
LANGUAGE plpgsql STABLE
SECURITY definer
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT name
    INTO v_name
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN v_name;
END;
$$;

-- RLS Policies: users can only see data from their own store
CREATE POLICY "Users can view own store" ON stores FOR SELECT USING (id = public.store_id());
CREATE POLICY "Store owner can update store" ON stores FOR UPDATE USING (id = public.store_id());

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own exchange rates" ON exchange_rates FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Admin can manage exchange rates" ON exchange_rates FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Admin can manage categories" ON categories FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own products" ON products FOR SELECT USING (store_id = public.store_id() AND deleted_at IS NULL);
CREATE POLICY "Admin can manage products" ON products FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own suppliers" ON suppliers FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Admin can manage suppliers" ON suppliers FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own purchase orders" ON purchase_orders FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Admin can manage purchase orders" ON purchase_orders FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own purchase order items" ON purchase_order_items FOR SELECT USING (order_id IN (SELECT id FROM purchase_orders WHERE store_id = public.store_id()));

CREATE POLICY "Users can view own customers" ON customers FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Users can manage customers" ON customers FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own payment methods" ON payment_methods FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Admin can manage payment methods" ON payment_methods FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own sales" ON sales FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Users can manage sales" ON sales FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own sale items" ON sale_items FOR SELECT USING (sale_id IN (SELECT id FROM sales WHERE store_id = public.store_id()));
CREATE POLICY "Users can manage sale items" ON sale_items FOR ALL USING (sale_id IN (SELECT id FROM sales WHERE store_id = public.store_id()));

CREATE POLICY "Users can view own stock movements" ON stock_movements FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Users can manage stock movements" ON stock_movements FOR ALL USING (store_id = public.store_id());

CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (store_id = public.store_id());
CREATE POLICY "Admin can manage expenses" ON expenses FOR ALL USING (store_id = public.store_id());