import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Box, Typography, Card, IconButton, Avatar, AvatarGroup, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Tooltip, CircularProgress, Checkbox, Skeleton, TextField, InputAdornment, useTheme,
} from '@mui/material'
import {
  ShoppingCart, Lock, LockOpen, Add, CheckCircle,
  ArrowBack, Done, Delete, ExpandMore, ExpandLess, Store, Edit, ErrorOutlined, Receipt, Search, Close,
  Remove, DensitySmall, DensityMedium,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '@/features/budgets/store/budgetStore'
import { useInventoryStore } from '@/features/inventory/store/inventoryStore'
import { useShoppingStore } from '../store/shoppingStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import { useAppStore } from '@/store/appStore'
import AdjustTotalDialog from '@/features/purchases/components/AdjustTotalDialog'
import EditPurchaseItemDialog from '@/features/purchases/components/EditPurchaseItemDialog'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import { fmtMoney } from '@/shared/utils/format'
import AddItemDialog from '../components/AddItemDialog'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos/KPIs · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const NUM = { fontVariantNumeric: 'tabular-nums' }
const DRAWER_WIDTH = 252
const APPBAR_HEIGHT = 52
const COMPACT_KEY = 'shopping.headerCompact'
const DENSITY_KEY = 'shopping.density'
const SUGGESTIONS_MAX = 6

// Búsqueda sin tildes ni mayúsculas
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
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

// Paso del +/- según la unidad: 1 para conteos, medio para kg/L, 100 para g/ml
const STEPS = { kg: 0.5, L: 0.5, g: 100, ml: 100 }
const stepFor = (unit) => STEPS[unit] ?? 1
const roundQty = (n) => Math.round(n * 100) / 100

// ── Lista con nombres para las confirmaciones ────────────────────────────────
function NameList({ names }) {
  const shown = names.slice(0, 5)
  const rest = names.length - shown.length
  return (
    <Box component="ul" sx={{ m: 0, mt: 2, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {shown.map((n, i) => <li key={`${n}-${i}`}><Typography component="span" sx={{ fontSize: FS.body, fontWeight: 600 }}>{n}</Typography></li>)}
      {rest > 0 && <li><Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>+{rest} más</Typography></li>}
    </Box>
  )
}

// ── Dato del resumen ampliado (Presupuesto · Gastado · Items) ────────────────
function SummaryStat({ label, value }) {
  return (
    <Card sx={{ px: 1.5, py: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>{label}</Typography>
      <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, lineHeight: 1.5 }} noWrap>{value}</Typography>
    </Card>
  )
}

// ── Budget Item Card ─────────────────────────────────────────────────────────
function BudgetItemCard({ item, lock, isLockedByMe, sessionId, userId, alreadyBought, onAddItem, selectMode, selected, onToggleSelect, compact }) {
  const theme = useTheme()
  const st = theme.palette.stock
  const { lockItem, unlockItem } = useShoppingStore()
  const { enqueueSnackbar } = useSnackbar()
  const isLocked = Boolean(lock)
  const canInteract = !isLocked || isLockedByMe

  const handleLock = async () => {
    if (isLockedByMe) {
      await unlockItem(sessionId, item.id)
    } else if (!isLocked) {
      const { error } = await lockItem(sessionId, item.id, userId)
      if (error) enqueueSnackbar('No se pudo reservar el producto', { variant: 'warning' })
    }
  }

  if (alreadyBought) return null

  const lockTitle = isLockedByMe ? 'Liberar' : isLocked ? 'Reservado por otro' : 'Reservar para mí'
  const addTitle = canInteract ? 'Agregar al carrito' : 'Reservado'
  const dotColor = item.categories?.color || theme.palette.text.disabled
  // Vista compacta: cantidad, precio y categoría en una sola línea de texto
  const metaLine = [
    `${item.quantity} ${item.unit}`,
    item.estimated_price ? `~${fmtMoney(item.estimated_price)}` : null,
    item.categories?.name,
  ].filter(Boolean).join(' · ')

  return (
    <Card
      sx={{
        mb: compact ? 1 : 2,
        borderWidth: 1,
        borderColor: isLockedByMe ? 'primary.main' : isLocked ? st.riesgo.line : 'divider',
        transition: 'border-color 140ms',
        cursor: selectMode && canInteract ? 'pointer' : 'default',
        bgcolor: selectMode && !canInteract ? 'action.hover' : 'background.paper',
      }}
      onClick={selectMode && canInteract ? onToggleSelect : undefined}
    >
      <Box sx={{ px: 2, py: compact ? 1 : 2, display: 'flex', alignItems: compact ? 'center' : 'flex-start', gap: 1.5 }}>
        {selectMode ? (
          <Checkbox
            className="select-in"
            checked={selected}
            disabled={!canInteract}
            sx={{ ml: -1, mt: compact ? 0 : -1 }}
            onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
            inputProps={{ 'aria-label': `Seleccionar ${item.product_name}` }}
          />
        ) : (
          <Box sx={{ width: compact ? 10 : 12, height: compact ? 10 : 12, borderRadius: '50%', flexShrink: 0, mt: compact ? 0 : 0.75, bgcolor: dotColor }} />
        )}

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{item.product_name}</Typography>
          {compact ? (
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }} noWrap>{metaLine}</Typography>
          ) : (
            <Box sx={{ display: 'flex', columnGap: 1, rowGap: 0.5, flexWrap: 'wrap', mt: 0.5, alignItems: 'center' }}>
              <Box sx={{ ...NUM, px: 1, py: 0.5, borderRadius: '8px', border: 1, borderColor: 'divider', fontSize: FS.meta, fontWeight: 600, lineHeight: 1.4 }}>
                {item.quantity} {item.unit}
              </Box>
              {item.estimated_price && (
                <Box sx={{ ...NUM, px: 1, py: 0.5, borderRadius: '8px', border: 1, borderColor: 'divider', fontSize: FS.meta, fontWeight: 600, lineHeight: 1.4 }}>
                  ~{fmtMoney(item.estimated_price)}
                </Box>
              )}
              {item.categories && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.categories.color }} />
                  <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 600, lineHeight: 1.4 }}>{item.categories.name}</Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Lock status: icono + texto + tono (nunca solo color) */}
          {isLocked && !isLockedByMe && lock && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: compact ? 0.5 : 1, color: st.riesgo.text }}>
              <Lock sx={{ fontSize: 16, color: st.riesgo.icon }} />
              <Avatar src={lock.profiles?.avatar_url} sx={{ width: 20, height: 20, fontSize: FS.meta }}>
                {lock.profiles?.full_name?.[0]}
              </Avatar>
              <Typography sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit' }}>
                {lock.profiles?.full_name} lo está comprando
              </Typography>
            </Box>
          )}
          {isLockedByMe && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: compact ? 0.5 : 1, color: 'primary.main' }}>
              <Lock sx={{ fontSize: 16 }} />
              <Typography sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit' }}>Lo estás comprando tú</Typography>
            </Box>
          )}
        </Box>

        {!selectMode && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Tooltip title={lockTitle}>
              <span>
                <IconButton
                  aria-label={lockTitle}
                  onClick={handleLock}
                  disabled={isLocked && !isLockedByMe}
                  sx={{ border: 1, borderColor: isLockedByMe ? 'primary.main' : 'divider', color: isLockedByMe ? 'primary.main' : 'text.secondary', bgcolor: isLockedByMe ? 'action.selected' : 'transparent' }}
                >
                  {isLockedByMe ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={addTitle}>
              <span>
                <IconButton
                  aria-label={addTitle}
                  onClick={() => onAddItem(item)}
                  disabled={!canInteract}
                  sx={{ bgcolor: canInteract ? 'primary.main' : 'transparent', color: canInteract ? 'primary.contrastText' : 'text.disabled', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Card>
  )
}

// ── Producto del inventario encontrado en la búsqueda (agregar con un toque) ─
function InventorySuggestionRow({ product, compact, onAdd }) {
  const meta = [`${product.current_quantity} ${product.unit} en stock`, product.categories?.name].filter(Boolean).join(' · ')
  return (
    <Box sx={{ px: 2, py: compact ? 0.5 : 1, minHeight: compact ? 52 : 64, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{product.name}</Typography>
        <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }} noWrap>{meta}</Typography>
      </Box>
      <Tooltip title="Agregar al carrito">
        <IconButton
          aria-label={`Agregar ${product.name} al carrito`}
          onClick={() => onAdd(product)}
          sx={{ flexShrink: 0, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

// ── Selector de cantidad − n + ───────────────────────────────────────────────
function QtyStepper({ item, size, onStep }) {
  const canDecrease = roundQty(Number(item.quantity) - stepFor(item.unit)) > 0
  const btn = { width: size, height: size, minWidth: size, minHeight: size }
  return (
    <Box role="group" aria-label={`Cantidad de ${item.product_name}`} sx={{ display: 'inline-flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: '8px' }}>
      <IconButton aria-label={`Disminuir cantidad de ${item.product_name}`} disabled={!canDecrease} onClick={() => onStep(item, -1)} sx={btn}>
        <Remove fontSize="small" />
      </IconButton>
      <Typography aria-live="polite" sx={{ ...NUM, minWidth: 40, textAlign: 'center', fontSize: FS.body, fontWeight: 700 }}>
        {Number(item.quantity)}
      </Typography>
      <IconButton aria-label={`Aumentar cantidad de ${item.product_name}`} onClick={() => onStep(item, 1)} sx={btn}>
        <Add fontSize="small" />
      </IconButton>
    </Box>
  )
}

// ── Purchased Item Row ───────────────────────────────────────────────────────
function PurchasedItemRow({ item, onRemove, onEdit, onStep, selectMode, selected, onToggleSelect, compact }) {
  const controlSize = compact ? 40 : 44
  return (
    <Box
      sx={{ px: 2, py: compact ? 1 : 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5, cursor: selectMode ? 'pointer' : 'default' }}
      onClick={selectMode ? onToggleSelect : undefined}
    >
      {selectMode ? (
        <Checkbox
          className="select-in"
          checked={selected}
          sx={{ ml: -1, mt: -0.5 }}
          onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          inputProps={{ 'aria-label': `Seleccionar ${item.product_name}` }}
        />
      ) : (
        <CheckCircle sx={{ fontSize: 20, flexShrink: 0, mt: 0.25, color: 'primary.main' }} />
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {/* Línea 1: nombre + importe */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={{ fontSize: FS.body, fontWeight: 700, minWidth: 0 }} noWrap={compact}>
            {item.product_name}
            {item.brand && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}> · {item.brand}</Box>}
          </Typography>
          {item.total_price != null && (
            <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, flexShrink: 0 }}>{fmtMoney(item.total_price)}</Typography>
          )}
        </Box>

        {/* Línea 2: unidad, quién lo compró, etiqueta "No hogar" */}
        <Box sx={{ display: 'flex', columnGap: 1, flexWrap: compact ? 'nowrap' : 'wrap', alignItems: 'center', minWidth: 0 }}>
          <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', flexShrink: 0 }}>{selectMode ? `${Number(item.quantity)} ${item.unit}` : item.unit}</Typography>
          {item.profiles && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>· {item.profiles.full_name}</Typography>}
          {item.is_household === false && (
            <Box sx={{ px: 1, borderRadius: '8px', bgcolor: 'action.hover', flexShrink: 0 }}>
              <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 600, color: 'text.secondary', lineHeight: 1.5 }}>No hogar</Typography>
            </Box>
          )}
        </Box>

        {/* Línea 3: cantidad y acciones, con espacio entre controles táctiles */}
        {!selectMode && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mt: compact ? 0.5 : 1 }}>
            <QtyStepper item={item} size={controlSize} onStep={onStep} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Editar">
                <IconButton aria-label={`Editar ${item.product_name}`} onClick={() => onEdit(item)}><Edit fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title="Eliminar">
                <IconButton aria-label={`Eliminar ${item.product_name}`} onClick={() => onRemove(item)}><Delete fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Box>
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
  const st = theme.palette.stock

  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { sidebarOpen } = useAppStore()
  const { currentBudget, budgetItems, fetchBudgetWithItems, updateBudget } = useBudgetStore()
  const { products, categories, fetchProducts, fetchCategories } = useInventoryStore()
  const {
    session, participants, purchaseItems,
    loading, startSession, fetchSession, completeSession,
    getTotals, getLockForItem, removePurchaseItem, removePurchaseItemsBulk, unsubscribe,
    updatePurchaseItem, addPurchaseItem, unlockItem, changePurchaseItemQuantity,
  } = useShoppingStore()
  const { createPurchase, updatePurchase } = usePurchaseStore()
  const { enqueueSnackbar } = useSnackbar()

  const [purchase, setPurchase] = useState(null)
  const [addItemDialog, setAddItemDialog] = useState({ open: false, item: null })
  const [editItemDialog, setEditItemDialog] = useState({ open: false, item: null })
  const [completing, setCompleting] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [initError, setInitError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const [showBought, setShowBought] = useState(false)
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
  const [query, setQuery] = useState('')
  const [headerCompact, setHeaderCompact] = useState(readCompact)
  const [density, setDensity] = useState(readDensity)
  const compact = density === 'compact'

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
      return created ?? null
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
    if (user && initKeyRef.current !== key) {
      initKeyRef.current = key
      init()
    }
    return () => unsubscribe()
  }, [sessionId, budgetId, user?.id, retryTick])

  useEffect(() => {
    if (session?.budget_id && !currentBudget) fetchBudgetWithItems(session.budget_id)
  }, [session?.budget_id])

  useEffect(() => {
    if (currentWorkspace) {
      fetchProducts(currentWorkspace.id)
      fetchCategories(currentWorkspace.id)
    }
  }, [currentWorkspace?.id])

  const totalSpent = getTotals()
  const budget = currentBudget?.target_amount || 0
  const diff = budget - totalSpent
  const progress = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0
  const overBudget = budget > 0 && totalSpent > budget

  const purchasedIds = new Set(purchaseItems.map((p) => p.budget_item_id).filter(Boolean))
  const pendingItems = budgetItems.filter((i) => !purchasedIds.has(i.id))
  const boughtBudgetItems = budgetItems.filter((i) => purchasedIds.has(i.id))

  const q = norm(query)
  const matches = (...fields) => !q || fields.some((f) => norm(f).includes(q))
  const visiblePending = pendingItems.filter((i) => matches(i.product_name, i.categories?.name))
  const visiblePurchased = purchaseItems.filter((i) => matches(i.product_name, i.brand))
  const boughtOpen = showBought || Boolean(q)

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

  const handleAddSelectedPending = async () => {
    const items = pendingItems.filter((i) => pendingSelectedIds.has(i.id))
    setPendingBulkAdding(true)
    const results = await Promise.all(items.map(async (budgetItem) => {
      const { error } = await addPurchaseItem(
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
      if (!error) await unlockItem(session.id, budgetItem.id)
      return error
    }))
    setPendingBulkAdding(false)
    exitPendingSelectMode()
    const failed = results.filter(Boolean).length
    const added = items.length - failed
    if (failed) enqueueSnackbar(`${added} agregado${added !== 1 ? 's' : ''}, ${failed} con error`, { variant: 'warning' })
    else enqueueSnackbar(`${added} producto${added !== 1 ? 's' : ''} agregado${added !== 1 ? 's' : ''} al carrito — revisa cantidad y precio`, { variant: 'success' })
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
      <Box sx={{ maxWidth: 720, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
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
      <Box sx={{ maxWidth: 720, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }} aria-busy="true">
        <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Iniciando modo compra…</Typography>
        <Skeleton variant="rectangular" height={132} sx={{ borderRadius: '12px' }} />
        {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: '12px' }} />)}
      </Box>
    )
  }

  // Hero: con objetivo, lo que aún se puede gastar; sin objetivo, lo gastado
  const hasBudget = budget > 0
  const heroLabel = hasBudget ? (overBudget ? 'Excedido' : 'Disponible') : 'Gastado'
  const heroValue = hasBudget ? (overBudget ? -Math.abs(diff) : diff) : totalSpent
  const heroSkin = overBudget ? st.agotado : st.saludable
  const HeroIcon = overBudget ? ErrorOutlined : Receipt
  const progressColor = overBudget ? st.agotado.icon : progress > 80 ? st.riesgo.icon : theme.palette.primary.main
  const boughtNames = purchaseItems.filter((i) => boughtSelectedIds.has(i.id)).map((i) => i.product_name)
  const barLeft = { xs: 0, md: sidebarOpen ? DRAWER_WIDTH : 0 }
  const summaryToggleLabel = headerCompact ? 'Ampliar resumen del gasto' : 'Reducir resumen del gasto'
  const densityLabel = compact ? 'Cambiar a vista cómoda' : 'Cambiar a vista compacta'

  const summaryToggle = (
    <Tooltip title={summaryToggleLabel}>
      <IconButton aria-label={summaryToggleLabel} aria-expanded={!headerCompact} onClick={toggleHeaderCompact} sx={{ flexShrink: 0, mr: -1 }}>
        {headerCompact ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
      </IconButton>
    </Tooltip>
  )

  return (
    <Box sx={{ pb: { xs: 10, md: 8 }, maxWidth: 720, mx: 'auto' }}>

      {/* ── Sticky header: título, resumen del gasto y buscador siempre a la vista ── */}
      <Box
        sx={{
          position: 'sticky', top: APPBAR_HEIGHT, zIndex: 20,
          bgcolor: 'background.default',
          borderBottom: 1, borderColor: 'divider',
          pb: 1.5, pt: 1, mb: { xs: 2, sm: 3 },
        }}
      >
        {/* Salir + título/estado + participantes */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton aria-label="Salir del modo compra" onClick={() => setExitConfirm(true)} sx={{ ml: -1, flexShrink: 0 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }} noWrap>{currentBudget?.name ?? 'Modo Compra'}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, color: 'primary.main' }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0,
                animation: 'shopPulse 1.6s ease-in-out infinite',
                '@keyframes shopPulse': { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.45, transform: 'scale(0.75)' } },
              }} />
              <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4, flexShrink: 0 }}>Modo compra activo</Typography>
              {currentBudget?.store && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, color: 'text.secondary' }}>
                  <Store sx={{ fontSize: 16, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: FS.meta, color: 'inherit' }} noWrap>{currentBudget.store}</Typography>
                </Box>
              )}
            </Box>
          </Box>
          <AvatarGroup max={3} sx={{ flexShrink: 0, '& .MuiAvatar-root': { width: 32, height: 32, fontSize: FS.meta, border: `2px solid ${theme.palette.background.default}` } }}>
            {participants.map((p) => (
              <Tooltip key={p.id} title={p.profiles?.full_name ?? ''}>
                <Avatar src={p.profiles?.avatar_url} alt={p.profiles?.full_name ?? ''} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  {p.profiles?.full_name?.[0]?.toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Box>

        {/* Resumen del gasto: compacto (una línea) o ampliado (presupuesto, gastado, saldo) */}
        <Box sx={{ mt: 1 }}>
          {headerCompact ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }} noWrap>Gastado · {purchaseItems.length} en carrito</Typography>
                  <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 800, lineHeight: 1.3 }}>{fmtMoney(totalSpent)}</Typography>
                </Box>
                {hasBudget && (
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{heroLabel}</Typography>
                    <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, lineHeight: 1.5, color: heroSkin.text }}>{fmtMoney(heroValue)}</Typography>
                  </Box>
                )}
              </Box>
              {summaryToggle}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Card sx={{ bgcolor: heroSkin.tint, borderColor: heroSkin.line, px: 2, py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HeroIcon sx={{ fontSize: 20, color: heroSkin.icon }} />
                  <Typography component="h2" sx={{ fontSize: FS.body, fontWeight: 700, flexGrow: 1 }}>{heroLabel}</Typography>
                  <Box sx={{ my: -1 }}>{summaryToggle}</Box>
                </Box>
                <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: heroSkin.text }}>
                  {fmtMoney(heroValue)}
                </Typography>
              </Card>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: hasBudget ? 'repeat(3, minmax(0, 1fr))' : 'minmax(0, 1fr)' }}>
                {hasBudget && <SummaryStat label="Presupuesto" value={fmtMoney(budget)} />}
                {hasBudget && <SummaryStat label="Gastado" value={fmtMoney(totalSpent)} />}
                <SummaryStat label="Items" value={purchaseItems.length} />
              </Box>
            </Box>
          )}

          {hasBudget && (
            <LinearProgress
              aria-hidden
              variant="determinate"
              value={progress}
              sx={{ height: 8, mt: 1, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: progressColor } }}
            />
          )}
        </Box>

        {/* Buscador (pendientes, carrito e inventario) + densidad de la lista */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
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
          <Tooltip title={densityLabel}>
            <IconButton
              aria-label={densityLabel}
              onClick={toggleDensity}
              sx={{ flexShrink: 0, border: 1, borderColor: 'divider', color: 'text.secondary' }}
            >
              {compact ? <DensitySmall fontSize="small" /> : <DensityMedium fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Resultados de búsqueda: sin coincidencias + alta rápida ── */}
      {q && noResults && (
        <Typography role="status" sx={{ fontSize: FS.body, color: 'text.secondary', mb: 2 }}>
          No se encontraron productos para "{query.trim()}".
        </Typography>
      )}
      {q && (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Add />}
          onClick={() => setAddItemDialog({ open: true, item: null, name: query.trim() })}
          sx={{ mb: 3, justifyContent: 'flex-start' }}
        >
          Agregar "{query.trim()}" al carrito
        </Button>
      )}

      {suggestions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography component="h2" sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, mb: 1 }}>
            En tu inventario ({suggestionsAll.length})
          </Typography>
          <Card>
            {suggestions.map((p, i) => (
              <Box key={p.id}>
                <InventorySuggestionRow
                  product={p}
                  compact={compact}
                  onAdd={(product) => setAddItemDialog({ open: true, item: null, product })}
                />
                {i < suggestions.length - 1 && <Divider sx={{ mx: 2 }} />}
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

      {/* ── Purchased items section ── */}
      {purchaseItems.length > 0 && (!q || visiblePurchased.length > 0) && (
        <Box sx={{ mb: 3 }}>
          <Button
            fullWidth
            variant="text"
            aria-expanded={boughtOpen}
            startIcon={boughtOpen ? <ExpandLess /> : <ExpandMore />}
            endIcon={(
              <Box sx={{ ...NUM, px: 1, minWidth: 28, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main', fontSize: FS.meta, fontWeight: 700, lineHeight: 1.7 }}>
                {q ? `${visiblePurchased.length}/${purchaseItems.length}` : purchaseItems.length}
              </Box>
            )}
            onClick={() => setShowBought(!showBought)}
            sx={{ justifyContent: 'space-between', px: 1, mb: 1, color: 'text.primary' }}
          >
            <Typography component="span" sx={{ fontSize: FS.body, fontWeight: 700, flexGrow: 1, textAlign: 'left' }}>
              Agregados al carrito
            </Typography>
          </Button>

          {boughtOpen && (
            <Card className="select-in">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1, flexWrap: 'wrap' }}>
                {boughtSelectMode ? (
                  <>
                    <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>
                      {boughtSelectedIds.size} seleccionado{boughtSelectedIds.size !== 1 ? 's' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button onClick={() => setBoughtSelectedIds(new Set(visiblePurchased.map((i) => i.id)))}>Todos</Button>
                      <Button onClick={() => setBoughtSelectedIds(new Set())}>Ninguno</Button>
                      <Button variant="outlined" startIcon={<Delete sx={{ fontSize: 20 }} />} disabled={boughtSelectedIds.size === 0} onClick={() => setBoughtBulkDeleteConfirm(true)}>
                        Eliminar
                      </Button>
                      <Button color="inherit" onClick={exitBoughtSelectMode} sx={{ color: 'text.secondary' }}>Cancelar</Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <span />
                    <Button onClick={() => { setBoughtSelectMode(true); setBoughtSelectedIds(new Set()) }}>Seleccionar varios</Button>
                  </>
                )}
              </Box>
              <Divider />
              <Box>
                {visiblePurchased.map((pi, i) => (
                  <Box key={pi.id}>
                    <PurchasedItemRow
                      item={pi}
                      compact={compact}
                      onRemove={(item) => setDeleteItemConfirm(item)}
                      onEdit={(item) => setEditItemDialog({ open: true, item })}
                      onStep={handleStep}
                      selectMode={boughtSelectMode}
                      selected={boughtSelectedIds.has(pi.id)}
                      onToggleSelect={() => toggleBoughtSelected(pi.id)}
                    />
                    {i < visiblePurchased.length - 1 && <Divider sx={{ mx: 2 }} />}
                  </Box>
                ))}
              </Box>
            </Card>
          )}
        </Box>
      )}

      {/* ── Pending budget items ── */}
      {pendingItems.length > 0 && (!q || visiblePending.length > 0) && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: compact ? 1 : 2, flexWrap: 'wrap' }}>
            {pendingSelectMode ? (
              <>
                <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, color: 'text.secondary' }}>
                  {pendingSelectedIds.size} seleccionado{pendingSelectedIds.size !== 1 ? 's' : ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    onClick={() => setPendingSelectedIds(new Set(
                      visiblePending.filter((i) => { const l = getLockForItem(i.id); return !l || l.user_id === user?.id }).map((i) => i.id)
                    ))}
                  >
                    Todos
                  </Button>
                  <Button onClick={() => setPendingSelectedIds(new Set())}>Ninguno</Button>
                  <Button
                    variant="outlined"
                    disabled={pendingSelectedIds.size === 0 || pendingBulkAdding}
                    onClick={handleAddSelectedPending}
                    startIcon={pendingBulkAdding ? <CircularProgress size={16} color="inherit" /> : undefined}
                  >
                    {pendingBulkAdding ? 'Agregando…' : `Agregar (${pendingSelectedIds.size})`}
                  </Button>
                  <Button color="inherit" onClick={exitPendingSelectMode} sx={{ color: 'text.secondary' }}>Cancelar</Button>
                </Box>
              </>
            ) : (
              <>
                <Typography component="h2" sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>
                  Pendientes ({q ? `${visiblePending.length}/${pendingItems.length}` : pendingItems.length})
                </Typography>
                <Button onClick={() => { setPendingSelectMode(true); setPendingSelectedIds(new Set()) }}>Seleccionar varios</Button>
              </>
            )}
          </Box>
          {visiblePending.map((item) => {
            const lock = getLockForItem(item.id)
            return (
              <BudgetItemCard
                key={item.id}
                item={item}
                compact={compact}
                lock={lock}
                isLockedByMe={lock?.user_id === user?.id}
                sessionId={session?.id}
                userId={user?.id}
                alreadyBought={purchasedIds.has(item.id)}
                onAddItem={(i) => setAddItemDialog({ open: true, item: i })}
                selectMode={pendingSelectMode}
                selected={pendingSelectedIds.has(item.id)}
                onToggleSelect={() => togglePendingSelected(item.id)}
              />
            )
          })}
        </Box>
      )}

      {/* ── Completed items from budget ── */}
      {!q && boughtBudgetItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', px: 1 }}>Ya comprados del presupuesto</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            {boughtBudgetItems.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                <CheckCircle sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: FS.body, color: 'text.secondary', textDecoration: 'line-through' }} noWrap>{item.product_name}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty state */}
      {!q && pendingItems.length === 0 && purchaseItems.length === 0 && (
        <EmptyState
          icon={<ShoppingCart sx={{ fontSize: 28 }} />}
          title="No hay items en el presupuesto."
          body="Usa el botón + para agregar productos."
        />
      )}

      {/* ── Barra inferior fija: agregar producto (secundaria) + finalizar (única acción primaria) ── */}
      <Box
        sx={{
          position: 'fixed', bottom: { xs: 64, md: 0 }, left: barLeft, right: 0,
          px: 2, py: 1.5,
          bgcolor: 'background.paper',
          borderTop: 1, borderColor: 'divider',
          zIndex: 15,
        }}
      >
        <Box sx={{ maxWidth: 720, mx: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title="Agregar producto">
            <IconButton
              aria-label="Agregar producto"
              onClick={() => setAddItemDialog({ open: true, item: null })}
              sx={{ width: 52, height: 52, flexShrink: 0, border: 1, borderColor: 'primary.main', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } }}
            >
              <Add />
            </IconButton>
          </Tooltip>
          <Button
            fullWidth variant="contained" size="large"
            startIcon={completing ? <CircularProgress size={16} color="inherit" /> : <Done />}
            onClick={() => setCompleteDialog(true)}
            disabled={completing || purchaseItems.length === 0}
            sx={{ minHeight: 52 }}
          >
            {completing ? 'Finalizando…' : `Finalizar compra · ${fmtMoney(totalSpent)}`}
          </Button>
        </Box>
      </Box>

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

      <Dialog open={Boolean(deleteItemConfirm)} onClose={deletingItem ? undefined : () => setDeleteItemConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: 'error.main', borderRadius: '8px', color: 'error.contrastText', display: 'flex' }}>
              <Delete sx={{ fontSize: 24 }} />
            </Box>
            Eliminar producto comprado
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body }}>
            ¿Eliminar <strong>"{deleteItemConfirm?.product_name}"</strong> de esta compra?{' '}
            {deleteItemConfirm?.total_price != null && (
              <>Se descontarán <strong style={NUM}>{fmtMoney(deleteItemConfirm.total_price)}</strong> del total.</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItemConfirm(null)} disabled={deletingItem}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={deletingItem ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            disabled={deletingItem}
            onClick={handleDeleteBought}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={boughtBulkDeleteConfirm} onClose={boughtBulkDeleting ? undefined : () => setBoughtBulkDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: 'error.main', borderRadius: '8px', color: 'error.contrastText', display: 'flex' }}>
              <Delete sx={{ fontSize: 24 }} />
            </Box>
            Eliminar seleccionados
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body }}>
            ¿Eliminar los <strong>{boughtSelectedIds.size}</strong> productos seleccionados de esta compra?
          </Typography>
          <NameList names={boughtNames} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoughtBulkDeleteConfirm(false)} disabled={boughtBulkDeleting}>Cancelar</Button>
          <Button variant="contained" color="error" startIcon={boughtBulkDeleting ? <CircularProgress size={16} color="inherit" /> : <Delete />} onClick={handleBoughtBulkDelete} disabled={boughtBulkDeleting}>
            {boughtBulkDeleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

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
