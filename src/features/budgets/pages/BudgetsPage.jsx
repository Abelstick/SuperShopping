import { useState, useEffect, useMemo } from 'react'
import {
  Box, Button, Card, Typography, Grid, Chip,
  IconButton, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Skeleton, Divider, LinearProgress, Tooltip,
} from '@mui/material'
import {
  Add, MoreVert, Edit, Delete, PlayArrow, Receipt,
  CalendarToday, Store, ArrowForward, ContentCopy,
  TrendingUp, TrendingDown, TrendingFlat,
  Warning, ErrorOutline,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '../store/budgetStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import { useAppStore } from '@/store/appStore'
import BudgetForm from '../components/BudgetForm'

const STATUS_META = {
  draft:     { label: 'Borrador',   bg: 'rgba(161,161,170,0.12)',  color: '#71717a' },
  active:    { label: 'Activo',     bg: 'rgba(99,102,241,0.12)',   color: '#6366f1' },
  completed: { label: 'Completado', bg: 'rgba(16,185,129,0.12)',   color: '#10b981' },
  cancelled: { label: 'Cancelado',  bg: 'rgba(244,63,94,0.12)',    color: '#f43f5e' },
}

function StatCard({ label, value, color, sub }) {
  return (
    <Card sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', color: color || 'text.primary' }}>
        S/{value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.disabled">{sub}</Typography>
      )}
    </Card>
  )
}

function ConsumptionChart({ purchases }) {
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
      .map(([key, total]) => ({
        label: new Date(key + '-02').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
        total,
      }))
  }, [purchases])

  if (months.length < 2) return null

  const maxTotal = Math.max(...months.map((m) => m.total), 1)
  const last = months[months.length - 1]
  const prev = months[months.length - 2]
  const diff = prev.total > 0 ? ((last.total - prev.total) / prev.total) * 100 : null

  const TrendIcon = diff === null ? TrendingFlat : diff > 0 ? TrendingUp : TrendingDown
  const trendColor = diff === null ? 'text.secondary' : diff > 0 ? 'error.main' : 'success.main'

  return (
    <Card sx={{ p: 2.5, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700}>Patrones de consumo</Typography>
        {diff !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendIcon sx={{ fontSize: 16, color: trendColor }} />
            <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
              {diff > 0 ? '+' : ''}{diff.toFixed(0)}% vs mes anterior
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 80 }}>
        {months.map((m, i) => {
          const isLast = i === months.length - 1
          return (
            <Tooltip key={i} title={`S/${m.total.toFixed(2)}`} placement="top">
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: Math.max((m.total / maxTotal) * 64, 4),
                    bgcolor: isLast ? 'primary.main' : 'primary.light',
                    borderRadius: '3px 3px 0 0',
                    opacity: 0.5 + (i / months.length) * 0.5,
                    transition: 'height 0.3s ease',
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textAlign: 'center', lineHeight: 1.2 }}>
                  {m.label}
                </Typography>
              </Box>
            </Tooltip>
          )
        })}
      </Box>
      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 3 }}>
        <Box>
          <Typography variant="caption" color="text.disabled">Promedio mensual</Typography>
          <Typography variant="body2" fontWeight={700}>
            S/{(months.reduce((a, m) => a + m.total, 0) / months.length).toFixed(2)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.disabled">Mayor gasto</Typography>
          <Typography variant="body2" fontWeight={700}>
            S/{Math.max(...months.map((m) => m.total)).toFixed(2)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.disabled">Meses analizados</Typography>
          <Typography variant="body2" fontWeight={700}>{months.length}</Typography>
        </Box>
      </Box>
    </Card>
  )
}

function BudgetCard({ budget, isEditor, onEdit, onDelete, onActivate, onDuplicate, onOpen, spentAmount }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const meta = STATUS_META[budget.status] || STATUS_META.draft

  const spent = spentAmount || 0
  const limit = budget.target_amount || 0
  const ratio = limit > 0 ? spent / limit : 0
  const isOver = ratio > 1
  const isNear = ratio >= 0.8 && ratio <= 1

  return (
    <Card
      onClick={onOpen}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        overflow: 'hidden',
        '&:hover': { borderColor: meta.color + '66', boxShadow: `0 4px 20px ${meta.color}18` },
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Status stripe */}
      <Box sx={{ height: 3, bgcolor: meta.color, flexShrink: 0 }} />

      <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0, mr: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={meta.label}
                sx={{
                  bgcolor: meta.bg,
                  color: meta.color,
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  height: 22,
                  border: `1px solid ${meta.color}33`,
                }}
              />
              {isOver && (
                <Tooltip title="Gasto real supera el límite del presupuesto">
                  <Chip
                    size="small"
                    icon={<ErrorOutline sx={{ fontSize: '13px !important' }} />}
                    label="Excedido"
                    sx={{ height: 22, fontSize: '0.6275rem', fontWeight: 700, bgcolor: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)' }}
                  />
                </Tooltip>
              )}
              {isNear && !isOver && (
                <Tooltip title="Gasto real supera el 80% del límite">
                  <Chip
                    size="small"
                    icon={<Warning sx={{ fontSize: '13px !important' }} />}
                    label="Cerca del límite"
                    sx={{ height: 22, fontSize: '0.6275rem', fontWeight: 700, bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                  />
                </Tooltip>
              )}
            </Box>
            <Typography variant="h6" fontWeight={700} noWrap sx={{ letterSpacing: '-0.01em' }}>
              {budget.name}
            </Typography>
          </Box>
          {isEditor && (
            <>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget) }}
                sx={{ mt: -0.5 }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={(e) => { e?.stopPropagation?.(); setAnchorEl(null) }}
                onClick={(e) => e.stopPropagation()}
              >
                <MenuItem onClick={() => { setAnchorEl(null); onEdit() }}>
                  <Edit fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />Editar
                </MenuItem>
                {(budget.status === 'draft' || budget.status === 'completed') && (
                  <MenuItem onClick={() => { setAnchorEl(null); onActivate() }}>
                    <PlayArrow fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />
                    {budget.status === 'completed' ? 'Reactivar' : 'Activar'}
                  </MenuItem>
                )}
                <MenuItem onClick={() => { setAnchorEl(null); onDuplicate() }}>
                  <ContentCopy fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />Duplicar
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => { setAnchorEl(null); onDelete() }} sx={{ color: 'error.main' }}>
                  <Delete fontSize="small" sx={{ mr: 1.25 }} />Eliminar
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {/* Meta info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flexGrow: 1 }}>
          {budget.store && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Store sx={{ fontSize: 15, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary">{budget.store}</Typography>
            </Box>
          )}
          {budget.date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarToday sx={{ fontSize: 15, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary">
                {new Date(budget.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Budget amount + spending progress */}
        {limit > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Límite</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em', color: meta.color }}>
                  S/{limit.toLocaleString('es-AR')}
                </Typography>
              </Box>
              {spent > 0 && (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">Gastado</Typography>
                  <Typography variant="body2" fontWeight={700} color={isOver ? 'error.main' : 'text.primary'}>
                    S/{spent.toFixed(2)}
                  </Typography>
                </Box>
              )}
              {spent === 0 && <ArrowForward sx={{ fontSize: 18, color: 'text.disabled' }} />}
            </Box>
            {spent > 0 && (
              <LinearProgress
                variant="determinate"
                value={Math.min(ratio * 100, 100)}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: isOver ? 'error.main' : isNear ? 'warning.main' : 'success.main',
                    borderRadius: 2,
                  },
                }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Creator */}
      <Box
        sx={{
          px: 2.5,
          py: 1.25,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" color="text.disabled">
          Creado por <strong>{budget.profiles?.full_name || 'usuario'}</strong>
        </Typography>
      </Box>
    </Card>
  )
}

export default function BudgetsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { budgets, loading, fetchBudgets, updateBudget, deleteBudget, duplicateBudget } = useBudgetStore()
  const { purchases, fetchPurchases } = usePurchaseStore()
  const { refreshSignal } = useAppStore()
  const { enqueueSnackbar } = useSnackbar()
  const [formDialog, setFormDialog] = useState({ open: false, budget: null })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (currentWorkspace) {
      fetchBudgets(currentWorkspace.id)
      fetchPurchases(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, refreshSignal])

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
    const { error } = await deleteBudget(deleteConfirm.id)
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
  const active    = budgets.filter((b) => b.status === 'active')
  const rest      = budgets.filter((b) => b.status !== 'active')

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            Presupuestos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {active.length > 0
              ? `${active.length} presupuesto${active.length > 1 ? 's' : ''} activo${active.length > 1 ? 's' : ''}`
              : 'Sin presupuestos activos'}
          </Typography>
        </Box>
        {isEditor && (
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => setFormDialog({ open: true, budget: null })}
          >
            Nuevo
          </Button>
        )}
      </Box>

      {/* Summary stats */}
      {budgets.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              label="Total límites"
              value={summaryStats.totalLimits.toFixed(2)}
              sub={`${summaryStats.budgetsWithLimit} presupuesto${summaryStats.budgetsWithLimit !== 1 ? 's' : ''} con límite`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              label="Total gastado"
              value={summaryStats.totalSpent.toFixed(2)}
              color={summaryStats.totalSpent > summaryStats.totalLimits && summaryStats.totalLimits > 0 ? 'error.main' : undefined}
              sub={purchases.filter((p) => p.budget_id).length + ' compras vinculadas'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              label="Total restante"
              value={Math.abs(summaryStats.totalRemaining).toFixed(2)}
              color={summaryStats.totalRemaining < 0 ? 'error.main' : summaryStats.totalRemaining === 0 ? 'text.secondary' : 'success.main'}
              sub={summaryStats.totalRemaining < 0 ? 'Excedido' : summaryStats.totalRemaining === 0 ? 'Sin límites definidos' : 'Disponible'}
            />
          </Grid>
        </Grid>
      )}

      {/* Consumption patterns */}
      {purchases.length > 0 && <ConsumptionChart purchases={purchases} />}

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : budgets.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <Receipt sx={{ fontSize: 52, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>
            Sin presupuestos
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            Crea un presupuesto para organizar tu próxima compra
          </Typography>
          {isEditor && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setFormDialog({ open: true, budget: null })}
            >
              Crear presupuesto
            </Button>
          )}
        </Box>
      ) : (
        <Box>
          {/* Active budgets */}
          {active.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.disabled" sx={{ mb: 1.5, display: 'block', px: 0.5 }}>
                Activos
              </Typography>
              <Grid container spacing={2}>
                {active.map((b) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={b.id}>
                    <BudgetCard
                      budget={b}
                      isEditor={isEditor}
                      spentAmount={spentByBudgetId[b.id] || 0}
                      onOpen={() => navigate(`/budgets/${b.id}`)}
                      onEdit={() => setFormDialog({ open: true, budget: b })}
                      onDelete={() => setDeleteConfirm(b)}
                      onActivate={() => handleActivate(b)}
                      onDuplicate={() => handleDuplicate(b)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Other budgets */}
          {rest.length > 0 && (
            <Box>
              {active.length > 0 && (
                <Typography variant="overline" color="text.disabled" sx={{ mb: 1.5, display: 'block', px: 0.5 }}>
                  Otros
                </Typography>
              )}
              <Grid container spacing={2}>
                {rest.map((b) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={b.id}>
                    <BudgetCard
                      budget={b}
                      isEditor={isEditor}
                      spentAmount={spentByBudgetId[b.id] || 0}
                      onOpen={() => navigate(`/budgets/${b.id}`)}
                      onEdit={() => setFormDialog({ open: true, budget: b })}
                      onDelete={() => setDeleteConfirm(b)}
                      onActivate={() => handleActivate(b)}
                      onDuplicate={() => handleDuplicate(b)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      )}

      <BudgetForm
        open={formDialog.open}
        budget={formDialog.budget}
        workspaceId={currentWorkspace?.id}
        userId={user?.id}
        onClose={() => setFormDialog({ open: false, budget: null })}
      />

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Eliminar presupuesto</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
