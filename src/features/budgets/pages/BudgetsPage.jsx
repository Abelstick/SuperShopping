import { useState, useEffect, useMemo } from 'react'
import {
  Box, Button, Card, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Skeleton, Divider, LinearProgress,
  Tooltip, CircularProgress, useTheme,
} from '@mui/material'
import {
  Add, MoreVert, Edit, Delete, PlayArrow, Receipt,
  CalendarToday, Store, ArrowForward, ContentCopy,
  TrendingUp, TrendingDown, TrendingFlat,
  Warning, ErrorOutlined,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '../store/budgetStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import { fmtMoney, fmtDate, fmtMonth } from '@/shared/utils/format'
import BudgetForm from '../components/BudgetForm'
import BudgetStatusChip from '../components/BudgetStatusChip'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos/KPIs · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const NUM = { fontVariantNumeric: 'tabular-nums' }

// Cada bloque entra una sola vez, escalonado (único momento orquestado)
const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

// ── Nivel 1: dato hero ───────────────────────────────────────────────────────
// Total restante: déficit = coral con signo; el resto es neutro (el verde es solo para flujos positivos)
function RemainingHero({ remaining }) {
  const st = useTheme().palette.stock
  const over = remaining < 0
  const skin = over ? st.agotado : st.saludable
  const Icon = over ? ErrorOutlined : Receipt
  return (
    <Card sx={{ bgcolor: skin.tint, borderColor: skin.line, p: 3, display: 'flex', flexDirection: 'column', gap: 1, justifyContent: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ fontSize: 24, color: skin.icon }} />
        <Typography component="h2" sx={{ fontSize: FS.body, fontWeight: 700 }}>Total restante</Typography>
      </Box>
      <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: skin.text }}>
        {fmtMoney(remaining)}
      </Typography>
      <Typography sx={{ fontSize: FS.body, fontWeight: 600 }}>
        {over ? 'Excedido' : remaining === 0 ? 'Sin límites definidos' : 'Disponible'}
      </Typography>
    </Card>
  )
}

function KpiCard({ label, value, sub, tone }) {
  const st = useTheme().palette.stock
  return (
    <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, color: tone === 'over' ? st.agotado.text : 'text.primary' }}>{value}</Typography>
      {sub && <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{sub}</Typography>}
    </Card>
  )
}

// ── Patrones de consumo ──────────────────────────────────────────────────────
function ConsumptionChart({ purchases }) {
  const theme = useTheme()
  const st = theme.palette.stock
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
  const trendColor = diff !== null && diff > 0 ? st.agotado.text : theme.palette.text.secondary
  const summary = `Patrones de consumo: ${months.map((m) => `${m.label} ${fmtMoney(m.total)}`).join(', ')}`

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Patrones de consumo</Typography>
        {diff !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: trendColor }}>
            <TrendIcon sx={{ fontSize: 20 }} />
            <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, color: 'inherit' }}>
              {diff > 0 ? '+' : ''}{diff.toFixed(0)}% vs mes anterior
            </Typography>
          </Box>
        )}
      </Box>
      <Box role="img" aria-label={summary} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 112 }}>
        {months.map((m, i) => {
          const isLast = i === months.length - 1
          return (
            <Tooltip key={m.key} title={fmtMoney(m.total)} placement="top">
              <Box tabIndex={0} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, borderRadius: '8px' }}>
                <Box sx={{ width: '100%', height: Math.max((m.total / maxTotal) * 80, 4), bgcolor: 'primary.main', opacity: isLast ? 1 : 0.4, borderRadius: '8px 8px 0 0' }} />
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.2 }}>{m.label}</Typography>
              </Box>
            </Tooltip>
          )
        })}
      </Box>
      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
    </Card>
  )
}

// ── Tarjeta de presupuesto ───────────────────────────────────────────────────
function AlertBadge({ tone, Icon, label, tooltip }) {
  const st = useTheme().palette.stock[tone]
  return (
    <Tooltip title={tooltip}>
      <Box tabIndex={0} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: '8px', bgcolor: st.tint, border: 1, borderColor: st.line, color: st.text }}>
        <Icon sx={{ fontSize: 16, color: st.icon }} />
        <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>{label}</Typography>
      </Box>
    </Tooltip>
  )
}

function BudgetCard({ budget, isEditor, onEdit, onDelete, onActivate, onDuplicate, onOpen, spentAmount }) {
  const st = useTheme().palette.stock
  const [anchorEl, setAnchorEl] = useState(null)
  const close = () => setAnchorEl(null)

  const spent = spentAmount || 0
  const limit = budget.target_amount || 0
  const ratio = limit > 0 ? spent / limit : 0
  const isOver = ratio > 1
  const isNear = ratio >= 0.8 && ratio <= 1

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
        height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden',
        transition: 'border-color 140ms, transform 140ms',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <BudgetStatusChip status={budget.status} />
              {isOver && <AlertBadge tone="agotado" Icon={ErrorOutlined} label="Excedido" tooltip="Gasto real supera el límite del presupuesto" />}
              {isNear && !isOver && <AlertBadge tone="riesgo" Icon={Warning} label="Cerca del límite" tooltip="Gasto real supera el 80% del límite" />}
            </Box>
            <Typography component="h3" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }} noWrap>{budget.name}</Typography>
          </Box>
          {isEditor && (
            <>
              <IconButton
                aria-label={`Acciones de ${budget.name}`}
                onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget) }}
                sx={{ flexShrink: 0 }}
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1 }}>
          {budget.store && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Store sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>{budget.store}</Typography>
            </Box>
          )}
          {budget.date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>{fmtDate(budget.date)}</Typography>
            </Box>
          )}
        </Box>

        {limit > 0 && (
          <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Límite</Typography>
                <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{fmtMoney(limit)}</Typography>
              </Box>
              {spent > 0 ? (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Gastado</Typography>
                  <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, color: isOver ? st.agotado.text : 'text.primary' }}>{fmtMoney(spent)}</Typography>
                </Box>
              ) : (
                <ArrowForward sx={{ fontSize: 20, color: 'text.secondary' }} />
              )}
            </Box>
            {spent > 0 && (
              <LinearProgress
                aria-hidden
                variant="determinate"
                value={Math.min(ratio * 100, 100)}
                sx={{
                  height: 8, bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': { bgcolor: isOver ? st.agotado.icon : isNear ? st.riesgo.icon : 'primary.main' },
                }}
              />
            )}
          </Box>
        )}
      </Box>

      <Box sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>
          Creado por <strong>{budget.profiles?.full_name || 'usuario'}</strong>
        </Typography>
      </Box>
    </Card>
  )
}

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }

export default function BudgetsPage() {
  const theme = useTheme()
  const st = theme.palette.stock
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { budgets, loading, fetchBudgets, updateBudget, deleteBudget, duplicateBudget } = useBudgetStore()
  const { purchases, fetchPurchases } = usePurchaseStore()
  const { refreshSignal } = useAppStore()
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

  const cardProps = (b) => ({
    budget: b,
    isEditor,
    spentAmount: spentByBudgetId[b.id] || 0,
    onOpen: () => navigate(`/budgets/${b.id}`),
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header: título + única acción primaria */}
      <Box {...reveal(0)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>Presupuestos</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>
            {active.length > 0
              ? `${active.length} presupuesto${active.length > 1 ? 's' : ''} activo${active.length > 1 ? 's' : ''}`
              : 'Sin presupuestos activos'}
          </Typography>
        </Box>
        {isEditor && <Button startIcon={<Add />} variant="contained" onClick={openNew}>Nuevo</Button>}
      </Box>

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      {/* Nivel 1 y 2: hero + KPIs (solo con presupuestos) */}
      {showSkeleton && (
        <Box {...reveal(1)} sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' } }}>
          <Skeleton variant="rectangular" height={168} sx={{ borderRadius: '12px' }} />
          <Skeleton variant="rectangular" height={168} sx={{ borderRadius: '12px' }} />
        </Box>
      )}
      {budgets.length > 0 && (
        <Box {...reveal(1)} sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' } }}>
          <RemainingHero remaining={summaryStats.totalRemaining} />
          <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))' } }}>
            <KpiCard
              label="Total límites"
              value={fmtMoney(summaryStats.totalLimits)}
              sub={`${summaryStats.budgetsWithLimit} presupuesto${summaryStats.budgetsWithLimit !== 1 ? 's' : ''} con límite`}
            />
            <KpiCard
              label="Total gastado"
              value={fmtMoney(summaryStats.totalSpent)}
              tone={summaryStats.totalSpent > summaryStats.totalLimits && summaryStats.totalLimits > 0 ? 'over' : undefined}
              sub={purchases.filter((p) => p.budget_id).length + ' compras vinculadas'}
            />
          </Box>
        </Box>
      )}

      {/* Patrones de consumo */}
      {purchases.length > 0 && <Box {...reveal(2)}><ConsumptionChart purchases={purchases} /></Box>}

      {/* Contenido */}
      <Box {...reveal(3)}>
        {showSkeleton ? (
          <Box sx={GRID}>
            {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={240} sx={{ borderRadius: '12px' }} />)}
          </Box>
        ) : failedWithoutData ? null : budgets.length === 0 ? (
          <EmptyState
            icon={<Receipt sx={{ fontSize: 28 }} />}
            title="Sin presupuestos"
            body="Crea un presupuesto para organizar tu próxima compra"
            action={isEditor && <Button variant="contained" startIcon={<Add />} onClick={openNew}>Crear presupuesto</Button>}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {active.length > 0 && (
              <Box component="section">
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                  <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Activos</Typography>
                  <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>{active.length}</Typography>
                </Box>
                <Box sx={GRID}>{active.map((b) => <BudgetCard key={b.id} {...cardProps(b)} />)}</Box>
              </Box>
            )}
            {rest.length > 0 && (
              <Box component="section">
                {active.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                    <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Otros</Typography>
                    <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>{rest.length}</Typography>
                  </Box>
                )}
                <Box sx={GRID}>{rest.map((b) => <BudgetCard key={b.id} {...cardProps(b)} />)}</Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <BudgetForm
        open={formDialog.open}
        budget={formDialog.budget}
        workspaceId={currentWorkspace?.id}
        userId={user?.id}
        onClose={() => setFormDialog({ open: false, budget: null })}
      />

      <Dialog open={Boolean(deleteConfirm)} onClose={deleting ? undefined : () => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: 'error.main', borderRadius: '8px', color: 'error.contrastText', display: 'flex' }}>
              <Delete sx={{ fontSize: 24 }} />
            </Box>
            Eliminar presupuesto
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ fontSize: FS.body }}>
              ¿Eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.
            </Typography>
            {deleteIsActive && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: '8px', bgcolor: st.riesgo.tint, border: 1, borderColor: st.riesgo.line }}>
                <Warning sx={{ fontSize: 20, color: st.riesgo.icon, flexShrink: 0 }} />
                <Typography sx={{ fontSize: FS.body, fontWeight: 600, color: st.riesgo.text }}>Este presupuesto está activo actualmente.</Typography>
              </Box>
            )}
            {linked.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.5, borderRadius: '8px', bgcolor: st.riesgo.tint, border: 1, borderColor: st.riesgo.line }}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Delete />}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
