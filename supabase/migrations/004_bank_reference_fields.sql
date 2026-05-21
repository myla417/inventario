-- Add bank reference fields to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS bank_reference TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS bank_reference_name TEXT;

-- Update create_sale function to accept bank reference parameters
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
  p_items JSONB,
  p_bank_reference TEXT DEFAULT NULL,
  p_bank_reference_name TEXT DEFAULT NULL
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

    IF p_payment_method = 'A credito' AND EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id
      AND credit_limit > 0
      AND (balance + p_total) > credit_limit) THEN
        RAISE EXCEPTION 'Esta compra excede el limite del cliente';
    END IF;

    UPDATE customers
    SET balance = balance + p_total
    WHERE id = p_customer_id;
  END IF;
  INSERT INTO sales (store_id, customer_id, customer_name, subtotal, discount, tax, total,
    payment_method, currency_paid, exchange_rate, amount_paid, is_estimate, estimate_number, created_by,
    bank_reference, bank_reference_name, status)
  VALUES (p_store_id, p_customer_id, p_customer_name, p_subtotal, p_discount, p_tax, p_total,
    p_payment_method, p_currency_paid, p_exchange_rate, p_amount_paid, p_is_estimate, p_estimate_number, public.username(),
    p_bank_reference, p_bank_reference_name, CASE WHEN p_is_estimate THEN 'pending' ELSE 'completed' END)
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