import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,
      members: [],
      invitations: [],
      loading: false,

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
            const workspaces = data.map((d) => ({
              ...d.workspaces,
              my_role: d.role,
              joined_at: d.joined_at,
            }))
            set({ workspaces })

            const { currentWorkspace } = get()
            if (!currentWorkspace && workspaces.length > 0) {
              set({ currentWorkspace: workspaces[0] })
            } else if (currentWorkspace) {
              const updated = workspaces.find((w) => w.id === currentWorkspace.id)
              if (updated) set({ currentWorkspace: updated })
            }
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
          .update({ ...updates, updated_at: new Date().toISOString() })
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
        const { error } = await supabase.from('workspaces').delete().eq('id', id)
        if (!error) {
          set((s) => {
            const remaining = s.workspaces.filter((w) => w.id !== id)
            return {
              workspaces: remaining,
              currentWorkspace: s.currentWorkspace?.id === id ? (remaining[0] || null) : s.currentWorkspace,
            }
          })
          await get().fetchWorkspaces(userId)
        }
        return { error }
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
        const { error } = await supabase
          .from('workspace_members')
          .update({ role })
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
        if (!error) await get().fetchMembers(workspaceId)
        return { error }
      },

      removeMember: async (workspaceId, userId) => {
        const { error } = await supabase
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
        if (!error) await get().fetchMembers(workspaceId)
        return { error }
      },

      fetchInvitations: async (workspaceId) => {
        const { data, error } = await supabase
          .from('workspace_invitations')
          .select(`*, profiles!workspace_invitations_invited_by_fkey(full_name, email)`)
          .eq('workspace_id', workspaceId)
          .eq('status', 'pending')

        if (!error) set({ invitations: data || [] })
        return { error }
      },

      inviteMember: async (workspaceId, email, role, invitedBy) => {
        const { data, error } = await supabase
          .from('workspace_invitations')
          .insert({ workspace_id: workspaceId, email, role, invited_by: invitedBy })
          .select()
          .single()
        if (!error) await get().fetchInvitations(workspaceId)
        return { data, error }
      },

      acceptInvitation: async (token, userId) => {
        const { data: inv, error: fetchErr } = await supabase
          .from('workspace_invitations')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .single()

        if (fetchErr || !inv) return { error: fetchErr || new Error('Invitación no encontrada') }
        if (new Date(inv.expires_at) < new Date()) {
          await supabase.from('workspace_invitations').update({ status: 'expired' }).eq('id', inv.id)
          return { error: new Error('La invitación ha expirado') }
        }

        const { error: memberErr } = await supabase
          .from('workspace_members')
          .insert({ workspace_id: inv.workspace_id, user_id: userId, role: inv.role })

        if (!memberErr) {
          await supabase.from('workspace_invitations').update({ status: 'accepted' }).eq('id', inv.id)
          await get().fetchWorkspaces(userId)
        }
        return { error: memberErr }
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (s) => ({ currentWorkspace: s.currentWorkspace }),
    }
  )
)
