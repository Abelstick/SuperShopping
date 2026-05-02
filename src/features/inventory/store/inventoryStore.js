import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useInventoryStore = create((set, get) => ({
  products: [],
  categories: [],
  history: [],
  loading: false,
  filters: { search: '', categoryId: '', status: 'all' },

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),

  fetchCategories: async (workspaceId) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('sort_order')
    if (!error) set({ categories: data || [] })
    return { error }
  },

  createCategory: async (workspaceId, category) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...category, workspace_id: workspaceId })
      .select()
      .single()
    if (!error && data) set((s) => ({ categories: [...s.categories, data] }))
    return { data, error }
  },

  updateCategory: async (id, updates) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) set((s) => ({ categories: s.categories.map((c) => c.id === id ? data : c) }))
    return { data, error }
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
    return { error }
  },

  fetchProducts: async (workspaceId) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories(id, name, color, icon, aisle), profiles!products_created_by_fkey(full_name)`)
        .eq('workspace_id', workspaceId)
        .order('name')
      if (!error) set({ products: data || [] })
      return { error }
    } finally {
      set({ loading: false })
    }
  },

  createProduct: async (workspaceId, product, userId) => {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, workspace_id: workspaceId, created_by: userId })
      .select(`*, categories(id, name, color, icon, aisle)`)
      .single()

    if (!error && data) {
      set((s) => ({ products: [...s.products, data] }))
      await supabase.from('product_history').insert({
        product_id: data.id,
        workspace_id: workspaceId,
        user_id: userId,
        action: 'created',
        changes: { name: data.name },
      })
      await supabase.from('activity_logs').insert({
        workspace_id: workspaceId,
        user_id: userId,
        action: 'create',
        resource_type: 'product',
        resource_id: data.id,
        metadata: { name: data.name },
      })
    }
    return { data, error }
  },

  updateProduct: async (id, updates, workspaceId, userId) => {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, categories(id, name, color, icon, aisle)`)
      .single()

    if (!error && data) {
      set((s) => ({ products: s.products.map((p) => p.id === id ? data : p) }))
      await supabase.from('product_history').insert({
        product_id: id,
        workspace_id: workspaceId,
        user_id: userId,
        action: 'updated',
        changes: updates,
      })
    }
    return { data, error }
  },

  deleteProduct: async (id, workspaceId, userId) => {
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
    if (!error) {
      set((s) => ({ products: s.products.map((p) => p.id === id ? { ...p, is_active: false } : p) }))
      await supabase.from('product_history').insert({
        product_id: id,
        workspace_id: workspaceId,
        user_id: userId,
        action: 'deleted',
        changes: {},
      })
    }
    return { error }
  },

  deactivateProducts: async (ids) => {
    const { error } = await supabase.from('products').update({ is_active: false }).in('id', ids)
    if (!error) set((s) => ({ products: s.products.map((p) => ids.includes(p.id) ? { ...p, is_active: false } : p) }))
    return { error }
  },

  hardDeleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
    return { error }
  },

  fetchProductHistory: async (productId) => {
    const { data, error } = await supabase
      .from('product_history')
      .select(`*, profiles(full_name, avatar_url)`)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) set({ history: data || [] })
    return { error }
  },

  getFilteredProducts: () => {
    const { products, filters } = get()
    return products.filter((p) => {
      if (filters.status === 'active' && !p.is_active) return false
      if (filters.status === 'inactive' && p.is_active) return false
      if (filters.status === 'low_stock') {
        if (!p.is_active) return false
        if (!(p.current_quantity <= p.min_quantity && p.min_quantity > 0)) return false
      }
      if (filters.categoryId && p.category_id !== filters.categoryId) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      }
      return true
    })
  },
}))
