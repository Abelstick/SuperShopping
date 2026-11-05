import { useState, useEffect, useMemo } from 'react'
import {
  Box, Button, Card, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Skeleton, Divider, Tooltip, useTheme,
} from '@mui/material'
import {
  Add, MoreVert, Edit, Delete, PlayArrow, Receipt, ContentCopy,
  TrendingUp, TrendingDown, TrendingFlat, Warning, ShoppingCartRounded,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '../store/budgetStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import { useShoppingStore } from '@/features/shopping/store/shoppingStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import { BudgetMeter, ConfirmDialog, PageHeader, Panel, PrimaryAction, Section, StatusPill } from '@/shared/components/ui'
import { fmtMoney, fmtDate, fmtMonth } from '@/shared/utils/format'
import BudgetForm from '../components/BudgetForm'
import BudgetStatusChip from '../components/BudgetStatusChip'
import { FS, NUM, reveal } from '@/theme/tokens'

// ── Resumen: lo que queda, y de dónde sale ───────────────────────────────────
// Déficit = tomate con signo; el resto es neutro
function BudgetSummary({ stats, linkedCount }) {
  const st = useTheme().vars.palette.stock
  const over = stats.totalRemaining < 0
  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: FS.meta, fontWeight: 600, color: 'text.secondary' }}>Total restante</Typography>
          <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: over ? st.agotado.text : 'text.primary' }}>
            {fmtMoney(stats.totalRemaining)}
          </Typography>
          <Typography sx={{ fontSize: FS.body, fontWeight: 600 }}>
            {over ? 'Excedido' : stats.totalRemaining === 0 ? 'Sin límites definidos' : 'Disponible'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 3, sm: 5 }, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Total límites</Typography>
            <Typography sx={{ ...NUM, fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{fmtMoney(stats.totalLimits)}</Typography>
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{stats.budgetsWithLimit} presupuesto{stats.budgetsWithLimit !== 1 ? 's' : ''} con límite</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Total gastado</Typography>
            <Typography sx={{ ...NUM, fontSize: 18, fontWeight: 700, lineHeight: 1.3, color: stats.totalSpent > stats.totalLimits && stats.totalLimits > 0 ? st.agotado.text : 'text.primary' }}>{fmtMoney(stats.totalSpent)}</Typography>
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{linkedCount} compras vinculadas</Typography>
          </Box>
        </Box>
      </Box>
      {stats.totalLimits > 0 && <BudgetMeter spent={stats.totalSpent} limit={stats.totalLimits} labels={false} />}
    </Card>
  )
}

// ── Patrones de consumo ──────────────────────────────────────────────────────
function ConsumptionChart({ purchases }) {
  const theme = useTheme()
  const st = theme.vars.palette.stock
  const months = useMemo(() => {
    const byMonth = {}
    purchases.forEach((p) => {
      if (!p.date) return
      const key = p.date.substring(0, 7)
      byMonth[key] = (byMonth[key] || 0) + (p.total_amount || 0)
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, total]) => ({ key, label: fmtMonth(key), total }))
  }, [purchases])

  if (months.length < 2) return null

  const maxTotal = Math.max(...months.map((m) => m.total), 1)
  const last = months[months.length - 1]
  const prev = months[months.length - 2]
  const diff = prev.total > 0 ? ((last.total - prev.total) / prev.total) * 100 : null

  // Subir el gasto avisa en coral; bajar es neutro (no es un flujo positivo)
  const TrendIcon = diff === null ? TrendingFlat : diff > 0 ? TrendingUp : TrendingDown
  const trendColor = diff !== null && diff > 0 ? st.agotado.text : theme.vars.palette.text.secondary
  const summary = `Patrones de consumo: ${months.map((m) => `${m.label} ${fmtMoney(m.total)}`).join(', ')}`

  return (
    <Panel
      title="Patrones de consumo"
      actions={diff !== null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: trendColor }}>
          <TrendIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, color: 'inherit' }}>
            {diff > 0 ? '+' : ''}{diff.toFixed(0)}% vs mes anterior
          </Typography>
        </Box>
      )}
    >
      <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 1 }}>
      <Box role="img" aria-label={summary} sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'flex-end', height: 112 }}>
        {months.map((m, i) => {
          const isLast = i === months.length - 1
          return (
            <Tooltip key={m.key} title={fmtMoney(m.total)} placement="top">
              <Box tabIndex={0} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, borderRadius: '8px' }}>
                <Box sx={{ width: '100%', height: Math.max((m.total / maxTotal) * 80, 4), bgcolor: 'primary.main', opacity: isLast ? 1 : 0.35, borderRadius: '6px 6px 0 0' }} />
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.2 }}>{m.label}</Typography>
              </Box>
            </Tooltip>
          )
        })}
      </Box>
      <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', columnGap: 4, rowGap: 1, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Promedio mensual</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{fmtMoney(months.reduce((a, m) => a + m.total, 0) / months.length)}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Mayor gasto</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{fmtMoney(Math.max(...months.map((m) => m.total)))}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Meses analizados</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{months.length}</Typography>
        </Box>
      </Box>
      </Box>
    </Panel>
  )
}

// ── Tarjeta de presupuesto ───────────────────────────────────────────────────
function BudgetCard({ budget, isEditor, onEdit, onDelete, onActivate, onDuplicate, onOpen, onShop, session, spentAmount }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const close = () => setAnchorEl(null)
  const spent = spentAmount || 0
  const limit = budget.target_amount || 0
  const meta = [budget.store, budget.date ? fmtDate(budget.date) : null].filter(Boolean).join(' · ')
  const canShop = isEditor && budget.status === 'active'

  const openOnKey = (e) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Abrir presupuesto ${budget.name}`}
      onClick={onOpen}
      onKeyDown={openOnKey}
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column', gap: 1.25, cursor: 'pointer', p: { xs: 2, sm: 2.5 },
        transition: 'border-color 140ms',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="h3" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }} noWrap>{budget.name}</Typography>
          {meta && <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }} noWrap>{meta}</Typography>}
        </Box>
        <Box sx={{ pt: 0.25, display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {session && <StatusPill tone="brand" icon={ShoppingCartRounded}>En curso</StatusPill>}
          {!session && <BudgetStatusChip status={budget.status} />}
        </Box>
        {isEditor && (
          <>
            <IconButton
              aria-label={`Acciones de ${budget.name}`}
              onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget) }}
              sx={{ flexShrink: 0, mt: -0.75, mr: -1, color: 'text.secondary' }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={(e) => { e?.stopPropagation?.(); close() }}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem onClick={() => { close(); onEdit() }}>
                <ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Editar</ListItemText>
              </MenuItem>
              {(budget.status === 'draft' || budget.status === 'completed') && (
                <MenuItem onClick={() => { close(); onActivate() }}>
                  <ListItemIcon><PlayArrow fontSize="small" /></ListItemIcon>
                  <ListItemText>{budget.status === 'completed' ? 'Reactivar' : 'Activar'}</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => { close(); onDuplicate() }}>
                <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon><ListItemText>Duplicar</ListItemText>
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={() => { close(); onDelete() }}>
                <ListItemIcon><Delete fontSize="small" /></ListItemIcon><ListItemText>Eliminar</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      {limit > 0 ? (
        <BudgetMeter spent={spent} limit={limit} spentLabel={spent > 0 ? `${fmtMoney(spent)} de ${fmtMoney(limit)}` : `Límite ${fmtMoney(limit)}`} />
      ) : null}

      <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 24, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>
          Creado por <strong>{budget.profiles?.full_name || 'usuario'}</strong>
        </Typography>
      </Box>

      {canShop && (
        <Button
          fullWidth variant="outlined" startIcon={<ShoppingCartRounded />}
          onClick={(e) => { e.stopPropagation(); onShop() }}
        >
          {session ? 'Retomar compra' : 'Iniciar compra'}
        </Button>
      )}
    </Card>
  )
}

const GRID = { display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }

export default function BudgetsPage() {
  const theme = useTheme()
  const st = theme.vars.palette.stock
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { budgets, loading, fetchBudgets, updateBudget, deleteBudget, duplicateBudget } = useBudgetStore()
  const { purchases, fetchPurchases } = usePurchaseStore()
  const activeSessions = useShoppingStore((s) => s.activeSessions)
  const refreshSignal = useAppStore((s) => s.refreshSignal)
  const { enqueueSnackbar } = useSnackbar()
  const [formDialog, setFormDialog] = useState({ open: false, budget: null })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)

  // Mismas dos cargas de siempre; ahora se recoge el `{ error }` que ya devuelven
  useEffect(() => {
    if (!currentWorkspace) return
    let cancelled = false
    Promise.all([fetchBudgets(currentWorkspace.id), fetchPurchases(currentWorkspace.id)])
      .then((results) => {
        if (cancelled) return
        const failed = results.find((r) => r?.error)
        setLoadError(failed ? { message: failed.error.message || 'Sin detalle del servidor' } : null)
      })
      .catch((e) => { if (!cancelled) setLoadError({ message: e?.message || 'Sin detalle del servidor' }) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, refreshSignal, retryTick])

  const spentByBudgetId = useMemo(() => {
    const map = {}
    purchases.forEach((p) => {
      if (p.budget_id) map[p.budget_id] = (map[p.budget_id] || 0) + (p.total_amount || 0)
    })
    return map
  }, [purchases])

  const summaryStats = useMemo(() => {
    const budgetsWithLimit = budgets.filter((b) => b.target_amount > 0)
    const totalLimits = budgetsWithLimit.reduce((acc, b) => acc + b.target_amount, 0)
    const totalSpent = budgets.reduce((acc, b) => acc + (spentByBudgetId[b.id] || 0), 0)
    const totalRemaining = totalLimits - totalSpent
    return { totalLimits, totalSpent, totalRemaining, budgetsWithLimit: budgetsWithLimit.length }
  }, [budgets, spentByBudgetId])

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await deleteBudget(deleteConfirm.id)
    setDeleting(false)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Presupuesto eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const handleActivate = async (budget) => {
    const { error } = await updateBudget(budget.id, { status: 'active' })
    if (error) enqueueSnackbar('Error al activar', { variant: 'error' })
    else enqueueSnackbar(
      budget.status === 'completed' ? 'Presupuesto reactivado' : 'Presupuesto activado',
      { variant: 'success' }
    )
  }

  const handleDuplicate = async (budget) => {
    const { error } = await duplicateBudget(budget.id, currentWorkspace.id, user.id)
    if (error) enqueueSnackbar('Error al duplicar', { variant: 'error' })
    else enqueueSnackbar('Presupuesto duplicado como borrador', { variant: 'success' })
  }

  const isEditor = ['owner', 'editor'].includes(currentWorkspace?.my_role)
  const active = budgets.filter((b) => b.status === 'active')
  const rest = budgets.filter((b) => b.status !== 'active')
  const showSkeleton = loading && budgets.length === 0
  const failedWithoutData = Boolean(loadError) && budgets.length === 0
  const openNew = () => setFormDialog({ open: true, budget: null })

  const sessionByBudget = new Map(activeSessions.map((a) => [a.budget_id, a]))

  const cardProps = (b) => ({
    budget: b,
    isEditor,
    spentAmount: spentByBudgetId[b.id] || 0,
    session: sessionByBudget.get(b.id),
    onOpen: () => navigate(`/budgets/${b.id}`),
    onShop: () => { const sess = sessionByBudget.get(b.id); navigate(sess ? `/shopping/${sess.id}` : `/shopping/new?budgetId=${b.id}`) },
    onEdit: () => setFormDialog({ open: true, budget: b }),
    onDelete: () => setDeleteConfirm(b),
    onActivate: () => handleActivate(b),
    onDuplicate: () => handleDuplicate(b),
  })

  // Objeto afectado al borrar: compras vinculadas y su gasto
  const linked = purchases.filter((p) => p.budget_id === deleteConfirm?.id)
  const linkedSpent = spentByBudgetId[deleteConfirm?.id] || 0
  const deleteIsActive = deleteConfirm?.status === 'active'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 } }}>
      <PageHeader
        {...reveal(0)}
        title="Presupuestos"
        subtitle={active.length > 0
          ? `${active.length} presupuesto${active.length > 1 ? 's' : ''} activo${active.length > 1 ? 's' : ''}`
          : 'Sin presupuestos activos'}
        actions={isEditor && <PrimaryAction icon={<Add />} label="Nuevo" onClick={openNew} />}
      />

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      {showSkeleton && <Skeleton variant="rectangular" height={148} sx={{ borderRadius: '16px' }} />}
      {budgets.length > 0 && (
        <Box {...reveal(1)}>
          <BudgetSummary stats={summaryStats} linkedCount={purchases.filter((p) => p.budget_id).length} />
        </Box>
      )}

      <Box {...reveal(2)}>
        {showSkeleton ? (
          <Box sx={GRID}>
            {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={180} sx={{ borderRadius: '16px' }} />)}
          </Box>
        ) : failedWithoutData ? null : budgets.length === 0 ? (
          <EmptyState
            icon={<Receipt sx={{ fontSize: 28 }} />}
            title="Sin presupuestos"
            body="Crea un presupuesto para organizar tu próxima compra"
            action={isEditor && <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Crear presupuesto</Button>}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 } }}>
            {active.length > 0 && (
              <Section title="Activos" count={active.length}>
                <Box sx={GRID}>{active.map((b) => <BudgetCard key={b.id} {...cardProps(b)} />)}</Box>
              </Section>
            )}
            {rest.length > 0 && (
              <Section title={active.length > 0 ? 'Otros' : undefined} count={active.length > 0 ? rest.length : null}>
                <Box sx={GRID}>{rest.map((b) => <BudgetCard key={b.id} {...cardProps(b)} />)}</Box>
              </Section>
            )}
          </Box>
        )}
      </Box>

      {/* Patrones de consumo */}
      {purchases.length > 0 && <Box {...reveal(3)}><ConsumptionChart purchases={purchases} /></Box>}

      <BudgetForm
        open={formDialog.open}
        budget={formDialog.budget}
        workspaceId={currentWorkspace?.id}
        userId={user?.id}
        onClose={() => setFormDialog({ open: false, budget: null })}
      />

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar presupuesto"
        icon={<Delete sx={{ fontSize: 22 }} />}
        confirmLabel="Eliminar"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontSize: FS.body }}>
            ¿Eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.
          </Typography>
          {deleteIsActive && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: '10px', bgcolor: st.riesgo.tint, border: 1, borderColor: st.riesgo.line }}>
              <Warning sx={{ fontSize: 20, color: st.riesgo.icon, flexShrink: 0 }} />
              <Typography sx={{ fontSize: FS.body, fontWeight: 600, color: st.riesgo.text }}>Este presupuesto está activo actualmente.</Typography>
            </Box>
          )}
          {linked.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.5, borderRadius: '10px', bgcolor: st.riesgo.tint, border: 1, borderColor: st.riesgo.line }}>
              <Warning sx={{ fontSize: 20, color: st.riesgo.icon, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: FS.body, fontWeight: 600, color: st.riesgo.text }}>
                  Tiene {linked.length} compra{linked.length !== 1 ? 's' : ''} vinculada{linked.length !== 1 ? 's' : ''}
                </Typography>
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
                  Las compras no se eliminarán, pero quedarán sin presupuesto asignado. Total gastado: <strong>{fmtMoney(linkedSpent)}</strong>
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </ConfirmDialog>
    </Box>
  )
}
