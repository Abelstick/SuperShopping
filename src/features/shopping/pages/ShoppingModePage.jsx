import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Box, Typography, Card, CardContent, List, ListItem,
  IconButton, Chip, Avatar, AvatarGroup, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, LinearProgress, Tooltip, Fab, Alert, CircularProgress,
  Stack, Badge, Collapse, alpha, useTheme, Checkbox, FormControlLabel,
} from '@mui/material'
import {
  ShoppingCart, Lock, LockOpen, Add, CheckCircle,
  People, AttachMoney, ArrowBack, Done, Warning,
  Delete, Person, Inventory2, ExpandMore, ExpandLess,
  RadioButtonUnchecked, Store,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '@/features/budgets/store/budgetStore'
import { useShoppingStore } from '../store/shoppingStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'

// ── Add Item Dialog ──────────────────────────────────────────────────────────
function AddItemDialog({ open, budgetItem, sessionId, purchaseId, userId, workspaceId, onClose }) {
  const { addPurchaseItem, unlockItem } = useShoppingStore()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ product_name: '', brand: '', quantity: 1, unit_price: '', unit: 'unidad' })
  const [saving, setSaving] = useState(false)
  const [multiplyQty, setMultiplyQty] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        product_name: budgetItem?.product_name ?? '',
        brand: '',
        quantity: budgetItem?.quantity ?? 1,
        unit_price: budgetItem?.estimated_price ?? '',
        unit: budgetItem?.unit ?? 'unidad',
      })
      setMultiplyQty(false)
    }
  }, [open, budgetItem])

  const total = multiplyQty
    ? Number(form.quantity || 0) * Number(form.unit_price || 0)
    : Number(form.unit_price || 0)

  const handleSave = async () => {
    if (!form.product_name.trim()) return
    setSaving(true)
    const { error } = await addPurchaseItem(
      sessionId, purchaseId,
      {
        product_name: form.product_name.trim(),
        brand: form.brand.trim() || null,
        quantity: Number(form.quantity),
        unit_price: form.unit_price ? Number(form.unit_price) : null,
        total_price: total || null,
        unit: form.unit,
        budget_item_id: budgetItem?.id ?? null,
        product_id: budgetItem?.product_id ?? null,
        category_id: budgetItem?.category_id ?? null,
      },
      userId,
      workspaceId,
    )
    setSaving(false)
    if (error) { enqueueSnackbar('Error al agregar el producto', { variant: 'error' }); return }
    if (budgetItem) await unlockItem(sessionId, budgetItem.id)
    enqueueSnackbar(`"${form.product_name}" agregado`, { variant: 'success' })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {budgetItem ? `Comprar: ${budgetItem.product_name}` : 'Agregar producto'}
        </Typography>
        {!budgetItem && (
          <Typography variant="caption" color="text.secondary">
            Si no está en el inventario, se creará automáticamente.
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField fullWidth label="Producto *" value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} size="medium" autoFocus={!budgetItem} />
          <TextField fullWidth label="Marca (opcional)" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 5 }}>
              <TextField fullWidth type="number" label="Cant." value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} />
            </Grid>
            <Grid size={{ xs: 7 }}>
              <TextField
                fullWidth type="number" label="Precio"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                slotProps={{ input: { startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 14 }}>S/</Box> } }}
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={<Checkbox size="small" checked={multiplyQty} onChange={(e) => setMultiplyQty(e.target.checked)} />}
            label={<Typography variant="caption" color="text.secondary">Multiplicar por cantidad</Typography>}
            sx={{ m: 0 }}
          />
          {total > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">{multiplyQty ? 'Subtotal' : 'Total'}</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">S/{total.toFixed(2)}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.product_name.trim()} fullWidth>
          {saving ? 'Guardando…' : 'Agregar al carrito'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Budget Item Card ─────────────────────────────────────────────────────────
function BudgetItemCard({ item, lock, isLockedByMe, sessionId, purchaseId, userId, workspaceId, alreadyBought, onAddItem }) {
  const theme = useTheme()
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

  return (
    <Card
      sx={{
        mb: 1.5,
        border: '1.5px solid',
        borderColor: isLockedByMe
          ? 'primary.main'
          : isLocked
          ? 'warning.main'
          : 'divider',
        transition: 'all 0.2s ease',
        opacity: 1,
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ py: '14px !important', px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Category dot */}
          <Box
            sx={{
              width: 10, height: 10, borderRadius: '50%', flexShrink: 0, mt: 0.8,
              bgcolor: item.categories?.color || (theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1'),
            }}
          />

          {/* Content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{item.product_name}</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.5 }}>
              <Chip size="small" label={`${item.quantity} ${item.unit}`} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              {item.estimated_price && (
                <Chip size="small" label={`~S/${item.estimated_price}`} color="info" sx={{ height: 20, fontSize: 11 }} />
              )}
              {item.categories && (
                <Chip size="small" label={item.categories.name} sx={{ height: 20, fontSize: 11, bgcolor: alpha(item.categories.color, 0.15), color: item.categories.color, fontWeight: 600 }} />
              )}
            </Stack>

            {/* Lock status */}
            {isLocked && !isLockedByMe && lock && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                <Avatar src={lock.profiles?.avatar_url} sx={{ width: 18, height: 18, fontSize: 10 }}>
                  {lock.profiles?.full_name?.[0]}
                </Avatar>
                <Typography variant="caption" color="warning.main" fontWeight={600}>
                  {lock.profiles?.full_name} lo está comprando
                </Typography>
              </Box>
            )}
            {isLockedByMe && (
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                Lo estás comprando tú
              </Typography>
            )}
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title={isLockedByMe ? 'Liberar' : isLocked ? 'Reservado por otro' : 'Reservar para mí'}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleLock}
                  disabled={isLocked && !isLockedByMe}
                  color={isLockedByMe ? 'primary' : 'default'}
                  sx={{ bgcolor: isLockedByMe ? alpha(theme.palette.primary.main, 0.1) : 'transparent' }}
                >
                  {isLockedByMe ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canInteract ? 'Agregar al carrito' : 'Reservado'}>
              <span>
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => onAddItem(item)}
                  disabled={!canInteract}
                  sx={{ bgcolor: canInteract ? alpha(theme.palette.success.main, 0.1) : 'transparent' }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Purchased Item Row ───────────────────────────────────────────────────────
function PurchasedItemRow({ item, onRemove }) {
  return (
    <ListItem
      sx={{ px: 2, py: 1 }}
      secondaryAction={
        <IconButton size="small" onClick={() => onRemove(item.id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}>
          <Delete fontSize="small" />
        </IconButton>
      }
    >
      <CheckCircle color="success" sx={{ mr: 1.5, fontSize: 20, flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {item.product_name}
          {item.brand && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}> · {item.brand}</Box>}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {item.quantity} {item.unit}
          </Typography>
          {item.profiles && (
            <Typography variant="caption" color="text.secondary">
              · {item.profiles.full_name}
            </Typography>
          )}
        </Stack>
      </Box>
      {item.total_price != null && (
        <Typography variant="subtitle2" fontWeight={700} color="success.main" sx={{ ml: 1 }}>
          S/{item.total_price.toFixed(2)}
        </Typography>
      )}
    </ListItem>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ShoppingModePage() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const budgetId = searchParams.get('budgetId')
  const navigate = useNavigate()
  const theme = useTheme()

  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { currentBudget, budgetItems, fetchBudgetWithItems, updateBudget } = useBudgetStore()
  const {
    session, participants, locks, purchaseItems,
    loading, startSession, fetchSession, completeSession,
    getTotals, getLockForItem, removePurchaseItem, unsubscribe,
  } = useShoppingStore()
  const { createPurchase } = usePurchaseStore()
  const { enqueueSnackbar } = useSnackbar()

  const [purchase, setPurchase] = useState(null)
  const [addItemDialog, setAddItemDialog] = useState({ open: false, item: null })
  const [completing, setCompleting] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [showBought, setShowBought] = useState(false)

  useEffect(() => {
    // Helper: find or create the purchase record linked to a session.
    // Using session_id as the idempotency key avoids duplicates on StrictMode
    // double-invocations or component remounts after navigation.
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
      if (sessionId) {
        // Resuming an existing session (component remounted after navigate)
        await fetchSession(sessionId, user.id)
        // Recover the purchase that was already created for this session
        const { data: purch } = await supabase
          .from('purchases')
          .select('id, name, total_amount')
          .eq('session_id', sessionId)
          .maybeSingle()
        if (purch) setPurchase(purch)
        setInitialized(true)
      } else if (budgetId && currentWorkspace && user) {
        await fetchBudgetWithItems(budgetId)
        const { data: sess } = await startSession(budgetId, currentWorkspace.id, user.id)
        if (sess) {
          const purch = await resolveSessionPurchase(sess.id, currentWorkspace.id, budgetId)
          if (purch) setPurchase(purch)
          navigate(`/shopping/${sess.id}`, { replace: true })
        }
        setInitialized(true)
      }
    }

    if (user) init()
    return () => unsubscribe()
  }, [sessionId, budgetId, user?.id])

  useEffect(() => {
    if (session?.budget_id && !currentBudget) fetchBudgetWithItems(session.budget_id)
  }, [session?.budget_id])

  const totalSpent = getTotals()
  const budget = currentBudget?.target_amount || 0
  const diff = budget - totalSpent
  const progress = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0
  const overBudget = budget > 0 && totalSpent > budget

  const purchasedIds = new Set(purchaseItems.map((p) => p.budget_item_id).filter(Boolean))
  const pendingItems = budgetItems.filter((i) => !purchasedIds.has(i.id))
  const boughtBudgetItems = budgetItems.filter((i) => purchasedIds.has(i.id))

  const handleComplete = async () => {
    if (!session) return
    setCompleting(true)

    const [{ error: sessErr }] = await Promise.all([
      completeSession(session.id),
      // Mark the linked budget as completed so it's clear in the UI
      session.budget_id
        ? updateBudget(session.budget_id, { status: 'completed' })
        : Promise.resolve(),
    ])

    setCompleting(false)
    if (sessErr) {
      enqueueSnackbar('Error al finalizar la compra', { variant: 'error' })
    } else {
      enqueueSnackbar('¡Compra finalizada! El presupuesto fue marcado como completado.', { variant: 'success' })
      navigate('/purchases')
    }
  }

  if (!initialized || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingCart sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <CircularProgress color="primary" size={28} />
        <Typography color="text.secondary" variant="body2">Iniciando modo compra…</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 14, maxWidth: 600, mx: 'auto' }}>

      {/* ── Sticky header ── */}
      <Box
        sx={{
          position: 'sticky', top: 0, zIndex: 20,
          bgcolor: 'background.default',
          borderBottom: '1px solid', borderColor: 'divider',
          pb: 1.5, pt: 1, px: 0,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Title row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <IconButton size="small" onClick={() => navigate('/budgets')} sx={{ mr: 0.5 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>{currentBudget?.name ?? 'Modo Compra'}</Typography>
            {currentBudget?.store && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Store sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">{currentBudget.store}</Typography>
              </Box>
            )}
          </Box>

          {/* Participants */}
          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 11, border: `2px solid ${theme.palette.background.default}` } }}>
            {participants.map((p) => (
              <Tooltip key={p.id} title={p.profiles?.full_name ?? ''}>
                <Avatar src={p.profiles?.avatar_url} sx={{ bgcolor: 'primary.main' }}>
                  {p.profiles?.full_name?.[0]?.toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Box>

        {/* Totals */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
          <Box sx={{ flex: 1, textAlign: 'center', p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography variant="h6" fontWeight={800} color="primary.main">S/{totalSpent.toFixed(2)}</Typography>
            <Typography variant="caption" color="text.secondary">Gastado</Typography>
          </Box>
          {budget > 0 && (
            <Box sx={{ flex: 1, textAlign: 'center', p: 1, borderRadius: 2, bgcolor: overBudget ? alpha(theme.palette.error.main, 0.1) : 'action.hover' }}>
              <Typography variant="h6" fontWeight={800} color={overBudget ? 'error.main' : 'success.main'}>
                {overBudget ? `-S/${Math.abs(diff).toFixed(2)}` : `S/${diff.toFixed(2)}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">{overBudget ? 'Excedido' : 'Disponible'}</Typography>
            </Box>
          )}
          <Box sx={{ flex: 1, textAlign: 'center', p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography variant="h6" fontWeight={800}>{purchaseItems.length}</Typography>
            <Typography variant="caption" color="text.secondary">Items</Typography>
          </Box>
        </Box>

        {/* Progress bar */}
        {budget > 0 && (
          <LinearProgress
            variant="determinate"
            value={progress}
            color={overBudget ? 'error' : progress > 80 ? 'warning' : 'primary'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        )}
      </Box>

      {/* ── Purchased items section ── */}
      {purchaseItems.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="text"
            startIcon={showBought ? <ExpandLess /> : <ExpandMore />}
            endIcon={<Chip size="small" label={purchaseItems.length} color="success" sx={{ height: 20 }} />}
            onClick={() => setShowBought(!showBought)}
            sx={{ justifyContent: 'space-between', px: 0.5, mb: 0.5, color: 'text.secondary' }}
          >
            <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1, textAlign: 'left' }}>
              Agregados al carrito
            </Typography>
          </Button>

          <Collapse in={showBought}>
            <Card sx={{ mb: 2 }}>
              <List disablePadding>
                {purchaseItems.map((pi, i) => (
                  <Box key={pi.id}>
                    <PurchasedItemRow item={pi} onRemove={removePurchaseItem} />
                    {i < purchaseItems.length - 1 && <Divider component="li" />}
                  </Box>
                ))}
              </List>
            </Card>
          </Collapse>
        </Box>
      )}

      {/* ── Pending budget items ── */}
      {pendingItems.length > 0 && (
        <Box sx={{ mt: purchaseItems.length > 0 ? 0 : 2 }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1, px: 0.5 }}>
            Pendientes ({pendingItems.length})
          </Typography>
          {pendingItems.map((item) => {
            const lock = getLockForItem(item.id)
            return (
              <BudgetItemCard
                key={item.id}
                item={item}
                lock={lock}
                isLockedByMe={lock?.user_id === user?.id}
                sessionId={session?.id}
                purchaseId={purchase?.id}
                userId={user?.id}
                workspaceId={currentWorkspace?.id}
                alreadyBought={purchasedIds.has(item.id)}
                onAddItem={(i) => setAddItemDialog({ open: true, item: i })}
              />
            )
          })}
        </Box>
      )}

      {/* ── Completed items from budget ── */}
      {boughtBudgetItems.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.disabled" sx={{ px: 0.5 }}>
            Ya comprados del presupuesto
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5, opacity: 0.5 }}>
            {boughtBudgetItems.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                <CheckCircle color="success" sx={{ fontSize: 16 }} />
                <Typography variant="body2" sx={{ textDecoration: 'line-through' }} noWrap>{item.product_name}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Empty state */}
      {pendingItems.length === 0 && purchaseItems.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShoppingCart sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">No hay items en el presupuesto.</Typography>
          <Typography variant="body2" color="text.disabled">Usa el botón + para agregar productos.</Typography>
        </Box>
      )}

      {/* ── FAB – add free item ── */}
      <Fab
        color="primary"
        size="medium"
        sx={{ position: 'fixed', bottom: 88, right: 20, boxShadow: '0 4px 20px rgba(37,99,235,0.45)' }}
        onClick={() => setAddItemDialog({ open: true, item: null })}
      >
        <Add />
      </Fab>

      {/* ── Bottom bar – complete ── */}
      <Box
        sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          p: 2, pt: 1.5,
          bgcolor: 'background.default',
          borderTop: '1px solid', borderColor: 'divider',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Button
          fullWidth variant="contained" color="success" size="large"
          startIcon={<Done />}
          onClick={handleComplete}
          disabled={completing || purchaseItems.length === 0}
          sx={{ py: 1.5, fontSize: '0.95rem' }}
        >
          {completing ? 'Finalizando…' : `Finalizar compra · S/${totalSpent.toFixed(2)}`}
        </Button>
      </Box>

      <AddItemDialog
        open={addItemDialog.open}
        budgetItem={addItemDialog.item}
        sessionId={session?.id}
        purchaseId={purchase?.id}
        userId={user?.id}
        workspaceId={currentWorkspace?.id}
        onClose={() => setAddItemDialog({ open: false, item: null })}
      />
    </Box>
  )
}
