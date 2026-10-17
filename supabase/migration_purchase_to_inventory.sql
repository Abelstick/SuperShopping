-- Lo que se compra suma al inventario.
--
-- 1) Al pasar una shopping_session a 'completed', cada purchase_item con
--    product_id suma su cantidad a products.current_quantity (una sola vez:
--    el trigger solo dispara en la transición hacia 'completed').
-- 2) Si después se edita o elimina un purchase_item de una sesión ya
--    completada, el stock se corrige con la diferencia (nunca baja de 0).
--
-- Reglas:
--   * Solo suma si la unidad del ítem coincide con la del producto; si no,
--     no se toca el stock (evita sumar 500 g a un producto en kg).
--   * Cada cambio queda en product_history (action = 'quantity_changed').
--   * No hay backfill: las compras ya finalizadas no se aplican, porque el
--     stock actual ya pudo haberse corregido a mano.
--
-- Ejecutar una vez en el SQL Editor de Supabase.

-- ---------------------------------------------------------------------------
-- Helper: aplica un delta al stock de un producto y deja rastro en el historial
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_product_stock_delta(
  p_product_id UUID,
  p_item_unit  TEXT,
  p_delta      NUMERIC,
  p_user_id    UUID,
  p_origin     TEXT
) RETURNS VOID AS $$
DECLARE
  v_workspace UUID;
  v_old       NUMERIC;
  v_new       NUMERIC;
BEGIN
  IF p_product_id IS NULL OR p_delta IS NULL OR p_delta = 0 THEN RETURN; END IF;

  SELECT workspace_id, current_quantity
    INTO v_workspace, v_old
    FROM products
   WHERE id = p_product_id
     AND lower(trim(COALESCE(unit, 'unidad'))) = lower(trim(COALESCE(p_item_unit, 'unidad')))
   FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  v_old := COALESCE(v_old, 0);
  v_new := GREATEST(0, v_old + p_delta);

  UPDATE products
     SET current_quantity = v_new, updated_at = NOW()
   WHERE id = p_product_id;

  IF p_user_id IS NOT NULL AND v_new <> v_old THEN
    INSERT INTO product_history (product_id, workspace_id, user_id, action, changes)
    VALUES (
      p_product_id, v_workspace, p_user_id, 'quantity_changed',
      jsonb_build_object('cantidad', v_old || ' → ' || v_new, 'origen', p_origin)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Solo los triggers de abajo deben poder llamarla; nunca el cliente vía RPC.
REVOKE ALL ON FUNCTION apply_product_stock_delta(UUID, TEXT, NUMERIC, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Sesión completada -> sumar lo comprado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_session_purchases_to_inventory() RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT product_id, COALESCE(unit, 'unidad') AS unit, SUM(COALESCE(quantity, 0)) AS qty
      FROM purchase_items
     WHERE session_id = NEW.id AND product_id IS NOT NULL
     GROUP BY product_id, COALESCE(unit, 'unidad')
  LOOP
    PERFORM apply_product_stock_delta(
      r.product_id, r.unit, r.qty,
      COALESCE(auth.uid(), NEW.created_by),
      'Compra finalizada'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_session_completed_update_inventory ON shopping_sessions;
CREATE TRIGGER on_session_completed_update_inventory
  AFTER UPDATE OF status ON shopping_sessions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION add_session_purchases_to_inventory();

-- ---------------------------------------------------------------------------
-- 2) Ítem editado/eliminado en una compra ya finalizada -> corregir el stock
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_purchase_item_inventory() RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM shopping_sessions WHERE id = OLD.session_id;
  IF v_status IS DISTINCT FROM 'completed' THEN
    RETURN NULL; -- AFTER trigger: el valor de retorno se ignora
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM apply_product_stock_delta(
      OLD.product_id, OLD.unit, -COALESCE(OLD.quantity, 0),
      COALESCE(auth.uid(), OLD.purchased_by), 'Ítem de compra eliminado'
    );
    RETURN OLD;
  END IF;

  -- UPDATE: revertir lo anterior y aplicar lo nuevo (cubre cambio de cantidad,
  -- de unidad y de producto vinculado)
  IF OLD.product_id IS DISTINCT FROM NEW.product_id
     OR OLD.quantity IS DISTINCT FROM NEW.quantity
     OR OLD.unit IS DISTINCT FROM NEW.unit THEN
    PERFORM apply_product_stock_delta(
      OLD.product_id, OLD.unit, -COALESCE(OLD.quantity, 0),
      COALESCE(auth.uid(), OLD.purchased_by), 'Ítem de compra editado'
    );
    PERFORM apply_product_stock_delta(
      NEW.product_id, NEW.unit, COALESCE(NEW.quantity, 0),
      COALESCE(auth.uid(), NEW.purchased_by), 'Ítem de compra editado'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_purchase_item_updated_sync_inventory ON purchase_items;
CREATE TRIGGER on_purchase_item_updated_sync_inventory
  AFTER UPDATE ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_purchase_item_inventory();

DROP TRIGGER IF EXISTS on_purchase_item_deleted_sync_inventory ON purchase_items;
CREATE TRIGGER on_purchase_item_deleted_sync_inventory
  AFTER DELETE ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_purchase_item_inventory();
