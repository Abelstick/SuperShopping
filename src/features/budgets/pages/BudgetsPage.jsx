import { useState, useEffect } from 'react'
import {
  Box, Button, Card, Typography, Grid, Chip,
  IconButton, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Skeleton, Divider, LinearProgress,
} from '@mui/material'
import {
  Add, MoreVert, Edit, Delete, PlayArrow, Receipt,
  AttachMoney, CalendarToday, Store, ArrowForward, ContentCopy,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '../store/budgetStore'
import { useAppStore } from '@/store/appStore'
import BudgetForm from '../components/BudgetForm'

const STATUS_META = {
  draft:     { label: 'Borrador',   bg: 'rgba(161,161,170,0.12)',  color: '#71717a' },
  active:    { label: 'Activo',     bg: 'rgba(99,102,241,0.12)',   color: '#6366f1' },
  completed: { label: 'Completado', bg: 'rgba(16,185,129,0.12)',   color: '#10b981' },
  cancelled: { label: 'Cancelado',  bg: 'rgba(244,63,94,0.12)',    color: '#f43f5e' },
}

function BudgetCard({ budget, isEditor, onEdit, onDelete, onActivate, onDuplicate, onOpen }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const meta = STATUS_META[budget.status] || STATUS_META.draft

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
          <Box sx={{ flexGrow: 1, mr: 1 }}>
            <Chip
              size="small"
              label={meta.label}
              sx={{
                mb: 0.75,
                bgcolor: meta.bg,
                color: meta.color,
                fontWeight: 700,
                fontSize: '0.6875rem',
                height: 22,
                border: `1px solid ${meta.color}33`,
              }}
            />
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

        {/* Budget amount */}
        {budget.target_amount && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">Presupuesto</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em', color: meta.color }}>
                S/{budget.target_amount.toLocaleString('es-AR')}
              </Typography>
            </Box>
            <ArrowForward sx={{ fontSize: 18, color: 'text.disabled' }} />
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
  const { refreshSignal } = useAppStore()
  const { enqueueSnackbar } = useSnackbar()
  const [formDialog, setFormDialog] = useState({ open: false, budget: null })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (currentWorkspace) fetchBudgets(currentWorkspace.id)
  }, [currentWorkspace?.id, refreshSignal])

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
