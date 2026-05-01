-- =============================================
-- SuperShopping - Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- WORKSPACES (Hogares)
-- =============================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- =============================================
-- WORKSPACE MEMBERS
-- =============================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is workspace member
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = uid
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: get user role in workspace
CREATE OR REPLACE FUNCTION get_workspace_role(ws_id UUID, uid UUID)
RETURNS TEXT AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = ws_id AND user_id = uid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Workspace policies
CREATE POLICY "Members can view workspace"
  ON workspaces FOR SELECT
  USING (is_workspace_member(id, auth.uid()));

CREATE POLICY "Owners can update workspace"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspace"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Owners can delete workspace"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Member policies
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Owners/editors can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor') OR user_id = auth.uid());

CREATE POLICY "Owners can update member roles"
  ON workspace_members FOR UPDATE
  USING (get_workspace_role(workspace_id, auth.uid()) = 'owner');

CREATE POLICY "Owners can remove members"
  ON workspace_members FOR DELETE
  USING (get_workspace_role(workspace_id, auth.uid()) = 'owner' OR user_id = auth.uid());

-- Auto-add owner as member when creating workspace
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION add_owner_as_member();

-- =============================================
-- WORKSPACE INVITATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  invited_by UUID REFERENCES profiles(id) NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invitations"
  ON workspace_invitations FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()) OR email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Owners/editors can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners can update invitations"
  ON workspace_invitations FOR UPDATE
  USING (is_workspace_member(workspace_id, auth.uid()));

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#2196F3',
  icon TEXT DEFAULT 'Category',
  aisle TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories"
  ON categories FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Editors/owners can manage categories"
  ON categories FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Editors/owners can update categories"
  ON categories FOR UPDATE
  USING (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners can delete categories"
  ON categories FOR DELETE
  USING (get_workspace_role(workspace_id, auth.uid()) = 'owner');

-- =============================================
-- PRODUCTS (Inventario)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'unidad',
  current_quantity DECIMAL(10,2) DEFAULT 0,
  min_quantity DECIMAL(10,2) DEFAULT 0,
  barcode TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view products"
  ON products FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Editors/owners can insert products"
  ON products FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Editors/owners can update products"
  ON products FOR UPDATE
  USING (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners can delete products"
  ON products FOR DELETE
  USING (get_workspace_role(workspace_id, auth.uid()) = 'owner');

-- =============================================
-- PRODUCT HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS product_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view product history"
  ON product_history FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can insert product history"
  ON product_history FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

-- =============================================
-- BUDGETS (Presupuestos)
-- =============================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  store TEXT,
  date DATE,
  target_amount DECIMAL(10,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view budgets"
  ON budgets FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Editors/owners can manage budgets"
  ON budgets FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Editors/owners can update budgets"
  ON budgets FOR UPDATE
  USING (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners can delete budgets"
  ON budgets FOR DELETE
  USING (get_workspace_role(workspace_id, auth.uid()) = 'owner');

-- =============================================
-- BUDGET ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  estimated_price DECIMAL(10,2),
  unit TEXT DEFAULT 'unidad',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  notes TEXT,
  is_checked BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view budget items"
  ON budget_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND is_workspace_member(b.workspace_id, auth.uid()))
  );

CREATE POLICY "Editors/owners can manage budget items"
  ON budget_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND get_workspace_role(b.workspace_id, auth.uid()) IN ('owner','editor'))
  );

CREATE POLICY "Editors/owners can update budget items"
  ON budget_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND get_workspace_role(b.workspace_id, auth.uid()) IN ('owner','editor'))
  );

CREATE POLICY "Editors/owners can delete budget items"
  ON budget_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND get_workspace_role(b.workspace_id, auth.uid()) IN ('owner','editor'))
  );

-- =============================================
-- SHOPPING SESSIONS
-- =============================================
CREATE TABLE IF NOT EXISTS shopping_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE shopping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sessions"
  ON shopping_sessions FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Editors/owners can manage sessions"
  ON shopping_sessions FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Editors/owners can update sessions"
  ON shopping_sessions FOR UPDATE
  USING (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

-- =============================================
-- SHOPPING PARTICIPANTS
-- =============================================
CREATE TABLE IF NOT EXISTS shopping_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES shopping_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE shopping_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view participants"
  ON shopping_participants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shopping_sessions ss WHERE ss.id = session_id AND is_workspace_member(ss.workspace_id, auth.uid()))
  );

CREATE POLICY "Members can insert/update participants"
  ON shopping_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update own participant"
  ON shopping_participants FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================
-- PRODUCT LOCKS (during shopping)
-- =============================================
CREATE TABLE IF NOT EXISTS product_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES shopping_sessions(id) ON DELETE CASCADE NOT NULL,
  budget_item_id UUID REFERENCES budget_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, budget_item_id)
);

ALTER TABLE product_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view locks"
  ON product_locks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shopping_sessions ss WHERE ss.id = session_id AND is_workspace_member(ss.workspace_id, auth.uid()))
  );

CREATE POLICY "Members can manage locks"
  ON product_locks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own locks"
  ON product_locks FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- PURCHASES (Compras reales)
-- =============================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  session_id UUID REFERENCES shopping_sessions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  store TEXT,
  date DATE DEFAULT CURRENT_DATE,
  total_amount DECIMAL(10,2) DEFAULT 0,
  executed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view purchases"
  ON purchases FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Editors/owners can manage purchases"
  ON purchases FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Editors/owners can update purchases"
  ON purchases FOR UPDATE
  USING (get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners can delete purchases"
  ON purchases FOR DELETE
  USING (get_workspace_role(workspace_id, auth.uid()) = 'owner');

-- =============================================
-- PURCHASE ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES shopping_sessions(id) ON DELETE SET NULL,
  budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  unit TEXT DEFAULT 'unidad',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  purchased_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view purchase items"
  ON purchase_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM purchases p WHERE p.id = purchase_id AND is_workspace_member(p.workspace_id, auth.uid()))
  );

CREATE POLICY "Editors/owners can manage purchase items"
  ON purchase_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM purchases p WHERE p.id = purchase_id AND get_workspace_role(p.workspace_id, auth.uid()) IN ('owner','editor'))
  );

CREATE POLICY "Editors/owners can update purchase items"
  ON purchase_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM purchases p WHERE p.id = purchase_id AND get_workspace_role(p.workspace_id, auth.uid()) IN ('owner','editor'))
  );

-- =============================================
-- ACTIVITY LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activity logs"
  ON activity_logs FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

-- =============================================
-- REALTIME: Enable realtime on key tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE budget_items;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE product_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_items;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- =============================================
-- USEFUL VIEWS
-- =============================================
CREATE OR REPLACE VIEW workspace_stats AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  COUNT(DISTINCT wm.user_id) AS member_count,
  COUNT(DISTINCT p.id) AS product_count,
  COUNT(DISTINCT b.id) AS budget_count,
  COUNT(DISTINCT pu.id) AS purchase_count,
  COALESCE(SUM(pu.total_amount), 0) AS total_spent
FROM workspaces w
LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
LEFT JOIN products p ON p.workspace_id = w.id AND p.is_active = TRUE
LEFT JOIN budgets b ON b.workspace_id = w.id
LEFT JOIN purchases pu ON pu.workspace_id = w.id
GROUP BY w.id, w.name;


CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;