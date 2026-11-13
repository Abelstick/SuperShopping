import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { ensureAffected } from '@/shared/utils/supabaseResult'

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  members: [],
  invitations: [],
  // Invitaciones recibidas por el usuario actual
  myInvitations: [],
  loading: false,
}

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // Al cerrar sesión: el siguiente usuario no debe heredar el hogar ni el rol del anterior
      reset: () => set({ ...initialState }),

      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

      fetchWorkspaces: async (userId) => {
        set({ loading: true })
        try {
          const { data, error } = await supabase
            .from('workspace_members')
            .select(`
              role,
              joined_at,
              workspaces (
                id, name, description, owner_id, created_at,
                profiles!workspaces_owner_id_fkey (full_name, email)
              )
            `)
            .eq('user_id', userId)

          if (!error && data) {
            const workspaces = data
              .filter((d) => d.workspaces)
              .map((d) => ({
                ...d.workspaces,
                my_role: d.role,
                joined_at: d.joined_at,
              }))
            // Si el hogar guardado ya no está (te quitaron, lo eliminaron o es de otra cuenta), se cambia
            const { currentWorkspace } = get()
            const updated = currentWorkspace && workspaces.find((w) => w.id === currentWorkspace.id)
            set({ workspaces, currentWorkspace: updated || workspaces[0] || null })
          }
          return { error }
        } finally {
          set({ loading: false })
        }
      },

      createWorkspace: async (name, description, userId) => {
        // Avoid .select() after INSERT to prevent RLS RETURNING policy race
        // with the add_owner_as_member trigger. Fetch separately after insert.
        const { error } = await supabase
          .from('workspaces')
          .insert({ name, description, owner_id: userId })
        if (!error) {
          await get().fetchWorkspaces(userId)
        }
        return { error }
      },

      updateWorkspace: async (id, updates) => {
        const { data, error } = await supabase
          .from('workspaces')
          .update({ name: updates.name, description: updates.description, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single()
        if (!error && data) {
          set((s) => ({
            workspaces: s.workspaces.map((w) => w.id === id ? { ...w, ...data } : w),
            currentWorkspace: s.currentWorkspace?.id === id ? { ...s.currentWorkspace, ...data } : s.currentWorkspace,
          }))
        }
        return { data, error }
      },

      deleteWorkspace: async (id, userId) => {
        const { error } = ensureAffected(await supabase.from('workspaces').delete().eq('id', id).select('id'))
        if (!error) await get().fetchWorkspaces(userId)
        return { error }
      },

      // Últimos cambios del inventario del hogar. El autor se resuelve con `members`.
      fetchActivity: async (workspaceId) => {
        const { data, error } = await supabase
          .from('product_history')
          .select('id, action, changes, created_at, user_id, products(name)')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(30)
        return { data: data || [], error }
      },

      fetchMembers: async (workspaceId) => {
        const { data, error } = await supabase
          .from('workspace_members')
          .select(`
            id, role, joined_at,
            profiles (id, full_name, email, avatar_url)
          `)
          .eq('workspace_id', workspaceId)

        if (!error) set({ members: data || [] })
        return { error }
      },

      updateMemberRole: async (workspaceId, userId, role) => {
        const { error } = ensureAffected(await supabase
          .from('workspace_members')
          .update({ role })
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .select('id'))
        if (!error) await get().fetchMembers(workspaceId)
        return { error }
      },

      removeMember: async (workspaceId, userId) => {
        const { error } = ensureAffected(await supabase
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .select('id'))
        if (!error) await get().fetchMembers(workspaceId)
        return { error }
      },

      // Salir de un hogar propio (no aplica al propietario: debe transferirlo antes)
      leaveWorkspace: async (workspaceId, userId) => {
        const { error } = ensureAffected(await supabase
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .select('id'))
        if (!error) await get().fetchWorkspaces(userId)
        return { error }
      },

      transferOwnership: async (workspaceId, newOwnerId, userId) => {
        const { error } = await supabase.rpc('transfer_workspace_ownership', {
          p_workspace_id: workspaceId,
          p_new_owner_id: newOwnerId,
        })
        if (!error) await Promise.all([get().fetchMembers(workspaceId), get().fetchWorkspaces(userId)])
        return { error }
      },

      fetchInvitations: async (workspaceId) => {
        const { data, error } = await supabase
          .from('workspace_invitations')
          .select(`*, profiles!workspace_invitations_invited_by_fkey(full_name, email)`)
          .eq('workspace_id', workspaceId)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })

        if (!error) set({ invitations: data || [] })
        return { error }
      },

      inviteMember: async (workspaceId, email, role, invitedBy) => {
        const { data, error } = await supabase
          .from('workspace_invitations')
          .insert({ workspace_id: workspaceId, email: email.trim().toLowerCase(), role, invited_by: invitedBy })
          .select()
          .single()
        if (!error) await get().fetchInvitations(workspaceId)
        return { data, error }
      },

      cancelInvitation: async (invitationId, workspaceId) => {
        const { error } = ensureAffected(await supabase
          .from('workspace_invitations')
          .delete()
          .eq('id', invitationId)
          .select('id'))
        if (!error) await get().fetchInvitations(workspaceId)
        return { error }
      },

      fetchMyInvitations: async () => {
        const { data, error } = await supabase.rpc('get_my_invitations')
        if (!error) set({ myInvitations: data || [] })
        return { data: data || [], error }
      },

      // Une al usuario al hogar de la invitación y lo deja como hogar activo
      acceptInvitation: async (token, userId) => {
        const { data: workspaceId, error } = await supabase.rpc('accept_workspace_invitation', { p_token: token })
        if (error) return { error }
        await get().fetchWorkspaces(userId)
        const joined = get().workspaces.find((w) => w.id === workspaceId)
        if (joined) set({ currentWorkspace: joined })
        await get().fetchMyInvitations()
        return { data: joined ?? null, error: null }
      },

      declineInvitation: async (token) => {
        const { error } = await supabase.rpc('decline_workspace_invitation', { p_token: token })
        if (!error) await get().fetchMyInvitations()
        return { error }
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (s) => ({ currentWorkspace: s.currentWorkspace }),
    }
  )
)
