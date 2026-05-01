-- =============================================
-- SuperShopping - RLS Fix Patch
-- Run this AFTER schema.sql if you get RLS errors on workspace creation
-- =============================================

-- 1. Add owner-based SELECT policy so RETURNING * works immediately after INSERT
--    (before the trigger add_owner_as_member completes)
DROP POLICY IF EXISTS "Members can view workspace" ON workspaces;

CREATE POLICY "Members or owners can view workspace"
  ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid()
    OR is_workspace_member(id, auth.uid())
  );

-- 2. Allow authenticated users to view any profile (needed to show member names)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to upsert their own profile (for users created before the trigger existed)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Make workspace_members also readable by the workspace owner directly
--    (avoids potential recursion in is_workspace_member)
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;

CREATE POLICY "Members or workspace owner can view members"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
    OR is_workspace_member(workspace_id, auth.uid())
  );

-- 4. Fix workspace_members INSERT policy to also allow self-insert
--    (for when users accept invitations)
DROP POLICY IF EXISTS "Owners/editors can add members" ON workspace_members;

CREATE POLICY "Owners/editors can add members or self-insert"
  ON workspace_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'editor')
  );
