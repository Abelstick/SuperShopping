-- Reservas que no quedan huérfanas y hogares que sobreviven a la cuenta del propietario.
--
-- Ejecutar una vez en el SQL Editor de Supabase, DESPUÉS de migration_collaboration.sql.
-- Es una sola transacción: si algo falla, no cambia nada.
--
-- 1) Reservas de Modo Compra (product_locks)
--    * Cada dispositivo en Modo Compra marca su presencia (touch_shopping_presence) cada ~45 s.
--    * Una reserva queda libre si quien la tiene lleva más de 2 minutos sin presencia, ya no es
--      miembro con permiso de edición, o lo quitaron del hogar. Se toma con claim_product_lock.
--    * Las reservas se borran solas al agregar el producto al carrito y al terminar la compra.
--
-- 2) Si se elimina la cuenta del propietario, cada hogar suyo pasa al administrador más antiguo
--    (si no hay, al editor más antiguo y luego al lector). Solo si no queda nadie se elimina.
--    Para que eliminar una cuenta sea posible, las columnas de autoría ("creado por", "comprado
--    por", historial) pasan a NULL en vez de impedir el borrado.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Presencia y reservas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_shopping_presence(p_session_id UUID)
RETURNS VOID LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  UPDATE shopping_participants
     SET last_seen_at = NOW()
   WHERE session_id = p_session_id AND user_id = auth.uid();
$$;

-- ¿La reserva sigue en manos de alguien activo con permiso de edición?
CREATE OR REPLACE FUNCTION is_lock_active(p_lock product_locks)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM shopping_sessions ss
      JOIN shopping_participants sp ON sp.session_id = ss.id AND sp.user_id = p_lock.user_id
     WHERE ss.id = p_lock.session_id
       AND ss.status = 'active'
       AND sp.last_seen_at > NOW() - INTERVAL '2 minutes'
       AND get_workspace_role(ss.workspace_id, p_lock.user_id) IN ('owner', 'admin', 'editor')
  );
$$;

-- Reserva un producto del presupuesto para el usuario actual. Si la reserva existente está
-- abandonada, la reemplaza; si otra persona activa la tiene, falla con 55P03.
CREATE OR REPLACE FUNCTION claim_product_lock(p_session_id UUID, p_budget_item_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session shopping_sessions%ROWTYPE;
  v_lock    product_locks%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM shopping_sessions WHERE id = p_session_id;
  IF NOT FOUND OR NOT can_edit_workspace(v_session.workspace_id) THEN
    RAISE EXCEPTION 'No puedes reservar productos en esta compra' USING ERRCODE = '42501';
  END IF;
  IF v_session.status <> 'active' THEN
    RAISE EXCEPTION 'Esta compra ya terminó' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM budget_items WHERE id = p_budget_item_id AND budget_id = v_session.budget_id) THEN
    RAISE EXCEPTION 'El producto no es de esta compra' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_lock FROM product_locks
   WHERE session_id = p_session_id AND budget_item_id = p_budget_item_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_lock.user_id = auth.uid() THEN RETURN; END IF;
    IF is_lock_active(v_lock) THEN
      RAISE EXCEPTION 'Otra persona lo está comprando' USING ERRCODE = '55P03';
    END IF;
    DELETE FROM product_locks WHERE id = v_lock.id;
  END IF;

  BEGIN
    INSERT INTO product_locks (session_id, budget_item_id, user_id)
    VALUES (p_session_id, p_budget_item_id, auth.uid());
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Otra persona lo está comprando' USING ERRCODE = '55P03';
  END;
END;
$$;

REVOKE ALL ON FUNCTION touch_shopping_presence(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION claim_product_lock(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION is_lock_active(product_locks) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION touch_shopping_presence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_product_lock(UUID, UUID) TO authenticated;

-- Producto agregado al carrito: su reserva ya no hace falta
CREATE OR REPLACE FUNCTION release_lock_on_purchase_item() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.session_id IS NOT NULL AND NEW.budget_item_id IS NOT NULL THEN
    DELETE FROM product_locks WHERE session_id = NEW.session_id AND budget_item_id = NEW.budget_item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_purchase_item_release_lock ON purchase_items;
CREATE TRIGGER on_purchase_item_release_lock
  AFTER INSERT ON purchase_items
  FOR EACH ROW EXECUTE FUNCTION release_lock_on_purchase_item();

-- Compra terminada o cancelada: se liberan todas sus reservas
CREATE OR REPLACE FUNCTION release_locks_on_session_end() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM product_locks WHERE session_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_end_release_locks ON shopping_sessions;
CREATE TRIGGER on_session_end_release_locks
  AFTER UPDATE OF status ON shopping_sessions
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status <> 'active')
  EXECUTE FUNCTION release_locks_on_session_end();

-- Miembro quitado del hogar o pasado a Lector: se liberan sus reservas en ese hogar
CREATE OR REPLACE FUNCTION release_locks_on_member_change() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' OR NEW.role = 'viewer' THEN
    DELETE FROM product_locks pl
     USING shopping_sessions ss
     WHERE pl.session_id = ss.id
       AND ss.workspace_id = OLD.workspace_id
       AND pl.user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_member_change_release_locks ON workspace_members;
CREATE TRIGGER on_member_change_release_locks
  AFTER DELETE OR UPDATE OF role ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION release_locks_on_member_change();

-- Limpieza inicial: reservas de compras que ya no están activas
DELETE FROM product_locks pl
 USING shopping_sessions ss
 WHERE pl.session_id = ss.id AND ss.status <> 'active';

-- ---------------------------------------------------------------------------
-- 2) Columnas de autoría: NULL al eliminar la cuenta, en vez de bloquear el borrado
-- ---------------------------------------------------------------------------
-- Se reemplaza cualquier FK de esas columnas hacia profiles o auth.users, sea cual sea su
-- nombre, por una a profiles con ON DELETE SET NULL. Se conserva el nombre por defecto
-- (<tabla>_<columna>_fkey), que es el que usa la app en los embeds de PostgREST.
DO $$
DECLARE
  r RECORD;
  c RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('product_history',       'user_id'),
      ('activity_logs',         'user_id'),
      ('workspace_invitations', 'invited_by'),
      ('products',              'created_by'),
      ('budgets',               'created_by'),
      ('shopping_sessions',     'created_by'),
      ('purchases',             'executed_by'),
      ('purchase_items',        'purchased_by')
    ) AS t(tbl, col)
  LOOP
    FOR c IN
      SELECT con.conname
        FROM pg_constraint con
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
       WHERE con.contype = 'f'
         AND con.conrelid = format('public.%I', r.tbl)::regclass
         AND con.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
         AND a.attname = r.col
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, c.conname);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL',
      r.tbl, r.tbl || '_' || r.col || '_fkey', r.col
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Traspaso automático de los hogares del propietario que elimina su cuenta
-- ---------------------------------------------------------------------------
-- Corre antes del borrado del perfil (que llega en cascada desde auth.users). Al cambiar
-- owner_id antes, el ON DELETE CASCADE de workspaces.owner_id ya no alcanza a esos hogares.
CREATE OR REPLACE FUNCTION hand_over_owned_workspaces() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w      RECORD;
  v_heir UUID;
BEGIN
  FOR w IN SELECT id FROM workspaces WHERE owner_id = OLD.id LOOP
    SELECT user_id INTO v_heir
      FROM workspace_members
     WHERE workspace_id = w.id AND user_id <> OLD.id
     ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, joined_at, id
     LIMIT 1;

    -- Sin más miembros: el hogar se elimina junto con la cuenta
    CONTINUE WHEN v_heir IS NULL;

    -- Primero se libera el rol de propietario (índice: un solo propietario por hogar)
    UPDATE workspace_members SET role = 'admin' WHERE workspace_id = w.id AND user_id = OLD.id;
    UPDATE workspace_members SET role = 'owner' WHERE workspace_id = w.id AND user_id = v_heir;
    UPDATE workspaces SET owner_id = v_heir, updated_at = NOW() WHERE id = w.id;
  END LOOP;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS before_profile_delete_hand_over ON profiles;
CREATE TRIGGER before_profile_delete_hand_over
  BEFORE DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION hand_over_owned_workspaces();

COMMIT;
