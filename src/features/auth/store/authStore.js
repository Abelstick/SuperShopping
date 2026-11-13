import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, loading: false, initialized: true })
    if (session?.user) await get().fetchProfile(session.user.id)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Cambió la cuenta (o se cerró la sesión en otra pestaña): no se hereda el hogar anterior
      const previousId = get().user?.id
      if (previousId && previousId !== session?.user?.id) useWorkspaceStore.getState().reset()
      set({ session, user: session?.user ?? null })
      if (session?.user) get().fetchProfile(session.user.id)
      else set({ profile: null })
    })

    return () => subscription.unsubscribe()
  },

  refreshSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (!error && session) {
      set({ session, user: session.user })
    }
  },

  fetchProfile: async (userId) => {
    const { user } = get()
    const authUser = user ?? (await supabase.auth.getUser()).data.user

    // Upsert profile in case the trigger didn't fire (e.g. user registered before schema was applied)
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: authUser?.email ?? '',
          full_name: authUser?.user_metadata?.full_name ?? null,
          avatar_url: authUser?.user_metadata?.avatar_url ?? null,
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select('*')
      .single()

    if (!error && data) set({ profile: data })
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (!error && data) set({ profile: data })
    return { error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { data, error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    useWorkspaceStore.getState().reset()
    set({ user: null, profile: null, session: null })
  },

  // Fija la nueva contraseña tras abrir el enlace de recuperación (la sesión de recuperación la crea Supabase)
  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  },

  resetPassword: async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
  },
}))
