import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useShoppingStore = create((set, get) => ({
  session: null,
  participants: [],
  locks: [],
  purchaseItems: [],
  loading: false,
  realtimeChannel: null,

  startSession: async (budgetId, workspaceId, userId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('shopping_sessions')
      .insert({ budget_id: budgetId, workspace_id: workspaceId, status: 'active', created_by: userId })
      .select()
      .single()

    if (!error && data) {
      set({ session: data })
      await supabase.from('shopping_participants').insert({ session_id: data.id, user_id: userId })
      await get().subscribeToSession(data.id)
    }
    set({ loading: false })
    return { data, error }
  },

  joinSession: async (sessionId, userId) => {
    await supabase
      .from('shopping_participants')
      .upsert({ session_id: sessionId, user_id: userId }, { onConflict: 'session_id,user_id' })
    await get().subscribeToSession(sessionId)
  },

  fetchSession: async (sessionId, userId) => {
    const { data, error } = await supabase
      .from('shopping_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    if (!error && data) {
      set({ session: data })
      await Promise.all([
        get().fetchParticipants(sessionId),
        get().fetchLocks(sessionId),
        get().fetchPurchaseItems(sessionId),
      ])
      await get().joinSession(sessionId, userId)
    }
    return { error }
  },

  fetchParticipants: async (sessionId) => {
    const { data } = await supabase
      .from('shopping_participants')
      .select(`*, profiles(id, full_name, avatar_url, email)`)
      .eq('session_id', sessionId)
    set({ participants: data || [] })
  },

  fetchLocks: async (sessionId) => {
    const { data } = await supabase
      .from('product_locks')
      .select(`*, profiles(id, full_name, avatar_url)`)
      .eq('session_id', sessionId)
    set({ locks: data || [] })
  },

  fetchPurchaseItems: async (sessionId) => {
    const { data } = await supabase
      .from('purchase_items')
      .select(`*, profiles!purchase_items_purchased_by_fkey(id, full_name, avatar_url), categories(name, color)`)
      .eq('session_id', sessionId)
    set({ purchaseItems: data || [] })
  },

  lockItem: async (sessionId, budgetItemId, userId) => {
    const { error } = await supabase
      .from('product_locks')
      .insert({ session_id: sessionId, budget_item_id: budgetItemId, user_id: userId })
    return { error }
  },

  unlockItem: async (sessionId, budgetItemId) => {
    await supabase
      .from('product_locks')
      .delete()
      .eq('session_id', sessionId)
      .eq('budget_item_id', budgetItemId)
  },

  addPurchaseItem: async (sessionId, purchaseId, item, userId, workspaceId) => {
    // If the item has no linked product, auto-create one in inventory
    let resolvedProductId = item.product_id || null
    if (!resolvedProductId && item.product_name?.trim() && workspaceId) {
      const { data: newProduct } = await supabase
        .from('products')
        .insert({
          name: item.product_name.trim(),
          workspace_id: workspaceId,
          category_id: item.category_id || null,
          unit: item.unit || 'unidad',
          current_quantity: 0,
          created_by: userId,
        })
        .select('id')
        .single()
      if (newProduct) resolvedProductId = newProduct.id
    }

    const { data, error } = await supabase
      .from('purchase_items')
      .insert({
        ...item,
        product_id: resolvedProductId,
        session_id: sessionId,
        purchase_id: purchaseId,
        purchased_by: userId,
      })
      .select(`*, profiles!purchase_items_purchased_by_fkey(id, full_name, avatar_url), categories(name, color)`)
      .single()

    if (!error && data) set((s) => ({ purchaseItems: [...s.purchaseItems, data] }))
    return { data, error }
  },

  updatePurchaseItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('purchase_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) set((s) => ({ purchaseItems: s.purchaseItems.map((i) => i.id === id ? { ...i, ...data } : i) }))
    return { data, error }
  },

  removePurchaseItem: async (id) => {
    const { error } = await supabase.from('purchase_items').delete().eq('id', id)
    if (!error) set((s) => ({ purchaseItems: s.purchaseItems.filter((i) => i.id !== id) }))
    return { error }
  },

  completeSession: async (sessionId) => {
    const { error } = await supabase
      .from('shopping_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (!error) {
      set((s) => ({ session: s.session ? { ...s.session, status: 'completed' } : s.session }))
      get().unsubscribe()
    }
    return { error }
  },

  subscribeToSession: (sessionId) => {
    const { realtimeChannel } = get()
    if (realtimeChannel) supabase.removeChannel(realtimeChannel)

    const channel = supabase
      .channel(`shopping:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_participants', filter: `session_id=eq.${sessionId}` },
        () => get().fetchParticipants(sessionId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_locks', filter: `session_id=eq.${sessionId}` },
        () => get().fetchLocks(sessionId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_items', filter: `session_id=eq.${sessionId}` },
        () => get().fetchPurchaseItems(sessionId))
      .subscribe()

    set({ realtimeChannel: channel })
  },

  unsubscribe: () => {
    const { realtimeChannel } = get()
    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); set({ realtimeChannel: null }) }
  },

  getTotals: () => get().purchaseItems.reduce((acc, i) => acc + (i.total_price || 0), 0),
  getLockForItem: (budgetItemId) => get().locks.find((l) => l.budget_item_id === budgetItemId) || null,
}))
