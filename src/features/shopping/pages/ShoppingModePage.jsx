import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Box, Typography, Card, IconButton, Avatar, AvatarGroup, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Tooltip, Fab, CircularProgress, Checkbox, Skeleton, useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  ShoppingCart, Lock, LockOpen, Add, CheckCircle,
  ArrowBack, Done, Delete, ExpandMore, ExpandLess, Store, Edit, ErrorOutlined, Receipt,
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

// ── Budget Item Card ─────────────────────────────────────────────────────────
function BudgetItemCard({ item, lock, isLockedByMe, sessionId, userId, alreadyBought, onAddItem, selectMode, selected, onToggleSelect }) {
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

  return (
    <Card
      sx={{
        mb: 2,
        borderWidth: 1,
        borderColor: isLockedByMe ? 'primary.main' : isLocked ? st.riesgo.line : 'divider',
        transition: 'border-color 140ms',
        cursor: selectMode && canInteract ? 'pointer' : 'default',
        bgcolor: selectMode && !canInteract ? 'action.hover' : 'background.paper',
      }}
      onClick={selectMode && canInteract ? onToggleSelect : undefined}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {selectMode ? (
          <Checkbox
            className="select-in"
            checked={selected}
            disabled={!canInteract}
            sx={{ ml: -1, mt: -1 }}
            onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
            inputProps={{ 'aria-label': `Seleccionar ${item.product_name}` }}
          />
        ) : (
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, mt: 0.75, bgcolor: item.categories?.color || theme.palette.text.disabled }} />
        )}

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{item.product_name}</Typography>
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

          {/* Lock status: icono + texto + tono (nunca solo color) */}
          {isLocked && !isLockedByMe && lock && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, color: st.riesgo.text }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, color: 'primary.main' }}>
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

// ── Purchased Item Row ───────────────────────────────────────────────────────
function PurchasedItemRow({ item, onRemove, onEdit, selectMode, selected, onToggleSelect }) {
  return (
    <Box
      sx={{ px: 2, py: 1, minHeight: 64, display: 'flex', alignItems: 'center', gap: 2, cursor: selectMode ? 'pointer' : 'default' }}
      onClick={selectMode ? onToggleSelect : undefined}
    >
      {selectMode ? (
        <Checkbox
          className="select-in"
          checked={selected}
          sx={{ ml: -1 }}
          onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          inputProps={{ 'aria-label': `Seleccionar ${item.product_name}` }}
        />
      ) : (
        <CheckCircle sx={{ fontSize: 20, flexShrink: 0, color: 'primary.main' }} />
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>
          {item.product_name}
          {item.brand && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}> · {item.brand}</Box>}
        </Typography>
        <Box sx={{ display: 'flex', columnGap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{item.quantity} {item.unit}</Typography>
          {item.profiles && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>· {item.profiles.full_name}</Typography>}
          {item.is_household === false && (
            <Box sx={{ px: 1, borderRadius: '8px', bgcolor: 'action.hover' }}>
              <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 600, color: 'text.secondary', lineHeight: 1.5 }}>No hogar</Typography>
            </Box>
          )}
        </Box>
      </Box>
      {/* Importe y acciones: en móvil se apilan para que el nombre no se corte */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-end', sm: 'center' }, gap: { xs: 0.5, sm: 2 }, flexShrink: 0 }}>
        {item.total_price != null && (
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{fmtMoney(item.total_price)}</Typography>
        )}
        {!selectMode && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Editar">
              <IconButton aria-label={`Editar ${item.product_name}`} onClick={() => onEdit(item)}><Edit fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton aria-label={`Eliminar ${item.product_name}`} onClick={() => onRemove(item)}><Delete fontSize="small" /></IconButton>
            </Tooltip>
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
    updatePurchaseItem, addPurchaseItem, unlockItem,
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
      enqueueSnackbar('¡Compra finalizada! El presupuesto fue marcado como completado.', { variant: 'success' })
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

  return (
    <Box sx={{ pb: { xs: 24, md: 16 }, maxWidth: 720, mx: 'auto' }}>

      {/* ── Sticky header ── */}
      <Box
        sx={{
          position: 'sticky', top: APPBAR_HEIGHT, zIndex: 20,
          bgcolor: 'background.default',
          borderBottom: 1, borderColor: 'divider',
          pb: 2, pt: 1, mb: 3,
        }}
      >
        {/* Estado + participantes */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton aria-label="Salir del modo compra" onClick={() => setExitConfirm(true)} sx={{ ml: -1 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main' }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0,
              animation: 'shopPulse 1.6s ease-in-out infinite',
              '@keyframes shopPulse': { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.45, transform: 'scale(0.75)' } },
            }} />
            <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>Modo compra activo</Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: FS.meta, border: `2px solid ${theme.palette.background.default}` } }}>
            {participants.map((p) => (
              <Tooltip key={p.id} title={p.profiles?.full_name ?? ''}>
                <Avatar src={p.profiles?.avatar_url} alt={p.profiles?.full_name ?? ''} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  {p.profiles?.full_name?.[0]?.toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Box>

        {/* Título */}
        <Box sx={{ mb: 2 }}>
          <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }} noWrap>{currentBudget?.name ?? 'Modo Compra'}</Typography>
          {currentBudget?.store && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Store sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{currentBudget.store}</Typography>
            </Box>
          )}
        </Box>

        {/* Hero + KPIs */}
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)' }}>
          <Card sx={{ bgcolor: heroSkin.tint, borderColor: heroSkin.line, p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HeroIcon sx={{ fontSize: 20, color: heroSkin.icon }} />
              <Typography component="h2" sx={{ fontSize: FS.body, fontWeight: 700 }}>{heroLabel}</Typography>
            </Box>
            <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: heroSkin.text }}>
              {fmtMoney(heroValue)}
            </Typography>
          </Card>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateRows: hasBudget ? '1fr 1fr' : '1fr' }}>
            {hasBudget && (
              <Card sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Gastado</Typography>
                <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{fmtMoney(totalSpent)}</Typography>
              </Card>
            )}
            <Card sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Items</Typography>
              <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{purchaseItems.length}</Typography>
            </Card>
          </Box>
        </Box>

        {/* Progress bar */}
        {hasBudget && (
          <LinearProgress
            aria-hidden
            variant="determinate"
            value={progress}
            sx={{ height: 8, mt: 2, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: progressColor } }}
          />
        )}
      </Box>

      {/* ── Purchased items section ── */}
      {purchaseItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Button
            fullWidth
            variant="text"
            aria-expanded={showBought}
            startIcon={showBought ? <ExpandLess /> : <ExpandMore />}
            endIcon={(
              <Box sx={{ ...NUM, px: 1, minWidth: 28, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main', fontSize: FS.meta, fontWeight: 700, lineHeight: 1.7 }}>
                {purchaseItems.length}
              </Box>
            )}
            onClick={() => setShowBought(!showBought)}
            sx={{ justifyContent: 'space-between', px: 1, mb: 1, color: 'text.primary' }}
          >
            <Typography component="span" sx={{ fontSize: FS.body, fontWeight: 700, flexGrow: 1, textAlign: 'left' }}>
              Agregados al carrito
            </Typography>
          </Button>

          {showBought && (
            <Card className="select-in">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1, flexWrap: 'wrap' }}>
                {boughtSelectMode ? (
                  <>
                    <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>
                      {boughtSelectedIds.size} seleccionado{boughtSelectedIds.size !== 1 ? 's' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button onClick={() => setBoughtSelectedIds(new Set(purchaseItems.map((i) => i.id)))}>Todos</Button>
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
                {purchaseItems.map((pi, i) => (
                  <Box key={pi.id}>
                    <PurchasedItemRow
                      item={pi}
                      onRemove={(item) => setDeleteItemConfirm(item)}
                      onEdit={(item) => setEditItemDialog({ open: true, item })}
                      selectMode={boughtSelectMode}
                      selected={boughtSelectedIds.has(pi.id)}
                      onToggleSelect={() => toggleBoughtSelected(pi.id)}
                    />
                    {i < purchaseItems.length - 1 && <Divider sx={{ mx: 2 }} />}
                  </Box>
                ))}
              </Box>
            </Card>
          )}
        </Box>
      )}

      {/* ── Pending budget items ── */}
      {pendingItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {pendingSelectMode ? (
              <>
                <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, color: 'text.secondary' }}>
                  {pendingSelectedIds.size} seleccionado{pendingSelectedIds.size !== 1 ? 's' : ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    onClick={() => setPendingSelectedIds(new Set(
                      pendingItems.filter((i) => { const l = getLockForItem(i.id); return !l || l.user_id === user?.id }).map((i) => i.id)
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
                  Pendientes ({pendingItems.length})
                </Typography>
                <Button onClick={() => { setPendingSelectMode(true); setPendingSelectedIds(new Set()) }}>Seleccionar varios</Button>
              </>
            )}
          </Box>
          {pendingItems.map((item) => {
            const lock = getLockForItem(item.id)
            return (
              <BudgetItemCard
                key={item.id}
                item={item}
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
      {boughtBudgetItems.length > 0 && (
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
      {pendingItems.length === 0 && purchaseItems.length === 0 && (
        <EmptyState
          icon={<ShoppingCart sx={{ fontSize: 28 }} />}
          title="No hay items en el presupuesto."
          body="Usa el botón + para agregar productos."
        />
      )}

      {/* ── FAB – add free item (secundario: la primaria es Finalizar compra) ── */}
      <Fab
        aria-label="Agregar producto"
        size="medium"
        onClick={() => setAddItemDialog({ open: true, item: null })}
        sx={{
          position: 'fixed', bottom: { xs: 168, md: 104 }, right: 20, zIndex: 16,
          bgcolor: 'background.paper', color: 'primary.main', border: 1, borderColor: 'primary.main',
          boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.18)}`,
          '&:hover': { bgcolor: 'action.selected' },
        }}
      >
        <Add />
      </Fab>

      {/* ── Bottom bar – complete (única acción primaria) ── */}
      <Box
        sx={{
          position: 'fixed', bottom: { xs: 64, md: 0 }, left: barLeft, right: 0,
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1, borderColor: 'divider',
          zIndex: 15,
        }}
      >
        <Box sx={{ maxWidth: 720, mx: 'auto' }}>
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
