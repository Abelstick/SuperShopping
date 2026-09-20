import { useEffect, useState } from 'react'
import {
  Box, Typography, Card, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Skeleton, Divider, CircularProgress, useTheme,
} from '@mui/material'
import {
  Receipt, Delete, Visibility, CalendarToday, Person, Store, FileDownloadOutlined, Warning,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { usePurchaseStore } from '../store/purchaseStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import { fmtMoney, fmtDate, parseDay } from '@/shared/utils/format'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos/KPIs · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const NUM = { fontVariantNumeric: 'tabular-nums' }
const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

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
      ? parseDay(p.date).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      : 'Sin fecha'
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })
  return groups
}

// ── Nivel 1: dato hero ───────────────────────────────────────────────────────
function TotalHero({ total }) {
  const st = useTheme().palette.stock.saludable
  return (
    <Card sx={{ bgcolor: st.tint, borderColor: st.line, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Receipt sx={{ fontSize: 32, color: st.icon }} />
      <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {fmtMoney(total)}
        <Box component="span" sx={{ fontSize: FS.title, fontWeight: 700, ml: 1 }}>en total</Box>
      </Typography>
    </Card>
  )
}

// ── Fila de compra ───────────────────────────────────────────────────────────
function PurchaseRow({ purchase, isOwner, onView, onDelete }) {
  const st = useTheme().palette.stock.riesgo
  const openOnKey = (e) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView() }
  }

  return (
    <Box
      role="link"
      tabIndex={0}
      aria-label={`Abrir compra ${purchase.name}`}
      onKeyDown={openOnKey}
      sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1, minHeight: 80, cursor: 'pointer', transition: 'background-color 140ms', '&:hover': { bgcolor: 'action.hover' } }}
      onClick={onView}
    >
      <Box sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Receipt sx={{ fontSize: 20 }} />
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{purchase.name}</Typography>
        <Box sx={{ display: 'flex', columnGap: 2, rowGap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {purchase.store && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Store sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{purchase.store}</Typography>
            </Box>
          )}
          {purchase.date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{fmtDate(purchase.date)}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{purchase.profiles?.full_name || '—'}</Typography>
          </Box>
          {purchase.budgets && (
            <Box sx={{ px: 1, py: 0.5, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main' }}>
              <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>{purchase.budgets.name}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        {purchase.total_amount > 0 ? (
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{fmtMoney(purchase.total_amount)}</Typography>
        ) : (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: '8px', bgcolor: st.tint, border: 1, borderColor: st.line, color: st.text }}>
            <Warning sx={{ fontSize: 16, color: st.icon }} />
            <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>Ver detalle</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <IconButton aria-label={`Ver compra ${purchase.name}`} onClick={onView}>
          <Visibility sx={{ fontSize: 20 }} />
        </IconButton>
        {isOwner && (
          <IconButton aria-label={`Eliminar compra ${purchase.name}`} onClick={onDelete}>
            <Delete sx={{ fontSize: 20 }} />
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header: título + acción secundaria (esta pantalla no tiene acción primaria) */}
      <Box {...reveal(0)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>Historial de compras</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>
            {purchases.length} compra{purchases.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        {purchases.length > 0 && (
          <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={() => exportPurchasesCSV(purchases)}>
            Exportar historial como CSV
          </Button>
        )}
      </Box>

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      {/* Nivel 1: dato hero */}
      {showSkeleton && <Skeleton variant="rectangular" height={112} sx={{ borderRadius: '12px' }} />}
      {purchases.length > 0 && <Box {...reveal(1)}><TotalHero total={totalSpent} /></Box>}

      {/* Contenido */}
      <Box {...reveal(2)}>
        {showSkeleton ? (
          <Card>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, minHeight: 80 }}>
                <Skeleton variant="rectangular" width={40} height={40} />
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(groups).map(([month, items]) => (
              <Box component="section" key={month}>
                {/* Cabecera del mes: nombre + cantidad + total del mes */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                  <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, '&::first-letter': { textTransform: 'uppercase' } }}>{month}</Typography>
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
                      {i < items.length - 1 && <Divider sx={{ mx: 3 }} />}
                    </Box>
                  ))}
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Dialog open={Boolean(deleteConfirm)} onClose={deleting ? undefined : () => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: 'error.main', borderRadius: '8px', color: 'error.contrastText', display: 'flex' }}>
              <Delete sx={{ fontSize: 24 }} />
            </Box>
            Eliminar compra
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body }}>
            ¿Eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
