import { useEffect, useState } from 'react'
import {
  Box, Typography, Card, Avatar, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Skeleton, Divider, Tooltip,
} from '@mui/material'
import {
  Receipt, Delete, Visibility, CalendarToday, Person, Store, FileDownloadOutlined,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { usePurchaseStore } from '../store/purchaseStore'
import { useAppStore } from '@/store/appStore'

function exportPurchasesCSV(purchases) {
  const header = ['Fecha', 'Nombre', 'Tienda', 'Total (S/)', 'Presupuesto', 'Ejecutado por']
  const rows = purchases.map((p) => [
    p.date || '',
    p.name || '',
    p.store || '',
    (p.total_amount || 0).toFixed(2),
    p.budgets?.name || '',
    p.profiles?.full_name || '',
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `compras_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function groupByMonth(purchases) {
  const groups = {}
  purchases.forEach((p) => {
    const key = p.date
      ? new Date(p.date).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      : 'Sin fecha'
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })
  return groups
}

function PurchaseRow({ purchase, isOwner, onView, onDelete }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 1.75,
        cursor: 'pointer',
        transition: 'background 0.1s',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={onView}
    >
      <Avatar
        sx={{
          width: 38,
          height: 38,
          bgcolor: 'rgba(99,102,241,0.12)',
          color: 'primary.main',
          flexShrink: 0,
        }}
      >
        <Receipt sx={{ fontSize: 18 }} />
      </Avatar>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {purchase.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 0.4, flexWrap: 'wrap' }}>
          {purchase.store && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <Store sx={{ fontSize: 12, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">{purchase.store}</Typography>
            </Box>
          )}
          {purchase.date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <CalendarToday sx={{ fontSize: 12, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {new Date(purchase.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <Person sx={{ fontSize: 12, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              {purchase.profiles?.full_name || '—'}
            </Typography>
          </Box>
          {purchase.budgets && (
            <Chip
              size="small"
              label={purchase.budgets.name}
              sx={{
                height: 18,
                fontSize: '0.625rem',
                bgcolor: 'rgba(99,102,241,0.1)',
                color: 'primary.main',
                fontWeight: 600,
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        {purchase.total_amount > 0 ? (
          <Typography variant="subtitle2" fontWeight={800} color="primary.main">
            S/{purchase.total_amount.toFixed(2)}
          </Typography>
        ) : (
          <Typography variant="caption" color="warning.main" fontWeight={600}>
            Ver detalle
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" onClick={onView}>
          <Visibility sx={{ fontSize: 17 }} />
        </IconButton>
        {isOwner && (
          <IconButton size="small" color="error" onClick={onDelete}>
            <Delete sx={{ fontSize: 17 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}

export default function PurchasesPage() {
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspaceStore()
  const { purchases, loading, fetchPurchases, deletePurchase } = usePurchaseStore()
  const { refreshSignal } = useAppStore()
  const { enqueueSnackbar } = useSnackbar()
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (currentWorkspace) fetchPurchases(currentWorkspace.id)
  }, [currentWorkspace?.id, refreshSignal])

  const handleDelete = async () => {
    const { error } = await deletePurchase(deleteConfirm.id)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Compra eliminada', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const isOwner = currentWorkspace?.my_role === 'owner'
  const groups  = groupByMonth(purchases)
  const totalSpent = purchases.reduce((a, p) => a + (p.total_amount || 0), 0)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            Historial de compras
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {purchases.length} compra{purchases.length !== 1 ? 's' : ''}
            {purchases.length > 0 && (
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600, ml: 1 }}>
                · S/{totalSpent.toFixed(2)} en total
              </Box>
            )}
          </Typography>
        </Box>
        {purchases.length > 0 && (
          <Tooltip title="Exportar historial como CSV">
            <IconButton onClick={() => exportPurchasesCSV(purchases)} size="small">
              <FileDownloadOutlined />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={72} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : purchases.length === 0 ? (
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
            Sin compras registradas
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Las compras realizadas en modo shopping aparecerán aquí
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Object.entries(groups).map(([month, items]) => (
            <Box key={month}>
              {/* Month header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, textTransform: 'capitalize' }}
                >
                  {month}
                </Typography>
                <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'divider' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  S/{items.reduce((a, p) => a + (p.total_amount || 0), 0).toFixed(2)}
                </Typography>
              </Box>

              {/* Purchase cards */}
              <Card sx={{ overflow: 'hidden' }}>
                {items.map((p, i) => (
                  <Box key={p.id}>
                    <PurchaseRow
                      purchase={p}
                      isOwner={isOwner}
                      onView={() => navigate(`/purchases/${p.id}`)}
                      onDelete={() => setDeleteConfirm(p)}
                    />
                    {i < items.length - 1 && <Divider sx={{ mx: 2.5 }} />}
                  </Box>
                ))}
              </Card>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Eliminar compra</DialogTitle>
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
