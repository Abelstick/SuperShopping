import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useBudgetStore = create((set, get) => ({
  budgets: [],
  currentBudget: null,
  budgetItems: [],
  loading: false,

  fetchBudgets: async (workspaceId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('budgets')
      .select(`*, profiles!budgets_created_by_fkey(full_name)`)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    if (!error) set({ budgets: data || [] })
    set({ loading: false })
    return { error }
  },

  createBudget: async (workspaceId, budget, userId) => {
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...budget, workspace_id: workspaceId, created_by: userId })
      .select(`*, profiles!budgets_created_by_fkey(full_name)`)
      .single()
    if (!error && data) set((s) => ({ budgets: [data, ...s.budgets] }))
    return { data, error }
  },

  updateBudget: async (id, updates) => {
    const { data, error } = await supabase
      .from('budgets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, profiles!budgets_created_by_fkey(full_name)`)
      .single()
    if (!error && data) {
      set((s) => ({
        budgets: s.budgets.map((b) => b.id === id ? data : b),
        currentBudget: s.currentBudget?.id === id ? data : s.currentBudget,
      }))
    }
    return { data, error }
  },

  deleteBudget: async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }))
    return { error }
  },

  fetchBudgetWithItems: async (budgetId) => {
    set({ loading: true })
    const [budgetRes, itemsRes] = await Promise.all([
      supabase.from('budgets').select(`*, profiles!budgets_created_by_fkey(full_name)`).eq('id', budgetId).single(),
      supabase.from('budget_items').select(`*, categories(id, name, color, icon, aisle), products(id, name, unit)`).eq('budget_id', budgetId).order('sort_order'),
    ])
    if (!budgetRes.error) set({ currentBudget: budgetRes.data })
    if (!itemsRes.error) set({ budgetItems: itemsRes.data || [] })
    set({ loading: false })
    return { error: budgetRes.error || itemsRes.error }
  },

  addBudgetItem: async (budgetId, item) => {
    const { data, error } = await supabase
      .from('budget_items')
      .insert({ ...item, budget_id: budgetId })
      .select(`*, categories(id, name, color, icon, aisle)`)
      .single()
    if (!error && data) set((s) => ({ budgetItems: [...s.budgetItems, data] }))
    return { data, error }
  },

  updateBudgetItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('budget_items')
      .update(updates)
      .eq('id', id)
      .select(`*, categories(id, name, color, icon, aisle)`)
      .single()
    if (!error && data) set((s) => ({ budgetItems: s.budgetItems.map((i) => i.id === id ? data : i) }))
    return { data, error }
  },

  deleteBudgetItem: async (id) => {
    const { error } = await supabase.from('budget_items').delete().eq('id', id)
    if (!error) set((s) => ({ budgetItems: s.budgetItems.filter((i) => i.id !== id) }))
    return { error }
  },

  checkAllItems: async (budgetId) => {
    const { error } = await supabase
      .from('budget_items').update({ is_checked: true }).eq('budget_id', budgetId)
    if (!error) set((s) => ({ budgetItems: s.budgetItems.map((i) => ({ ...i, is_checked: true })) }))
    return { error }
  },

  uncheckAllItems: async (budgetId) => {
    const { error } = await supabase
      .from('budget_items').update({ is_checked: false }).eq('budget_id', budgetId)
    if (!error) set((s) => ({ budgetItems: s.budgetItems.map((i) => ({ ...i, is_checked: false })) }))
    return { error }
  },

  clearCheckedItems: async (budgetId) => {
    const { error } = await supabase
      .from('budget_items').delete().eq('budget_id', budgetId).eq('is_checked', true)
    if (!error) set((s) => ({ budgetItems: s.budgetItems.filter((i) => !i.is_checked) }))
    return { error }
  },

  clearAllItems: async (budgetId) => {
    const { error } = await supabase
      .from('budget_items').delete().eq('budget_id', budgetId)
    if (!error) set({ budgetItems: [] })
    return { error }
  },

  duplicateBudget: async (sourceBudgetId, workspaceId, userId) => {
    const { data: source, error: fetchErr } = await supabase
      .from('budgets').select('*').eq('id', sourceBudgetId).single()
    if (fetchErr) return { error: fetchErr }

    const { data: sourceItems } = await supabase
      .from('budget_items').select('*').eq('budget_id', sourceBudgetId).order('sort_order')

    const { data: newBudget, error: budgetErr } = await supabase
      .from('budgets')
      .insert({
        name: `${source.name} (copia)`,
        store: source.store,
        date: source.date,
        target_amount: source.target_amount,
        workspace_id: workspaceId,
        created_by: userId,
        status: 'draft',
      })
      .select(`*, profiles!budgets_created_by_fkey(full_name)`)
      .single()
    if (budgetErr) return { error: budgetErr }

    if (sourceItems?.length) {
      await supabase.from('budget_items').insert(
        sourceItems.map(({ id, created_at, updated_at, ...item }) => ({
          ...item, budget_id: newBudget.id, is_checked: false,
        }))
      )
    }

    set((s) => ({ budgets: [newBudget, ...s.budgets] }))
    return { data: newBudget, error: null }
  },

  getBudgetSummary: () => {
    const { budgetItems } = get()
    const totalEstimated = budgetItems.reduce((acc, i) => acc + (i.quantity * (i.estimated_price || 0)), 0)
    const totalChecked = budgetItems.filter((i) => i.is_checked).reduce((acc, i) => acc + (i.quantity * (i.estimated_price || 0)), 0)
    return { totalEstimated, totalChecked, itemCount: budgetItems.length, checkedCount: budgetItems.filter((i) => i.is_checked).length }
  },
}))
