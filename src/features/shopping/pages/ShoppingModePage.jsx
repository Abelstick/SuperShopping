import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Box, Typography, Card, IconButton, Avatar, AvatarGroup, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, CircularProgress, Skeleton, Tab, Tabs, TextField, InputAdornment, useMediaQuery, useTheme,
} from '@mui/material'
import {
  ShoppingCart, Add, ArrowBack, Checklist, Delete, Store, Search, Close, DensitySmall, DensityMedium,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '@/features/budgets/store/budgetStore'
import { useInventoryStore } from '@/features/inventory/store/inventoryStore'
import { useShoppingStore } from '../store/shoppingStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import AdjustTotalDialog from '@/features/purchases/components/AdjustTotalDialog'
import EditPurchaseItemDialog from '@/features/purchases/components/EditPurchaseItemDialog'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import { CategoryIcon, ConfirmDialog, NameList, RowDivider } from '@/shared/components/ui'
import { fmtMoney } from '@/shared/utils/format'
import { roundQty, stepFor } from '@/shared/utils/quantity'
import { normalizeText } from '@/shared/utils/text'
import AddItemDialog from '../components/AddItemDialog'
import { CartItemRow, InventorySuggestionRow, PendingItemRow } from '../components/ShoppingRows'
import { SpendDock, SpendTicket } from '../components/SpendSummary'
import { FS, NUM } from '@/theme/tokens'

const COMPACT_KEY = 'shopping.headerCompact'
const DENSITY_KEY = 'shopping.density'
const SUGGESTIONS_MAX = 6
// Separación entre el último producto y la barra del gasto
const DOCK_GAP = 24
const NO_CATEGORY = 'none'

// Sin preferencia guardada, el celular arranca en vista compacta (más productos a la vista)
const isSmallScreen = () => { try { return window.matchMedia('(max-width:639.95px)').matches } catch { return false } }
const readCompact = () => {
  try {
    const v = localStorage.getItem(COMPACT_KEY)
    return v === null ? isSmallScreen() : v === '1'
  } catch { return isSmallScreen() }
}
const readDensity = () => {
  try {
    const v = localStorage.getItem(DENSITY_KEY)
    if (v === 'compact' || v === 'comfortable') return v
  } catch { /* sin almacenamiento */ }
  return isSmallScreen() ? 'compact' : 'comfortable'
}

const subscribeOnline = (cb) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb) }
}

// Estado de sincronización: un producto marcado por otra persona aparece solo si hay conexión en vivo
function LiveStatus() {
  const theme = useTheme()
  const st = theme.vars.palette.stock.riesgo
  const realtimeStatus = useShoppingStore((s) => s.realtimeStatus)
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const state = !online ? 'offline' : realtimeStatus === 'SUBSCRIBED' ? 'live' : 'connecting'
  const skin = {
    live: { label: 'En vivo', color: theme.vars.palette.primary.main, animation: 'shopPulse 1.6s ease-in-out infinite' },
    connecting: { label: 'Conectando…', color: theme.vars.palette.text.secondary },
    offline: { label: 'Sin conexión', color: st.text },
  }[state]
  return (
    <Box role="status" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: skin.color, flexShrink: 0 }}>
      <Box sx={{
        width: 8, height: 8, borderRadius: '50%', bgcolor: skin.color, animation: skin.animation,
        '@keyframes shopPulse': { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.45, transform: 'scale(0.75)' } },
      }} />
      <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 600, color: 'inherit', lineHeight: 1.4 }}>{skin.label}</Typography>
    </Box>
  )
}

// Agrupa por categoría siguiendo el orden del hogar; lo que no tiene categoría va al final
function groupByCategory(items, categories) {
  const order = new Map(categories.map((c, i) => [c.id, i]))
  const groups = new Map()
  items.forEach((item) => {
    const key = item.category_id && item.categories ? item.category_id : NO_CATEGORY
    if (!groups.has(key)) groups.set(key, { key, category: key === NO_CATEGORY ? null : item.categories, items: [] })
    groups.get(key).items.push(item)
  })
  const rank = (g) => (g.key === NO_CATEGORY ? Infinity : order.get(g.key) ?? Infinity - 1)
  return [...groups.values()].sort((a, b) => rank(a) - rank(b))
}

function SectionTitle({ children, count }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
      <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{children}</Typography>
      <Typography component="span" sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>{count}</Typography>
    </Box>
  )
}

// Encabezado de una lista con modo de selección múltiple
// Con pestañas, el título ya está en la pestaña y "Seleccionar varios" vive en la cabecera
function SelectBar({ title, count, selectMode, selectedCount, onEnter, hideIdle, children }) {
  if (hideIdle && !selectMode) return null
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', minHeight: 44, mb: 0.5 }}>
      {selectMode ? (
        <>
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, color: 'text.secondary' }}>
            {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>{children}</Box>
        </>
      ) : (
        <>
          <SectionTitle count={count}>{title}</SectionTitle>
          <Button onClick={onEnter} sx={{ px: 1 }}>Seleccionar varios</Button>
        </>
      )}
    </Box>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ShoppingModePage() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const budgetId = searchParams.get('budgetId')
  const navigate = useNavigate()
  const theme = useTheme()
  const isWide = useMediaQuery('(min-width:900px)', { noSsr: true })

  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { currentBudget, budgetItems, fetchBudgetWithItems, updateBudget } = useBudgetStore()
  const { products, categories, fetchProducts, fetchCategories } = useInventoryStore()
  const {
    session, participants, purchaseItems,
    loading, startSession, fetchSession, completeSession,
    getTotals, getLockForItem, removePurchaseItem, removePurchaseItemsBulk, unsubscribe,
    updatePurchaseItem, addPurchaseItem, unlockItem, changePurchaseItemQuantity,
  } = useShoppingStore()
  const { createPurchase, updatePurchase } = usePurchaseStore()
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()

  const [purchase, setPurchase] = useState(null)
  const [addItemDialog, setAddItemDialog] = useState({ open: false, item: null })
  const [editItemDialog, setEditItemDialog] = useState({ open: false, item: null })
  const [completing, setCompleting] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [initError, setInitError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const [tab, setTab] = useState('pending')
  const [exitConfirm, setExitConfirm] = useState(false)
  const [completeDialog, setCompleteDialog] = useState(false)
  const [deleteItemConfirm, setDeleteItemConfirm] = useState(null)
  const [deletingItem, setDeletingItem] = useState(false)
  const [boughtSelectMode, setBoughtSelectMode] = useState(false)
  const [boughtSelectedIds, setBoughtSelectedIds] = useState(new Set())
  const [boughtBulkDeleteConfirm, setBoughtBulkDeleteConfirm] = useState(false)
  const [boughtBulkDeleting, setBoughtBulkDeleting] = useState(false)
  const [pendingSelectMode, setPendingSelectMode] = useState(false)
  const [pendingSelectedIds, setPendingSelectedIds] = useState(new Set())
  const [pendingBulkAdding, setPendingBulkAdding] = useState(false)
  const [quickAdding, setQuickAdding] = useState(new Set())
  const [query, setQuery] = useState('')
  const [headerCompact, setHeaderCompact] = useState(readCompact)
  const [density, setDensity] = useState(readDensity)
  const compact = density === 'compact'
  const [dockHeight, setDockHeight] = useState(0)
  const previousDockHeight = useRef(0)

  // Si la barra del gasto crece estando al final de la lista, la vista sube lo mismo:
  // así el último producto sigue a la vista sin tener que desplazarse.
  useLayoutEffect(() => {
    const previous = previousDockHeight.current
    previousDockHeight.current = dockHeight
    const growth = dockHeight - previous
    if (previous === 0 || growth <= 0) return
    const distanceToEnd = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)
    if (distanceToEnd <= growth + 4) window.scrollBy(0, growth)
  }, [dockHeight])

  const toggleDensity = () => {
    setDensity((d) => {
      const next = d === 'compact' ? 'comfortable' : 'compact'
      try { localStorage.setItem(DENSITY_KEY, next) } catch { /* sin almacenamiento */ }
      return next
    })
  }

  const toggleHeaderCompact = () => {
    setHeaderCompact((c) => {
      try { localStorage.setItem(COMPACT_KEY, c ? '0' : '1') } catch { /* sin almacenamiento */ }
      return !c
    })
  }

  // React StrictMode mounts effects twice in development to surface unguarded
  // side effects; without this guard, init() would run concurrently both times
  // and — since neither run sees the other's still-in-flight insert — create
  // two shopping_sessions/purchases rows for the same visit.
  const initKeyRef = useRef(null)
  // Iniciar una compra nueva requiere el hogar, que puede cargar después que esta pantalla
  const workspaceReady = Boolean(sessionId || currentWorkspace)

  useEffect(() => {
    const resolveSessionPurchase = async (sessId, workspaceId, budgetIdRef) => {
      const { data: existing } = await supabase
        .from('purchases')
        .select('id, name, total_amount')
        .eq('session_id', sessId)
        .maybeSingle()

      if (existing) return existing

      const budgetName = currentBudget?.name ?? ''
      const { data: created } = await createPurchase(
        workspaceId,
        {
          name: `Compra${budgetName ? ` · ${budgetName}` : ''} · ${new Date().toLocaleDateString()}`,
          budget_id: budgetIdRef,
          session_id: sessId,
          date: new Date().toISOString().split('T')[0],
        },
        user.id
      )
      if (created) return created

      // Otro dispositivo la creó al mismo tiempo (session_id es único)
      const { data: other } = await supabase
        .from('purchases')
        .select('id, name, total_amount')
        .eq('session_id', sessId)
        .maybeSingle()
      return other ?? null
    }

    const init = async () => {
      try {
        if (sessionId) {
          const { error: sessionError } = await fetchSession(sessionId, user.id)
          if (sessionError) setInitError({ message: sessionError.message || 'Sin detalle del servidor' })
          const { data: purch } = await supabase
            .from('purchases')
            .select('id, name, total_amount')
            .eq('session_id', sessionId)
            .maybeSingle()
          if (purch) setPurchase(purch)
          setInitialized(true)
        } else if (budgetId && currentWorkspace && user) {
          await fetchBudgetWithItems(budgetId)

          // Resume the budget's active session instead of starting a new one —
          // otherwise every "Iniciar compra" click orphans the previous session's
          // progress (items stay in the DB but become unreachable from the UI).
          const { data: existingSessions, error: existingSessionsError } = await supabase
            .from('shopping_sessions')
            .select('id')
            .eq('budget_id', budgetId)
            .eq('status', 'active')
            .order('started_at', { ascending: false })
            .limit(1)

          if (existingSessionsError) console.error('Lookup of active session failed', existingSessionsError)

          if (existingSessions?.[0]) {
            navigate(`/shopping/${existingSessions[0].id}`, { replace: true })
            return
          }

          const { data: sess, error: startError } = await startSession(budgetId, currentWorkspace.id, user.id)
          if (startError) setInitError({ message: startError.message || 'Sin detalle del servidor' })
          if (sess) {
            const purch = await resolveSessionPurchase(sess.id, currentWorkspace.id, budgetId)
            if (purch) setPurchase(purch)
            navigate(`/shopping/${sess.id}`, { replace: true })
          }
          setInitialized(true)
        }
      } catch (e) {
        setInitError({ message: e?.message || 'Sin detalle del servidor' })
        setInitialized(true)
      }
    }

    const key = `${sessionId || ''}|${budgetId || ''}|${user?.id || ''}|${retryTick}`
    if (user && workspaceReady && initKeyRef.current !== key) {
      initKeyRef.current = key
      init()
    }
    return () => unsubscribe()
  }, [sessionId, budgetId, user?.id, retryTick, workspaceReady])

  // Al retomar por enlace puede haber en memoria otro presupuesto: siempre se carga el de la sesión
  useEffect(() => {
    if (session?.budget_id && currentBudget?.id !== session.budget_id) fetchBudgetWithItems(session.budget_id)
  }, [session?.budget_id])

  useEffect(() => {
    if (currentWorkspace) {
      fetchProducts(currentWorkspace.id)
      fetchCategories(currentWorkspace.id)
    }
  }, [currentWorkspace?.id])

  const totalSpent = getTotals()
  const budget = currentBudget?.target_amount || 0

  const purchasedIds = new Set(purchaseItems.map((p) => p.budget_item_id).filter(Boolean))
  const pendingItems = budgetItems.filter((i) => !purchasedIds.has(i.id))

  const q = normalizeText(query)
  const matches = (...fields) => !q || fields.some((f) => normalizeText(f).includes(q))
  const visiblePending = pendingItems.filter((i) => matches(i.product_name, i.categories?.name))
  const visiblePurchased = purchaseItems.filter((i) => matches(i.product_name, i.brand))

  // Productos del inventario que coinciden y aún no están en el carrito ni como pendiente del presupuesto
  const inCartProductIds = new Set(purchaseItems.map((p) => p.product_id).filter(Boolean))
  const pendingProductIds = new Set(pendingItems.map((p) => p.product_id).filter(Boolean))
  const suggestionsAll = q
    ? products.filter((p) => p.is_active && !inCartProductIds.has(p.id) && !pendingProductIds.has(p.id) && matches(p.name, p.categories?.name))
    : []
  const suggestions = suggestionsAll.slice(0, SUGGESTIONS_MAX)
  const noResults = Boolean(q) && visiblePending.length === 0 && visiblePurchased.length === 0 && suggestionsAll.length === 0

  const handleStep = async (item, dir) => {
    const next = roundQty(Number(item.quantity) + dir * stepFor(item.unit))
    if (next <= 0) return
    const { error } = await changePurchaseItemQuantity(item.id, next)
    if (error) enqueueSnackbar('No se pudo cambiar la cantidad', { variant: 'error' })
  }

  const exitBoughtSelectMode = () => {
    setBoughtSelectMode(false)
    setBoughtSelectedIds(new Set())
  }

  const toggleBoughtSelected = (id) => {
    setBoughtSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBoughtBulkDelete = async () => {
    setBoughtBulkDeleting(true)
    const { error } = await removePurchaseItemsBulk([...boughtSelectedIds])
    setBoughtBulkDeleting(false)
    setBoughtBulkDeleteConfirm(false)
    if (error) enqueueSnackbar('Error al eliminar los productos', { variant: 'error' })
    else {
      enqueueSnackbar(`${boughtSelectedIds.size} producto${boughtSelectedIds.size !== 1 ? 's' : ''} eliminado${boughtSelectedIds.size !== 1 ? 's' : ''} de la compra`, { variant: 'success' })
      exitBoughtSelectMode()
    }
  }

  const handleDeleteBought = async () => {
    setDeletingItem(true)
    const { error } = await removePurchaseItem(deleteItemConfirm.id)
    setDeletingItem(false)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Producto eliminado', { variant: 'success' })
    setDeleteItemConfirm(null)
  }

  const exitPendingSelectMode = () => {
    setPendingSelectMode(false)
    setPendingSelectedIds(new Set())
  }

  const togglePendingSelected = (id) => {
    setPendingSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Pasa un producto del presupuesto al carrito con su cantidad y precio estimado
  const addBudgetItemToCart = async (budgetItem) => {
    const result = await addPurchaseItem(
      session.id, purchase?.id,
      {
        product_name: budgetItem.product_name,
        brand: null,
        quantity: budgetItem.quantity,
        unit_price: budgetItem.estimated_price ?? null,
        total_price: budgetItem.estimated_price ?? null,
        unit: budgetItem.unit,
        budget_item_id: budgetItem.id,
        product_id: budgetItem.product_id || null,
        category_id: budgetItem.category_id || null,
        is_household: true,
      },
      user.id,
      currentWorkspace?.id,
    )
    if (!result.error) await unlockItem(session.id, budgetItem.id)
    return result
  }

  const handleAddSelectedPending = async () => {
    const items = pendingItems.filter((i) => pendingSelectedIds.has(i.id))
    setPendingBulkAdding(true)
    const results = await Promise.all(items.map(async (budgetItem) => (await addBudgetItemToCart(budgetItem)).error))
    setPendingBulkAdding(false)
    exitPendingSelectMode()
    const failed = results.filter(Boolean).length
    const added = items.length - failed
    if (failed) enqueueSnackbar(`${added} agregado${added !== 1 ? 's' : ''}, ${failed} con error`, { variant: 'warning' })
    else enqueueSnackbar(`${added} producto${added !== 1 ? 's' : ''} agregado${added !== 1 ? 's' : ''} al carrito — revisa cantidad y precio`, { variant: 'success' })
  }

  // Marcar con un toque: si hay precio estimado se agrega al momento y se puede deshacer;
  // sin precio hace falta el formulario, para no registrar un gasto vacío.
  const handleQuickAdd = async (budgetItem) => {
    if (!budgetItem.estimated_price) {
      setAddItemDialog({ open: true, item: budgetItem })
      return
    }
    setQuickAdding((prev) => new Set(prev).add(budgetItem.id))
    const { data, error, existed } = await addBudgetItemToCart(budgetItem)
    setQuickAdding((prev) => { const next = new Set(prev); next.delete(budgetItem.id); return next })
    if (error) {
      enqueueSnackbar('Error al agregar el producto', { variant: 'error' })
      return
    }
    // Ya lo había agregado alguien: no se ofrece Deshacer para no borrar esa fila
    if (existed) {
      enqueueSnackbar(`"${budgetItem.product_name}" ya estaba en el carrito`, { variant: 'info' })
      return
    }
    enqueueSnackbar(`"${budgetItem.product_name}" agregado`, {
      variant: 'success',
      action: (key) => (
        <Button
          color="inherit"
          sx={{ minHeight: 36, fontWeight: 700 }}
          onClick={async () => {
            closeSnackbar(key)
            const { error: undoError } = await removePurchaseItem(data.id)
            if (undoError) enqueueSnackbar('Error al eliminar', { variant: 'error' })
          }}
        >
          Deshacer
        </Button>
      ),
    })
  }

  const handleComplete = async (finalTotal) => {
    if (!session) return
    setCompleting(true)

    // Persist the final (possibly adjusted) total before marking as completed —
    // the till total doesn't always match the sum of what was entered per item.
    if (purchase?.id) {
      await updatePurchase(purchase.id, { total_amount: finalTotal })
    }

    const [{ error: sessErr }] = await Promise.all([
      completeSession(session.id),
      session.budget_id
        ? updateBudget(session.budget_id, { status: 'completed' })
        : Promise.resolve(),
    ])

    setCompleting(false)
    setCompleteDialog(false)
    if (sessErr) {
      enqueueSnackbar('Error al finalizar la compra', { variant: 'error' })
    } else {
      enqueueSnackbar('¡Compra finalizada! Se actualizó el inventario y el presupuesto quedó completado.', { variant: 'success' })
      navigate('/purchases')
    }
  }

  const retryInit = () => { setInitError(null); setInitialized(false); setRetryTick((t) => t + 1) }
  const missingIds = !sessionId && !budgetId

  // ── Error de inicio: causa concreta + Reintentar ──
  if (missingIds || initError) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box><Button startIcon={<ArrowBack />} onClick={() => navigate('/budgets')} sx={{ color: 'text.secondary' }}>Presupuestos</Button></Box>
        <LoadErrorBanner
          message={missingIds ? 'No se encontró la sesión de compra.' : initError.message}
          onRetry={missingIds ? () => navigate('/budgets') : retryInit}
        />
      </Box>
    )
  }

  // ── Cargando: skeleton con la forma de la pantalla ──
  if (!initialized || loading) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }} aria-busy="true">
        <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Iniciando modo compra…</Typography>
        <Skeleton variant="rectangular" height={44} />
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: '12px' }} />)}
      </Box>
    )
  }

  const boughtNames = purchaseItems.filter((i) => boughtSelectedIds.has(i.id)).map((i) => i.product_name)
  const densityLabel = compact ? 'Cambiar a vista cómoda' : 'Cambiar a vista compacta'
  const showPending = isWide || Boolean(q) || tab === 'pending'
  const showCart = isWide || Boolean(q) || tab === 'cart'
  const openAdd = () => setAddItemDialog({ open: true, item: null })
  const openFinish = () => setCompleteDialog(true)
  const isEmpty = !q && pendingItems.length === 0 && purchaseItems.length === 0
  const hasTabs = !isWide && !q
  const enterPendingSelect = () => { setPendingSelectMode(true); setPendingSelectedIds(new Set()) }
  const enterBoughtSelect = () => { setBoughtSelectMode(true); setBoughtSelectedIds(new Set()) }
  const tabCanSelect = tab === 'pending' ? pendingItems.length > 0 && !pendingSelectMode : purchaseItems.length > 0 && !boughtSelectMode

  // ── Lista de pendientes agrupada por categoría ──
  const pendingList = pendingItems.length > 0 && (!q || visiblePending.length > 0) && (
    <Box component="section" sx={{ minWidth: 0 }}>
      <SelectBar
        title="Pendientes"
        count={q ? `${visiblePending.length}/${pendingItems.length}` : pendingItems.length}
        selectMode={pendingSelectMode}
        selectedCount={pendingSelectedIds.size}
        onEnter={enterPendingSelect}
        hideIdle={hasTabs}
      >
        <Button
          sx={{ px: 1 }}
          onClick={() => setPendingSelectedIds(new Set(
            visiblePending.filter((i) => { const l = getLockForItem(i.id); return !l || l.user_id === user?.id }).map((i) => i.id)
          ))}
        >
          Todos
        </Button>
        <Button sx={{ px: 1 }} onClick={() => setPendingSelectedIds(new Set())}>Ninguno</Button>
        <Button
          variant="outlined"
          disabled={pendingSelectedIds.size === 0 || pendingBulkAdding}
          onClick={handleAddSelectedPending}
          startIcon={pendingBulkAdding ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {pendingBulkAdding ? 'Agregando…' : `Agregar (${pendingSelectedIds.size})`}
        </Button>
        <Button color="inherit" onClick={exitPendingSelectMode} sx={{ color: 'text.secondary', px: 1 }}>Cancelar</Button>
      </SelectBar>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {groupByCategory(visiblePending, categories).map((group) => (
          <Box key={group.key} component="section" aria-label={group.category?.name ?? 'Sin categoría'}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5, pb: 0.75 }}>
              <CategoryIcon category={group.category} size={24} />
              <Typography component="h3" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'text.secondary', flexGrow: 1 }} noWrap>
                {group.category?.name ?? 'Sin categoría'}
                {group.category?.aisle ? ` · Pasillo ${group.category.aisle}` : ''}
              </Typography>
              <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', flexShrink: 0 }}>{group.items.length}</Typography>
            </Box>
            <Card>
              {group.items.map((item, i) => {
                const lock = getLockForItem(item.id)
                return (
                  <Box key={item.id}>
                    <PendingItemRow
                      item={item}
                      compact={compact}
                      lock={lock}
                      isLockedByMe={lock?.user_id === user?.id}
                      sessionId={session?.id}
                      userId={user?.id}
                      busy={quickAdding.has(item.id)}
                      onOpen={(it) => setAddItemDialog({ open: true, item: it })}
                      onQuickAdd={handleQuickAdd}
                      selectMode={pendingSelectMode}
                      selected={pendingSelectedIds.has(item.id)}
                      onToggleSelect={() => togglePendingSelected(item.id)}
                    />
                    {i < group.items.length - 1 && <RowDivider inset={1.5} />}
                  </Box>
                )
              })}
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  )

  // ── Carrito ──
  const cartList = purchaseItems.length > 0 && (!q || visiblePurchased.length > 0) && (
    <Box component="section" sx={{ minWidth: 0 }}>
      <SelectBar
        title="Agregados al carrito"
        count={q ? `${visiblePurchased.length}/${purchaseItems.length}` : purchaseItems.length}
        selectMode={boughtSelectMode}
        selectedCount={boughtSelectedIds.size}
        onEnter={enterBoughtSelect}
        hideIdle={hasTabs}
      >
        <Button sx={{ px: 1 }} onClick={() => setBoughtSelectedIds(new Set(visiblePurchased.map((i) => i.id)))}>Todos</Button>
        <Button sx={{ px: 1 }} onClick={() => setBoughtSelectedIds(new Set())}>Ninguno</Button>
        <Button variant="outlined" startIcon={<Delete sx={{ fontSize: 20 }} />} disabled={boughtSelectedIds.size === 0} onClick={() => setBoughtBulkDeleteConfirm(true)}>
          Eliminar
        </Button>
        <Button color="inherit" onClick={exitBoughtSelectMode} sx={{ color: 'text.secondary', px: 1 }}>Cancelar</Button>
      </SelectBar>
      <Card>
        {visiblePurchased.map((pi, i) => (
          <Box key={pi.id}>
            <CartItemRow
              item={pi}
              compact={compact}
              onRemove={(item) => setDeleteItemConfirm(item)}
              onEdit={(item) => setEditItemDialog({ open: true, item })}
              onStep={handleStep}
              selectMode={boughtSelectMode}
              selected={boughtSelectedIds.has(pi.id)}
              onToggleSelect={() => toggleBoughtSelected(pi.id)}
            />
            {i < visiblePurchased.length - 1 && <RowDivider inset={1.5} />}
          </Box>
        ))}
      </Card>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100dvh', pb: isWide ? 3 : (dockHeight ? `${dockHeight + DOCK_GAP}px` : 'calc(112px + env(safe-area-inset-bottom, 0px))') }}>
      {/* ── Cabecera fija: qué se compra, quién está y el buscador ── */}
      <Box
        component="header"
        sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', pt: 'env(safe-area-inset-top, 0px)' }}
      >
        <Box sx={{ maxWidth: isWide ? 1200 : 720, mx: 'auto', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 56 }}>
            <IconButton aria-label="Salir del modo compra" onClick={() => setExitConfirm(true)} sx={{ ml: -1, flexShrink: 0 }}>
              <ArrowBack />
            </IconButton>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.015em' }} noWrap>{currentBudget?.name ?? 'Modo Compra'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <LiveStatus />
                {currentBudget?.store && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, color: 'text.secondary' }}>
                    <Store sx={{ fontSize: 15, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: FS.meta, color: 'inherit', lineHeight: 1.4 }} noWrap>{currentBudget.store}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <AvatarGroup max={3} sx={{ flexShrink: 0, '& .MuiAvatar-root': { width: 30, height: 30, fontSize: FS.meta, border: `2px solid ${theme.vars.palette.background.default}` } }}>
              {participants.map((p) => (
                <Tooltip key={p.id} title={p.profiles?.full_name ?? ''}>
                  <Avatar src={p.profiles?.avatar_url} alt={p.profiles?.full_name ?? ''} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    {p.profiles?.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          </Box>

          {/* Buscador (pendientes, carrito e inventario) + densidad de la lista */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: isWide || q ? 1.25 : 0.5 }}>
            <TextField
              fullWidth
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
              slotProps={{
                htmlInput: { 'aria-label': 'Buscar producto', inputMode: 'search', enterKeyHint: 'search', autoComplete: 'off' },
                input: {
                  startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <IconButton size="small" aria-label="Limpiar búsqueda" onClick={() => setQuery('')} edge="end"><Close fontSize="small" /></IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
            {hasTabs && tabCanSelect && (
              <Tooltip title="Seleccionar varios">
                <IconButton aria-label="Seleccionar varios" onClick={tab === 'pending' ? enterPendingSelect : enterBoughtSelect} sx={{ flexShrink: 0, color: 'text.secondary', mr: -1 }}>
                  <Checklist fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={densityLabel}>
              <IconButton aria-label={densityLabel} onClick={toggleDensity} sx={{ flexShrink: 0, color: 'text.secondary' }}>
                {compact ? <DensitySmall fontSize="small" /> : <DensityMedium fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Una lista a la vez en pantallas estrechas */}
          {hasTabs && (
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" aria-label="Productos de la compra">
              <Tab value="pending" label={`Pendientes ${pendingItems.length}`} sx={NUM} />
              <Tab value="cart" label={`En carrito ${purchaseItems.length}`} sx={NUM} />
            </Tabs>
          )}
        </Box>
      </Box>

      {/* ── Contenido ── */}
      <Box
        sx={{
          maxWidth: isWide ? 1200 : 720, mx: 'auto', px: 2, pt: 2,
          display: 'grid', gap: 3, alignItems: 'start',
          gridTemplateColumns: isWide ? 'minmax(0, 1fr) minmax(320px, 400px)' : 'minmax(0, 1fr)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
          {/* Resultados de búsqueda: sin coincidencias + alta rápida */}
          {q && noResults && (
            <Typography role="status" sx={{ fontSize: FS.body, color: 'text.secondary' }}>
              No se encontraron productos para "{query.trim()}".
            </Typography>
          )}
          {q && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setAddItemDialog({ open: true, item: null, name: query.trim() })}
              sx={{ justifyContent: 'flex-start' }}
            >
              Agregar "{query.trim()}" al carrito
            </Button>
          )}

          {suggestions.length > 0 && (
            <Box component="section">
              <Box sx={{ mb: 1 }}><SectionTitle count={suggestionsAll.length}>En tu inventario</SectionTitle></Box>
              <Card>
                {suggestions.map((p, i) => (
                  <Box key={p.id}>
                    <InventorySuggestionRow
                      product={p}
                      compact={compact}
                      onAdd={(product) => setAddItemDialog({ open: true, item: null, product })}
                    />
                    {i < suggestions.length - 1 && <RowDivider inset={1.5} />}
                  </Box>
                ))}
              </Card>
              {suggestionsAll.length > suggestions.length && (
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', mt: 1 }}>
                  +{suggestionsAll.length - suggestions.length} más — escribe más letras para afinar.
                </Typography>
              )}
            </Box>
          )}

          {showPending && pendingList}
          {!isWide && showCart && cartList}

          {/* Cada lista explica su vacío */}
          {isEmpty && (
            <EmptyState
              icon={<ShoppingCart sx={{ fontSize: 28 }} />}
              title="No hay items en el presupuesto."
              body="Usa el botón + para agregar productos."
            />
          )}
          {!isEmpty && !q && showPending && pendingItems.length === 0 && (
            <EmptyState
              icon={<ShoppingCart sx={{ fontSize: 28 }} />}
              title="No quedan pendientes"
              body="Revisa el carrito y finaliza la compra cuando estés listo."
            />
          )}
          {!isEmpty && !q && !isWide && tab === 'cart' && purchaseItems.length === 0 && (
            <EmptyState
              icon={<ShoppingCart sx={{ fontSize: 28 }} />}
              title="El carrito está vacío"
              body="Marca un producto de Pendientes para agregarlo."
            />
          )}
        </Box>

        {/* Escritorio: el ticket acompaña todo el recorrido */}
        {isWide && (
          <Box
            component="aside"
            sx={{ position: 'sticky', top: 140, maxHeight: 'calc(100dvh - 156px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}
          >
            <SpendTicket
              totalSpent={totalSpent}
              budget={budget}
              itemCount={purchaseItems.length}
              onAdd={openAdd}
              onFinish={openFinish}
              completing={completing}
            />
            {cartList}
          </Box>
        )}
      </Box>

      {!isWide && (
        <SpendDock
          totalSpent={totalSpent}
          budget={budget}
          itemCount={purchaseItems.length}
          expanded={!headerCompact}
          onToggleExpanded={toggleHeaderCompact}
          onHeightChange={setDockHeight}
          onAdd={openAdd}
          onFinish={openFinish}
          completing={completing}
        />
      )}

      {/* ── Exit confirmation dialog ── */}
      <Dialog open={exitConfirm} onClose={() => setExitConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Salir del modo compra?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
            La sesión quedará activa y podrás retomarla desde el presupuesto. Los productos que ya agregaste no se perderán.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/budgets')} color="inherit" sx={{ color: 'text.secondary' }}>Salir</Button>
          <Button onClick={() => setExitConfirm(false)} variant="contained">Seguir comprando</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteItemConfirm)}
        title="Eliminar producto comprado"
        icon={<Delete sx={{ fontSize: 22 }} />}
        confirmLabel="Eliminar"
        loading={deletingItem}
        onCancel={() => setDeleteItemConfirm(null)}
        onConfirm={handleDeleteBought}
      >
        <Typography sx={{ fontSize: FS.body }}>
          ¿Eliminar <strong>"{deleteItemConfirm?.product_name}"</strong> de esta compra?{' '}
          {deleteItemConfirm?.total_price != null && (
            <>Se descontarán <strong style={NUM}>{fmtMoney(deleteItemConfirm.total_price)}</strong> del total.</>
          )}
        </Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={boughtBulkDeleteConfirm}
        title="Eliminar seleccionados"
        icon={<Delete sx={{ fontSize: 22 }} />}
        confirmLabel="Eliminar"
        loadingLabel="Eliminando…"
        loading={boughtBulkDeleting}
        onCancel={() => setBoughtBulkDeleteConfirm(false)}
        onConfirm={handleBoughtBulkDelete}
      >
        <Typography sx={{ fontSize: FS.body }}>
          ¿Eliminar los <strong>{boughtSelectedIds.size}</strong> productos seleccionados de esta compra?
        </Typography>
        <NameList names={boughtNames} />
      </ConfirmDialog>

      <AddItemDialog
        open={addItemDialog.open}
        budgetItem={addItemDialog.item}
        initialName={addItemDialog.name}
        initialProduct={addItemDialog.product}
        sessionId={session?.id}
        purchaseId={purchase?.id}
        userId={user?.id}
        workspaceId={currentWorkspace?.id}
        products={products}
        categories={categories}
        pendingItems={pendingItems}
        cartItems={purchaseItems}
        onEditExisting={(item) => { setAddItemDialog({ open: false, item: null }); setEditItemDialog({ open: true, item }) }}
        onClose={() => setAddItemDialog({ open: false, item: null })}
      />

      <EditPurchaseItemDialog
        open={editItemDialog.open}
        item={editItemDialog.item}
        onSave={updatePurchaseItem}
        onClose={() => setEditItemDialog({ open: false, item: null })}
      />

      <AdjustTotalDialog
        open={completeDialog}
        itemsSubtotal={totalSpent}
        initialTotal={totalSpent}
        saving={completing}
        title="Finalizar compra"
        confirmLabel="Confirmar y finalizar"
        onConfirm={handleComplete}
        onClose={() => setCompleteDialog(false)}
      />
    </Box>
  )
}
