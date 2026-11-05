import { useEffect, useState } from 'react'
import { Box, Button, ButtonBase, Card, IconButton, Skeleton, Tooltip, Typography } from '@mui/material'
import { Receipt, Delete, FileDownloadOutlined, Warning } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { usePurchaseStore } from '../store/purchaseStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import { ConfirmDialog, PageHeader, RowDivider, StatusPill } from '@/shared/components/ui'
import { LOCALE, fmtMoney, fmtDate, parseDay } from '@/shared/utils/format'
import { FS, NUM, reveal } from '@/theme/tokens'

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
      ? parseDay(p.date).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
      : 'Sin fecha'
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })
  return groups
}

// ── Fila de compra: toda la fila abre el detalle ─────────────────────────────
function PurchaseRow({ purchase, isOwner, onView, onDelete }) {
  const meta = [purchase.store, purchase.date ? fmtDate(purchase.date) : null, purchase.profiles?.full_name || '—'].filter(Boolean).join(' · ')
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', pr: { xs: 0.5, sm: 1 } }}>
      <ButtonBase
        component="div"
        role="link"
        tabIndex={0}
        aria-label={`Abrir compra ${purchase.name}`}
        onClick={onView}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView() } }}
        sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1.5, pl: { xs: 2, sm: 2.5 }, pr: 1, py: 1, minHeight: 64, textAlign: 'left', '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.35 }} noWrap>{purchase.name}</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>{meta}</Typography>
        </Box>
        {purchase.budgets && (
          <StatusPill tone="brand" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>{purchase.budgets.name}</StatusPill>
        )}
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          {purchase.total_amount > 0 ? (
            <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{fmtMoney(purchase.total_amount)}</Typography>
          ) : (
            <StatusPill tone="warn" icon={Warning}>Ver detalle</StatusPill>
          )}
        </Box>
      </ButtonBase>
      {isOwner && (
        <Tooltip title="Eliminar">
          <IconButton aria-label={`Eliminar compra ${purchase.name}`} onClick={onDelete} sx={{ flexShrink: 0, color: 'text.secondary' }}>
            <Delete sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

export default function PurchasesPage() {
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspaceStore()
  const { purchases, loading, fetchPurchases, deletePurchase } = usePurchaseStore()
  const refreshSignal = useAppStore((s) => s.refreshSignal)
  const { enqueueSnackbar } = useSnackbar()
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)

  // Misma carga de siempre; ahora se recoge el `{ error }` que ya devuelve
  useEffect(() => {
    if (!currentWorkspace) return
    let cancelled = false
    fetchPurchases(currentWorkspace.id)
      .then((r) => { if (!cancelled) setLoadError(r?.error ? { message: r.error.message || 'Sin detalle del servidor' } : null) })
      .catch((e) => { if (!cancelled) setLoadError({ message: e?.message || 'Sin detalle del servidor' }) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, refreshSignal, retryTick])

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await deletePurchase(deleteConfirm.id)
    setDeleting(false)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Compra eliminada', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const isOwner = currentWorkspace?.my_role === 'owner'
  const groups = groupByMonth(purchases)
  const totalSpent = purchases.reduce((a, p) => a + (p.total_amount || 0), 0)
  const showSkeleton = loading && purchases.length === 0
  const failedWithoutData = Boolean(loadError) && purchases.length === 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 } }}>
      <PageHeader
        {...reveal(0)}
        title="Historial de compras"
        subtitle={`${purchases.length} compra${purchases.length !== 1 ? 's' : ''}`}
        actions={purchases.length > 0 && (
          <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={() => exportPurchasesCSV(purchases)}>
            Exportar historial como CSV
          </Button>
        )}
      />

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      {showSkeleton && <Skeleton variant="rectangular" height={84} sx={{ borderRadius: '16px' }} />}
      {purchases.length > 0 && (
        <Box {...reveal(1)}>
          <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em' }}>
            {fmtMoney(totalSpent)}
            <Box component="span" sx={{ fontSize: FS.body, fontWeight: 600, letterSpacing: 0, color: 'text.secondary', ml: 1 }}>en total</Box>
          </Typography>
        </Box>
      )}

      <Box {...reveal(2)}>
        {showSkeleton ? (
          <Card>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, minHeight: 64 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton variant="text" width="45%" sx={{ fontSize: FS.body }} />
                  <Skeleton variant="text" width="30%" sx={{ fontSize: FS.meta }} />
                </Box>
                <Skeleton variant="text" width={72} sx={{ fontSize: FS.body }} />
              </Box>
            ))}
          </Card>
        ) : failedWithoutData ? null : purchases.length === 0 ? (
          <EmptyState
            icon={<Receipt sx={{ fontSize: 28 }} />}
            title="Sin compras registradas"
            body="Las compras realizadas en modo shopping aparecerán aquí"
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 } }}>
            {Object.entries(groups).map(([month, items]) => (
              <Box component="section" key={month}>
                {/* Cabecera del mes: nombre + cantidad + total del mes */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1, px: 0.5 }}>
                  <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', '&::first-letter': { textTransform: 'uppercase' } }}>{month}</Typography>
                  <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>{items.length}</Typography>
                  <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, ml: 'auto' }}>
                    {fmtMoney(items.reduce((a, p) => a + (p.total_amount || 0), 0))}
                  </Typography>
                </Box>

                <Card sx={{ overflow: 'hidden' }}>
                  {items.map((p, i) => (
                    <Box key={p.id}>
                      <PurchaseRow
                        purchase={p}
                        isOwner={isOwner}
                        onView={() => navigate(`/purchases/${p.id}`)}
                        onDelete={() => setDeleteConfirm(p)}
                      />
                      {i < items.length - 1 && <RowDivider />}
                    </Box>
                  ))}
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar compra"
        icon={<Delete sx={{ fontSize: 22 }} />}
        confirmLabel="Eliminar"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      >
        <Typography sx={{ fontSize: FS.body }}>
          ¿Eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.
        </Typography>
      </ConfirmDialog>
    </Box>
  )
}
