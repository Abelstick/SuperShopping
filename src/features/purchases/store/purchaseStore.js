import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const usePurchaseStore = create((set, get) => ({
  purchases: [],
  currentPurchase: null,
  purchaseItems: [],
  allItems: [],
  loading: false,

  fetchPurchases: async (workspaceId) => {
    set({ loading: true })
    try {
      // A purchase row exists from the moment shopping mode starts (purchase_items
      // need it as a foreign key while items are added), so an abandoned or
      // still-in-progress session would otherwise show up here as a "compra" with
      // total S/0 — only sessions the shopper actually finished belong in the history.
      const { data, error } = await supabase
        .from('purchases')
        .select(`*, profiles!purchases_executed_by_fkey(full_name, avatar_url), budgets(name), shopping_sessions!inner(status)`)
        .eq('workspace_id', workspaceId)
        .eq('shopping_sessions.status', 'completed')
        .order('created_at', { ascending: false })
      if (!error) set({ purchases: data || [] })
      return { error }
    } finally {
      set({ loading: false })
    }
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
    try {
      const [purchRes, itemsRes] = await Promise.all([
        supabase.from('purchases').select(`*, profiles!purchases_executed_by_fkey(full_name, avatar_url), budgets(name)`).eq('id', purchaseId).single(),
        supabase.from('purchase_items').select(`*, profiles!purchase_items_purchased_by_fkey(full_name), categories(name, color)`).eq('purchase_id', purchaseId),
      ])
      if (!purchRes.error) set({ currentPurchase: purchRes.data })
      if (!itemsRes.error) set({ purchaseItems: itemsRes.data || [] })
      return { error: purchRes.error || itemsRes.error }
    } finally {
      set({ loading: false })
    }
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

  updatePurchaseItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('purchase_items')
      .update(updates)
      .eq('id', id)
      .select(`*, profiles!purchase_items_purchased_by_fkey(full_name), categories(name, color)`)
      .single()
    if (!error && data) set((s) => ({ purchaseItems: s.purchaseItems.map((i) => i.id === id ? { ...i, ...data } : i) }))
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

  deletePurchaseItem: async (id) => {
    const { error } = await supabase.from('purchase_items').delete().eq('id', id)
    if (!error) set((s) => ({ purchaseItems: s.purchaseItems.filter((i) => i.id !== id) }))
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

  fetchAllItems: async (workspaceId) => {
    set({ loading: true })
    try {
      // Same reasoning as fetchPurchases: exclude items added during a shopping
      // session that was abandoned or is still in progress.
      const { data, error } = await supabase
        .from('purchase_items')
        .select('id, product_id, product_name, quantity, unit_price, total_price, unit, category_id, categories(name, color), purchases!inner(date, workspace_id, shopping_sessions!inner(status))')
        .eq('purchases.workspace_id', workspaceId)
        .not('purchases.date', 'is', null)
        .eq('purchases.shopping_sessions.status', 'completed')
        .order('date', { foreignTable: 'purchases', ascending: true })
      if (!error) set({ allItems: data || [] })
      return { error }
    } finally {
      set({ loading: false })
    }
  },

  getLastPriceForProduct: async (productId) => {
    if (!productId) return { data: null, error: null }
    const { data, error } = await supabase
      .from('purchase_items')
      .select('unit_price, unit, quantity, purchases!inner(date)')
      .eq('product_id', productId)
      .not('unit_price', 'is', null)
      .order('date', { foreignTable: 'purchases', ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return { data: null, error }
    return { data: { price: Number(data.unit_price), date: data.purchases.date, unit: data.unit, quantity: data.quantity }, error: null }
  },
}))
