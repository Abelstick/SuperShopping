-- Hogares colaborativos: rol Administrador, invitaciones que funcionan y permisos coherentes.
--
-- Ejecutar una vez en el SQL Editor de Supabase, DESPUÉS de schema.sql, fix_rls.sql y las
-- demás migraciones. Es una sola transacción: si algo falla, no cambia nada.
--
-- Roles:
--   owner  (Propietario)    uno por hogar. Todo lo de admin + eliminar el hogar y transferir la propiedad.
--   admin  (Administrador)  edita el hogar, invita, cambia roles, quita miembros y elimina contenido.
--   editor (Editor)         gestiona inventario, presupuestos y compras; no elimina contenido del hogar.
--   viewer (Lector)         solo lectura.
--
-- Nota: si en la base en vivo creaste políticas a mano con otros nombres, siguen activas y se
-- combinan con estas (Postgres permite la acción si CUALQUIER política la permite). Revísalas en
-- Authentication → Policies si un permiso se comporta distinto a lo descrito arriba.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Roles
-- ---------------------------------------------------------------------------
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_role_check CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

ALTER TABLE workspace_invitations DROP CONSTRAINT IF EXISTS workspace_invitations_role_check;
ALTER TABLE workspace_invitations
  ADD CONSTRAINT workspace_invitations_role_check CHECK (role IN ('admin', 'editor', 'viewer'));

-- Datos existentes: el único 'owner' de cada hogar es workspaces.owner_id.
-- Cualquier otro 'owner' puesto a mano pasa a administrador.
UPDATE workspace_members wm
   SET role = 'admin'
  FROM workspaces w
 WHERE w.id = wm.workspace_id AND wm.role = 'owner' AND wm.user_id <> w.owner_id;

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, owner_id, 'owner' FROM workspaces
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_members_one_owner
  ON workspace_members (workspace_id) WHERE role = 'owner';

-- ---------------------------------------------------------------------------
-- 2) Helpers de permisos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID, uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = ws_id AND user_id = uid);
$$;

CREATE OR REPLACE FUNCTION get_workspace_role(ws_id UUID, uid UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM workspace_members WHERE workspace_id = ws_id AND user_id = uid LIMIT 1;
$$;

-- Propietario, administrador o editor
CREATE OR REPLACE FUNCTION can_edit_workspace(ws_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(get_workspace_role(ws_id, auth.uid()) IN ('owner', 'admin', 'editor'), FALSE);
$$;

-- Propietario o administrador
CREATE OR REPLACE FUNCTION can_manage_workspace(ws_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(get_workspace_role(ws_id, auth.uid()) IN ('owner', 'admin'), FALSE);
$$;

CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT lower(trim(auth.jwt() ->> 'email'));
$$;

-- ---------------------------------------------------------------------------
-- 3) Hogares
-- ---------------------------------------------------------------------------
-- Desde el cliente solo se pueden editar nombre y descripción (owner_id va por transferencia)
REVOKE UPDATE ON workspaces FROM authenticated, anon;
GRANT UPDATE (name, description, updated_at) ON workspaces TO authenticated;

DROP POLICY IF EXISTS "Owners can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Owners/admins can update workspace" ON workspaces;
CREATE POLICY "Owners/admins can update workspace"
  ON workspaces FOR UPDATE
  USING (can_manage_workspace(id))
  WITH CHECK (can_manage_workspace(id));

DROP POLICY IF EXISTS "Owners can delete workspace" ON workspaces;
CREATE POLICY "Owners can delete workspace"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) Miembros
-- ---------------------------------------------------------------------------
-- Solo se puede cambiar el rol desde el cliente
REVOKE UPDATE ON workspace_members FROM authenticated, anon;
GRANT UPDATE (role) ON workspace_members TO authenticated;

-- Sin política de INSERT: se entra por el trigger de creación del hogar o aceptando una invitación
DROP POLICY IF EXISTS "Owners/editors can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners/editors can add members or self-insert" ON workspace_members;

DROP POLICY IF EXISTS "Owners can update member roles" ON workspace_members;
DROP POLICY IF EXISTS "Owners/admins can change member roles" ON workspace_members;
CREATE POLICY "Owners/admins can change member roles"
  ON workspace_members FOR UPDATE
  USING (can_manage_workspace(workspace_id) AND role <> 'owner')
  WITH CHECK (can_manage_workspace(workspace_id) AND role IN ('admin', 'editor', 'viewer'));

-- Propietario y administradores quitan miembros; cualquiera puede salir. Al propietario no se
-- le quita: primero transfiere la propiedad o elimina el hogar.
DROP POLICY IF EXISTS "Owners can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Owners/admins remove members, members can leave" ON workspace_members;
CREATE POLICY "Owners/admins remove members, members can leave"
  ON workspace_members FOR DELETE
  USING (role <> 'owner' AND (user_id = auth.uid() OR can_manage_workspace(workspace_id)));

-- ---------------------------------------------------------------------------
-- 5) Invitaciones
-- ---------------------------------------------------------------------------
-- El email se guarda siempre en minúsculas y sin espacios, para compararlo con el de la sesión
CREATE OR REPLACE FUNCTION normalize_invitation_email() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_invitation_normalize_email ON workspace_invitations;
CREATE TRIGGER on_invitation_normalize_email
  BEFORE INSERT OR UPDATE OF email ON workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION normalize_invitation_email();

UPDATE workspace_invitations SET email = lower(trim(email)) WHERE email <> lower(trim(email));

DROP POLICY IF EXISTS "Members can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Members or invitee can view invitations" ON workspace_invitations;
CREATE POLICY "Members or invitee can view invitations"
  ON workspace_invitations FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()) OR email = current_user_email());

DROP POLICY IF EXISTS "Owners/editors can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners/admins can create invitations" ON workspace_invitations;
CREATE POLICY "Owners/admins can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (can_manage_workspace(workspace_id) AND invited_by = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Owners can update invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners/admins can update invitations" ON workspace_invitations;
CREATE POLICY "Owners/admins can update invitations"
  ON workspace_invitations FOR UPDATE
  USING (can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS "Owners/admins can delete invitations" ON workspace_invitations;
CREATE POLICY "Owners/admins can delete invitations"
  ON workspace_invitations FOR DELETE
  USING (can_manage_workspace(workspace_id));

-- Invitaciones pendientes para el usuario actual, con el nombre del hogar (que aún no puede leer)
CREATE OR REPLACE FUNCTION get_my_invitations()
RETURNS TABLE (
  id UUID, token TEXT, workspace_id UUID, workspace_name TEXT,
  role TEXT, invited_by_name TEXT, expires_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.token, i.workspace_id, w.name, i.role, COALESCE(p.full_name, p.email), i.expires_at
    FROM workspace_invitations i
    JOIN workspaces w ON w.id = i.workspace_id
    LEFT JOIN profiles p ON p.id = i.invited_by
   WHERE i.email = current_user_email()
     AND i.status = 'pending'
     AND (i.expires_at IS NULL OR i.expires_at > NOW())
     AND NOT is_workspace_member(i.workspace_id, auth.uid())
   ORDER BY i.created_at DESC;
$$;

-- Acepta una invitación dirigida al email de la sesión. Devuelve el id del hogar.
CREATE OR REPLACE FUNCTION accept_workspace_invitation(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv workspace_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para aceptar la invitación' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_inv FROM workspace_invitations WHERE token = p_token FOR UPDATE;

  IF NOT FOUND OR v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'La invitación no existe o ya fue usada' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.email <> current_user_email() THEN
    RAISE EXCEPTION 'Esta invitación es para otro email' USING ERRCODE = '42501';
  END IF;
  IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at < NOW() THEN
    RAISE EXCEPTION 'La invitación ha expirado' USING ERRCODE = 'P0001';
  END IF;

  -- Si ya era miembro se mantiene su rol actual
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_inv.workspace_id, auth.uid(), v_inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE workspace_invitations SET status = 'accepted' WHERE id = v_inv.id;
  RETURN v_inv.workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION decline_workspace_invitation(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE workspace_invitations
     SET status = 'rejected'
   WHERE token = p_token AND status = 'pending' AND email = current_user_email();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La invitación no existe o ya fue usada' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Transferir la propiedad (el propietario anterior queda como administrador)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION transfer_workspace_ownership(p_workspace_id UUID, p_new_owner_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Solo el propietario puede transferir el hogar' USING ERRCODE = '42501';
  END IF;
  IF p_new_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Ya eres el propietario' USING ERRCODE = 'P0001';
  END IF;
  IF NOT is_workspace_member(p_workspace_id, p_new_owner_id) THEN
    RAISE EXCEPTION 'La persona no es miembro del hogar' USING ERRCODE = 'P0002';
  END IF;

  -- Primero se libera el rol de propietario (índice: un solo propietario por hogar)
  UPDATE workspace_members SET role = 'admin' WHERE workspace_id = p_workspace_id AND user_id = auth.uid();
  UPDATE workspace_members SET role = 'owner' WHERE workspace_id = p_workspace_id AND user_id = p_new_owner_id;
  UPDATE workspaces SET owner_id = p_new_owner_id, updated_at = NOW() WHERE id = p_workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION get_my_invitations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION accept_workspace_invitation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION decline_workspace_invitation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION transfer_workspace_ownership(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_workspace_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_workspace_ownership(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Contenido del hogar: editar = owner/admin/editor, eliminar = owner/admin
-- ---------------------------------------------------------------------------
-- Categorías
DROP POLICY IF EXISTS "Editors/owners can manage categories" ON categories;
DROP POLICY IF EXISTS "Editors/owners can update categories" ON categories;
DROP POLICY IF EXISTS "Owners can delete categories" ON categories;
CREATE POLICY "Editors/owners can manage categories" ON categories FOR INSERT WITH CHECK (can_edit_workspace(workspace_id));
CREATE POLICY "Editors/owners can update categories" ON categories FOR UPDATE USING (can_edit_workspace(workspace_id));
CREATE POLICY "Owners can delete categories" ON categories FOR DELETE USING (can_manage_workspace(workspace_id));

-- Productos
DROP POLICY IF EXISTS "Editors/owners can insert products" ON products;
DROP POLICY IF EXISTS "Editors/owners can update products" ON products;
DROP POLICY IF EXISTS "Owners can delete products" ON products;
CREATE POLICY "Editors/owners can insert products" ON products FOR INSERT WITH CHECK (can_edit_workspace(workspace_id));
CREATE POLICY "Editors/owners can update products" ON products FOR UPDATE USING (can_edit_workspace(workspace_id));
CREATE POLICY "Owners can delete products" ON products FOR DELETE USING (can_manage_workspace(workspace_id));

-- Presupuestos
DROP POLICY IF EXISTS "Editors/owners can manage budgets" ON budgets;
DROP POLICY IF EXISTS "Editors/owners can update budgets" ON budgets;
DROP POLICY IF EXISTS "Owners can delete budgets" ON budgets;
CREATE POLICY "Editors/owners can manage budgets" ON budgets FOR INSERT WITH CHECK (can_edit_workspace(workspace_id));
CREATE POLICY "Editors/owners can update budgets" ON budgets FOR UPDATE USING (can_edit_workspace(workspace_id));
CREATE POLICY "Owners can delete budgets" ON budgets FOR DELETE USING (can_manage_workspace(workspace_id));

-- Ítems de presupuesto (los editores sí pueden quitarlos)
DROP POLICY IF EXISTS "Editors/owners can manage budget items" ON budget_items;
DROP POLICY IF EXISTS "Editors/owners can update budget items" ON budget_items;
DROP POLICY IF EXISTS "Editors/owners can delete budget items" ON budget_items;
CREATE POLICY "Editors/owners can manage budget items" ON budget_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND can_edit_workspace(b.workspace_id)));
CREATE POLICY "Editors/owners can update budget items" ON budget_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND can_edit_workspace(b.workspace_id)));
CREATE POLICY "Editors/owners can delete budget items" ON budget_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND can_edit_workspace(b.workspace_id)));

-- Sesiones de compra
DROP POLICY IF EXISTS "Editors/owners can manage sessions" ON shopping_sessions;
DROP POLICY IF EXISTS "Editors/owners can update sessions" ON shopping_sessions;
CREATE POLICY "Editors/owners can manage sessions" ON shopping_sessions FOR INSERT WITH CHECK (can_edit_workspace(workspace_id));
CREATE POLICY "Editors/owners can update sessions" ON shopping_sessions FOR UPDATE USING (can_edit_workspace(workspace_id));

-- Participantes y reservas: solo miembros del hogar de esa compra
DROP POLICY IF EXISTS "Members can insert/update participants" ON shopping_participants;
CREATE POLICY "Members can insert/update participants" ON shopping_participants FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM shopping_sessions ss WHERE ss.id = session_id AND is_workspace_member(ss.workspace_id, auth.uid())
  ));

DROP POLICY IF EXISTS "Members can manage locks" ON product_locks;
CREATE POLICY "Members can manage locks" ON product_locks FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM shopping_sessions ss WHERE ss.id = session_id AND can_edit_workspace(ss.workspace_id)
  ));

-- Compras
DROP POLICY IF EXISTS "Editors/owners can manage purchases" ON purchases;
DROP POLICY IF EXISTS "Editors/owners can update purchases" ON purchases;
DROP POLICY IF EXISTS "Owners can delete purchases" ON purchases;
CREATE POLICY "Editors/owners can manage purchases" ON purchases FOR INSERT WITH CHECK (can_edit_workspace(workspace_id));
CREATE POLICY "Editors/owners can update purchases" ON purchases FOR UPDATE USING (can_edit_workspace(workspace_id));
CREATE POLICY "Owners can delete purchases" ON purchases FOR DELETE USING (can_manage_workspace(workspace_id));

-- Ítems de compra: los editores también los quitan (carrito del Modo Compra, Deshacer)
DROP POLICY IF EXISTS "Editors/owners can manage purchase items" ON purchase_items;
DROP POLICY IF EXISTS "Editors/owners can update purchase items" ON purchase_items;
DROP POLICY IF EXISTS "Editors/owners can delete purchase items" ON purchase_items;
CREATE POLICY "Editors/owners can manage purchase items" ON purchase_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM purchases p WHERE p.id = purchase_id AND can_edit_workspace(p.workspace_id)));
CREATE POLICY "Editors/owners can update purchase items" ON purchase_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM purchases p WHERE p.id = purchase_id AND can_edit_workspace(p.workspace_id)));
CREATE POLICY "Editors/owners can delete purchase items" ON purchase_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM purchases p WHERE p.id = purchase_id AND can_edit_workspace(p.workspace_id)));

COMMIT;
