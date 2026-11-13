import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { ensureAffected } from '@/shared/utils/supabaseResult'

const UNIQUE_VIOLATION = '23505'
const ITEM_SELECT = `*, profiles!purchase_items_purchased_by_fkey(id, full_name, avatar_url), categories(name, color)`

// Agrega una fila o, si ya está (la trajo antes un evento en vivo), la actualiza
const upsertById = (items, row) => (items.some((i) => i.id === row.id)
  ? items.map((i) => (i.id === row.id ? { ...i, ...row } : i))
  : [...items, row])

// Lectura del carrito: una a la vez, y la última respuesta siempre refleja el estado más reciente.
// Si algo cambia durante una lectura, su respuesta se descarta y se vuelve a leer: las respuestas
// lentas o fuera de orden no pueden revivir productos eliminados ni pisar cambios recientes.
const cartSync = { running: null, stale: false, sessionId: null }
const markCartChanged = () => { if (cartSync.running) cartSync.stale = true }

// Inserciones en curso por producto del presupuesto: la segunda espera a la primera
const budgetItemInserts = new Map()

export const useShoppingStore = create((set, get) => ({
  session: null,
  participants: [],
  locks: [],
  purchaseItems: [],
  loading: false,
  realtimeChannel: null,
  // Estado de la conexión en vivo: 'SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED' o null
  realtimeStatus: null,
  // Compras sin finalizar del hogar (para ofrecer retomarlas desde cualquier pantalla)
  activeSessions: [],

  fetchActiveSessions: async (workspaceId) => {
    if (!workspaceId) { set({ activeSessions: [] }); return { error: null } }
    const { data, error } = await supabase
      .from('shopping_sessions')
      .select('id, budget_id, started_at, budgets(name, store, status)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
    if (!error) set({ activeSessions: (data || []).filter((s) => s.budgets?.status === 'active') })
    return { error }
  },

  startSession: async (budgetId, workspaceId, userId) => {
    set({ loading: true })
    let { data, error } = await supabase
      .from('shopping_sessions')
      .insert({ budget_id: budgetId, workspace_id: workspaceId, status: 'active', created_by: userId })
      .select()
      .single()

    // Otro dispositivo inició esta compra al mismo tiempo: se usa esa sesión en lugar de fallar
    if (error?.code === UNIQUE_VIOLATION) {
      const { data: active } = await supabase
        .from('shopping_sessions')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      if (active) { data = active; error = null }
    }

    if (!error && data) {
      set({ session: data })
      await supabase
        .from('shopping_participants')
        .upsert({ session_id: data.id, user_id: userId }, { onConflict: 'session_id,user_id' })
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
    if (!sessionId) return { error: null }
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
    } else if (error) {
      console.error('fetchSession failed', error)
    }
    return { error }
  },

  // A stray/orphaned realtime callback, a transient network error, or a call
  // made with a not-yet-resolved sessionId must never silently wipe the cart —
  // each guard below keeps the last known-good state instead of clearing it.
  fetchParticipants: async (sessionId) => {
    if (!sessionId) return
    const { data, error } = await supabase
      .from('shopping_participants')
      .select(`*, profiles(id, full_name, avatar_url, email)`)
      .eq('session_id', sessionId)
    if (error) { console.error('fetchParticipants failed', error); return }
    if (get().session?.id !== sessionId) return
    set({ participants: data || [] })
  },

  fetchLocks: async (sessionId) => {
    if (!sessionId) return
    const { data, error } = await supabase
      .from('product_locks')
      .select(`*, profiles(id, full_name, avatar_url)`)
      .eq('session_id', sessionId)
    if (error) { console.error('fetchLocks failed', error); return }
    if (get().session?.id !== sessionId) return
    set({ locks: data || [] })
  },

  fetchPurchaseItems: (sessionId) => {
    if (!sessionId) return undefined
    cartSync.sessionId = sessionId
    if (cartSync.running) { cartSync.stale = true; return cartSync.running }

    cartSync.running = (async () => {
      try {
        do {
          cartSync.stale = false
          const requested = cartSync.sessionId
          const { data, error } = await supabase
            .from('purchase_items')
            .select(ITEM_SELECT)
            .eq('session_id', requested)
            .order('created_at')
            .order('id')
          if (error) { console.error('fetchPurchaseItems failed', error); return }
          if (!cartSync.stale && get().session?.id === requested) set({ purchaseItems: data || [] })
        } while (cartSync.stale)
      } finally {
        cartSync.running = null
      }
    })()
    return cartSync.running
  },

  // Busca el producto del presupuesto ya agregado: primero aquí y luego en la base,
  // porque puede haberlo comprado otra persona sin que el aviso en vivo haya llegado.
  findCartRow: async (sessionId, budgetItemId) => {
    const local = get().purchaseItems.find((i) => i.budget_item_id === budgetItemId)
    if (local) return local
    const { data } = await supabase
      .from('purchase_items')
      .select(ITEM_SELECT)
      .eq('session_id', sessionId)
      .eq('budget_item_id', budgetItemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) set((s) => ({ purchaseItems: upsertById(s.purchaseItems, data) }))
    return data ?? null
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

  // Sin producto vinculado: usa el del inventario con ese nombre y, si no existe, lo crea
  resolveProductId: async (item, userId, workspaceId) => {
    if (item.product_id) return item.product_id
    const name = item.product_name?.trim()
    if (!name || !workspaceId) return null

    const pattern = name.replace(/[\\%_]/g, '\\$&')
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .ilike('name', pattern)
      .limit(1)
      .maybeSingle()
    if (existing) return existing.id

    const { data: created } = await supabase
      .from('products')
      .insert({
        name,
        workspace_id: workspaceId,
        category_id: item.category_id || null,
        unit: item.unit || 'unidad',
        current_quantity: 0,
        created_by: userId,
      })
      .select('id')
      .single()
    return created?.id ?? null
  },

  // Un producto del presupuesto solo entra una vez al carrito de la compra. Si ya está:
  //   onExisting 'keep'   → se deja como está (marcar con un toque, agregar varios)
  //   onExisting 'update' → se le aplican los datos del formulario, como el precio
  // El resultado lleva `existed: true` en esos casos.
  addPurchaseItem: async (sessionId, purchaseId, item, userId, workspaceId, { onExisting = 'keep' } = {}) => {
    const insertRow = async () => {
      const productId = await get().resolveProductId(item, userId, workspaceId)
      const { data, error } = await supabase
        .from('purchase_items')
        .insert({
          ...item,
          product_id: productId,
          session_id: sessionId,
          purchase_id: purchaseId,
          purchased_by: userId,
        })
        .select(ITEM_SELECT)
        .single()
      if (!error && data) {
        set((s) => ({ purchaseItems: upsertById(s.purchaseItems, data) }))
        markCartChanged()
      }
      return { data, error }
    }

    const budgetItemId = item.budget_item_id
    if (!budgetItemId) return insertRow()

    const useExisting = async (row) => {
      if (onExisting !== 'update') return { data: row, error: null, existed: true }
      const { quantity, unit_price, total_price, unit, brand, is_household } = item
      const { data, error } = await get().updatePurchaseItem(row.id, { quantity, unit_price, total_price, unit, brand, is_household })
      return { data: data ?? row, error, existed: true }
    }

    const previous = budgetItemInserts.get(budgetItemId)
    const task = (async () => {
      if (previous) await previous.catch(() => {})
      const existing = await get().findCartRow(sessionId, budgetItemId)
      if (existing) return useExisting(existing)

      const result = await insertRow()
      // Otra persona lo agregó justo ahora y el índice único de la base lo rechazó
      if (result.error?.code === UNIQUE_VIOLATION) {
        const winner = await get().findCartRow(sessionId, budgetItemId)
        if (winner) return useExisting(winner)
      }
      return result
    })()

    budgetItemInserts.set(budgetItemId, task)
    try {
      return await task
    } finally {
      if (budgetItemInserts.get(budgetItemId) === task) budgetItemInserts.delete(budgetItemId)
    }
  },

  updatePurchaseItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('purchase_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      set((s) => ({ purchaseItems: s.purchaseItems.map((i) => i.id === id ? { ...i, ...data } : i) }))
      markCartChanged()
    }
    return { data, error }
  },

  // Cambia solo la cantidad con respuesta inmediata (el total del carrito sale de
  // purchaseItems) y revierte si el servidor falla. Si el importe era "precio ×
  // cantidad" se reescala; si era un total fijo, solo cambia la cantidad.
  changePurchaseItemQuantity: async (id, quantity) => {
    const prev = get().purchaseItems.find((i) => i.id === id)
    if (!prev) return { error: new Error('Producto no encontrado') }
    const unitPrice = prev.unit_price != null ? Number(prev.unit_price) : null
    const perUnit = unitPrice != null && prev.total_price != null
      && Math.abs(Number(prev.total_price) - unitPrice * Number(prev.quantity)) < 0.01
    const patch = perUnit
      ? { quantity, total_price: Math.round(unitPrice * quantity * 100) / 100 }
      : { quantity }

    const apply = (fields) => set((s) => ({ purchaseItems: s.purchaseItems.map((i) => i.id === id ? { ...i, ...fields } : i) }))
    apply(patch)
    const { error } = await supabase.from('purchase_items').update(patch).eq('id', id)
    if (error) apply({ quantity: prev.quantity, total_price: prev.total_price })
    markCartChanged()
    return { error }
  },

  removePurchaseItem: async (id) => {
    const { error } = ensureAffected(await supabase.from('purchase_items').delete().eq('id', id).select('id'))
    if (!error) {
      set((s) => ({ purchaseItems: s.purchaseItems.filter((i) => i.id !== id) }))
      markCartChanged()
    }
    return { error }
  },

  removePurchaseItemsBulk: async (ids) => {
    if (!ids.length) return { error: null }
    const { error } = ensureAffected(await supabase.from('purchase_items').delete().in('id', ids).select('id'))
    if (!error) {
      set((s) => ({ purchaseItems: s.purchaseItems.filter((i) => !ids.includes(i.id)) }))
      markCartChanged()
    }
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
      .subscribe((status) => {
        if (get().realtimeChannel === channel || !get().realtimeChannel) set({ realtimeStatus: status })
      })

    set({ realtimeChannel: channel })
  },

  unsubscribe: () => {
    const { realtimeChannel } = get()
    if (realtimeChannel) { set({ realtimeChannel: null, realtimeStatus: null }); supabase.removeChannel(realtimeChannel) }
  },

  getTotals: () => get().purchaseItems.reduce((acc, i) => acc + (i.total_price || 0), 0),
  getLockForItem: (budgetItemId) => get().locks.find((l) => l.budget_item_id === budgetItemId) || null,
}))
