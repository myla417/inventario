-- Delete sale and revert stock (for admin error/cashback cases)
CREATE OR REPLACE FUNCTION delete_sale(p_sale_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
BEGIN
  -- Get sale info
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  -- Cannot delete estimates
  IF v_sale.is_estimate THEN
    RAISE EXCEPTION 'No se pueden eliminar cotizaciones';
  END IF;

  -- Restore stock for each item
  FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    -- Restore stock
    UPDATE products
    SET current_stock = current_stock + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;

    -- Create entry stock movement (reverting the exit from sale)
    INSERT INTO stock_movements (store_id, product_id, type, quantity, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
    SELECT v_sale.store_id, v_item.product_id, 'entry', v_item.quantity,
        (SELECT current_stock - v_item.quantity FROM products WHERE id = v_item.product_id),
        (SELECT current_stock FROM products WHERE id = v_item.product_id),
        'Reverso de venta',
        'sale', p_sale_id, public.username();
  END LOOP;

  -- Delete sale items
  DELETE FROM sale_items WHERE sale_id = p_sale_id;

  -- Delete sale
  DELETE FROM sales WHERE id = p_sale_id;

  RETURN TRUE;
END;
$$;