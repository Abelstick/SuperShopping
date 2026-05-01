import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const usePurchaseStore = create((set, get) => ({
  purchases: [],
  currentPurchase: null,
  purchaseItems: [],
  loading: false,

  fetchPurchases: async (workspaceId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('purchases')
      .select(`*, profiles!purchases_executed_by_fkey(full_name, avatar_url), budgets(name)`)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    if (!error) set({ purchases: data || [] })
    set({ loading: false })
    return { error }
  },

  createPurchase: async (workspaceId, purchase, userId) => {
    const { data, error } = await supabase
      .from('purchases')
      .insert({ ...purchase, workspace_id: workspaceId, executed_by: userId })
      .select(`*, profiles!purchases_executed_by_fkey(full_name, avatar_url)`)
      .single()
    if (!error && data) set((s) => ({ purchases: [data, ...s.purchases] }))
    return { data, error }
  },

  fetchPurchaseWithItems: async (purchaseId) => {
    set({ loading: true })
    const [purchRes, itemsRes] = await Promise.all([
      supabase.from('purchases').select(`*, profiles!purchases_executed_by_fkey(full_name, avatar_url), budgets(name)`).eq('id', purchaseId).single(),
      supabase.from('purchase_items').select(`*, profiles!purchase_items_purchased_by_fkey(full_name), categories(name, color)`).eq('purchase_id', purchaseId),
    ])
    if (!purchRes.error) set({ currentPurchase: purchRes.data })
    if (!itemsRes.error) set({ purchaseItems: itemsRes.data || [] })
    set({ loading: false })
    return { error: purchRes.error || itemsRes.error }
  },

  updatePurchase: async (id, updates) => {
    const { data, error } = await supabase
      .from('purchases')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      set((s) => ({
        purchases: s.purchases.map((p) => p.id === id ? { ...p, ...data } : p),
        currentPurchase: s.currentPurchase?.id === id ? { ...s.currentPurchase, ...data } : s.currentPurchase,
      }))
    }
    return { data, error }
  },

  deletePurchase: async (id) => {
    const { error } = await supabase.from('purchases').delete().eq('id', id)
    if (!error) set((s) => ({ purchases: s.purchases.filter((p) => p.id !== id) }))
    return { error }
  },

  deletePurchases: async (ids) => {
    const { error } = await supabase.from('purchases').delete().in('id', ids)
    if (!error) set((s) => ({ purchases: s.purchases.filter((p) => !ids.includes(p.id)) }))
    return { error }
  },

  getSpendingByUser: () => {
    const { purchases } = get()
    const byUser = {}
    purchases.forEach((p) => {
      const key = p.profiles?.full_name || 'Desconocido'
      byUser[key] = (byUser[key] || 0) + (p.total_amount || 0)
    })
    return Object.entries(byUser).map(([name, total]) => ({ name, total }))
  },

  getMonthlySpending: () => {
    const { purchases } = get()
    const byMonth = {}
    purchases.forEach((p) => {
      const month = p.date ? p.date.substring(0, 7) : 'Sin fecha'
      byMonth[month] = (byMonth[month] || 0) + (p.total_amount || 0)
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }))
  },
}))
