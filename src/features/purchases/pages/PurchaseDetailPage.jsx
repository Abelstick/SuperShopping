import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, IconButton, Skeleton, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, useTheme,
} from '@mui/material'
import { ArrowBack, Store, CalendarToday, Edit, Delete, Receipt, Inventory2 } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { usePurchaseStore } from '../store/purchaseStore'
import AdjustTotalDialog from '../components/AdjustTotalDialog'
import EditPurchaseItemDialog from '../components/EditPurchaseItemDialog'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import { fmtMoney, fmtDate } from '@/shared/utils/format'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos/KPIs · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const NUM = { fontVariantNumeric: 'tabular-nums' }
const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

function KpiCard({ icon, label, value }) {
  return (
    <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        {icon}
        <Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>{label}</Typography>
      </Box>
      <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }} noWrap>{value}</Typography>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PurchaseDetailPage() {
  const theme = useTheme()
  const st = theme.palette.stock.saludable
  const { purchaseId } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspaceStore()
  const {
    currentPurchase, purchaseItems, loading,
    fetchPurchaseWithItems, updatePurchase, updatePurchaseItem, deletePurchaseItem,
  } = usePurchaseStore()
  const { enqueueSnackbar } = useSnackbar()
  const [adjustDialog, setAdjustDialog] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deletingItem, setDeletingItem] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)

  // Misma carga de siempre; ahora se recoge el `{ error }` que ya devuelve
  useEffect(() => {
    let cancelled = false
    fetchPurchaseWithItems(purchaseId)
      .then((r) => { if (!cancelled) setLoadError(r?.error ? { message: r.error.message || 'Sin detalle del servidor' } : null) })
      .catch((e) => { if (!cancelled) setLoadError({ message: e?.message || 'Sin detalle del servidor' }) })
    return () => { cancelled = true }
  }, [purchaseId, retryTick])

  // Editar y ajustar: owner y editor. Eliminar compras completas sigue siendo del owner (en la lista).
  const canEdit = ['owner', 'editor'].includes(currentWorkspace?.my_role)
  const itemsSubtotal = purchaseItems.reduce((a, i) => a + (i.total_price || 0), 0)
  const total = currentPurchase?.total_amount || 0

  const handleAdjustTotal = async (value) => {
    setSaving(true)
    const { error } = await updatePurchase(purchaseId, { total_amount: value })
    setSaving(false)
    if (error) enqueueSnackbar('Error al ajustar el total', { variant: 'error' })
    else { enqueueSnackbar('Total actualizado', { variant: 'success' }); setAdjustDialog(false) }
  }

  const handleDeleteItem = async () => {
    setDeletingItem(true)
    const { error } = await deletePurchaseItem(deleteConfirm.id)
    setDeletingItem(false)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Producto eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  // Solo se muestra la compra que corresponde a la URL (no la anterior mientras carga)
  const purchaseReady = currentPurchase?.id === purchaseId
  const retry = () => { setLoadError(null); setRetryTick((t) => t + 1) }

  if (!purchaseReady && (loading || !loadError)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="text" width={240} sx={{ fontSize: FS.title }} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '12px' }} />
      </Box>
    )
  }

  if (!purchaseReady) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box><Button startIcon={<ArrowBack />} onClick={() => navigate('/purchases')} sx={{ color: 'text.secondary' }}>Historial de compras</Button></Box>
        <LoadErrorBanner message={loadError?.message || 'Sin detalle del servidor'} onRetry={retry} />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box {...reveal(0)} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <IconButton aria-label="Volver al historial de compras" onClick={() => navigate('/purchases')} sx={{ flexShrink: 0 }}><ArrowBack fontSize="small" /></IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }} noWrap>{currentPurchase?.name}</Typography>
          {currentPurchase?.budgets && (
            <Box sx={{ display: 'inline-block', mt: 0.5, px: 1, py: 0.5, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main' }}>
              <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>Presupuesto: {currentPurchase.budgets.name}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {loadError && <LoadErrorBanner message={loadError.message} onRetry={retry} />}

      {/* Nivel 1 y 2: hero + KPIs */}
      <Box {...reveal(1)} sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' } }}>
        <Card sx={{ bgcolor: st.tint, borderColor: st.line, p: 3, display: 'flex', flexDirection: 'column', gap: 1, justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt sx={{ fontSize: 24, color: st.icon }} />
            <Typography component="h2" sx={{ fontSize: FS.body, fontWeight: 700 }}>Total gastado</Typography>
          </Box>
          <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {fmtMoney(total)}
          </Typography>
        </Card>
        <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' } }}>
          <KpiCard icon={<Inventory2 sx={{ fontSize: 20 }} />} label="Productos" value={purchaseItems.length} />
          <KpiCard icon={<Store sx={{ fontSize: 20 }} />} label="Tienda" value={currentPurchase?.store || '—'} />
          <KpiCard icon={<CalendarToday sx={{ fontSize: 20 }} />} label="Fecha" value={currentPurchase?.date ? fmtDate(currentPurchase.date) : '—'} />
        </Box>
      </Box>

      {/* Items list */}
      <Card {...reveal(2)} sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Items comprados</Typography>
        </Box>

        {purchaseItems.length === 0 ? (
          <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>No hay items registrados en esta compra.</Typography>
          </Box>
        ) : (
          <>
            {purchaseItems.map((item, i) => (
              <Box key={item.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1, minHeight: 80 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>{item.product_name}</Typography>
                      {item.brand && <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>({item.brand})</Typography>}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Box sx={{ ...NUM, px: 1, py: 0.5, borderRadius: '8px', border: 1, borderColor: 'divider', fontSize: FS.meta, fontWeight: 600, lineHeight: 1.4 }}>
                        {item.quantity} {item.unit}
                      </Box>
                      {item.unit_price && (
                        <Box sx={{ ...NUM, px: 1, py: 0.5, borderRadius: '8px', border: 1, borderColor: 'divider', fontSize: FS.meta, fontWeight: 600, lineHeight: 1.4 }}>
                          {fmtMoney(item.unit_price)} c/u
                        </Box>
                      )}
                      {item.categories && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.categories.color }} />
                          <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 600, lineHeight: 1.4 }}>{item.categories.name}</Typography>
                        </Box>
                      )}
                      {item.profiles?.full_name && (
                        <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{item.profiles.full_name}</Typography>
                      )}
                    </Box>
                  </Box>
                  {/* Importe y acciones: en móvil se apilan para dejar ancho a las etiquetas */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-end', sm: 'center' }, gap: { xs: 0.5, sm: 2 }, flexShrink: 0 }}>
                    <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {fmtMoney(item.total_price || 0)}
                    </Typography>
                    {canEdit && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton aria-label={`Editar ${item.product_name}`} onClick={() => setEditItem(item)}><Edit sx={{ fontSize: 20 }} /></IconButton>
                        <IconButton aria-label={`Eliminar ${item.product_name}`} onClick={() => setDeleteConfirm(item)}><Delete sx={{ fontSize: 20 }} /></IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
                {i < purchaseItems.length - 1 && <Divider sx={{ mx: 3 }} />}
              </Box>
            ))}

            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2, flexWrap: 'wrap', bgcolor: 'action.hover' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3 }}>TOTAL</Typography>
                {Math.abs(total - itemsSubtotal) > 0.009 && (
                  <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>Suma de productos: {fmtMoney(itemsSubtotal)}</Typography>
                )}
              </Box>
              <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 800 }}>{fmtMoney(total)}</Typography>
              {canEdit && (
                <Button variant="outlined" startIcon={<Edit sx={{ fontSize: 20 }} />} onClick={() => setAdjustDialog(true)}>Ajustar total</Button>
              )}
            </Box>
          </>
        )}
      </Card>

      <AdjustTotalDialog
        open={adjustDialog}
        itemsSubtotal={itemsSubtotal}
        initialTotal={currentPurchase?.total_amount}
        saving={saving}
        title="Ajustar total"
        confirmLabel="Guardar"
        onConfirm={handleAdjustTotal}
        onClose={() => setAdjustDialog(false)}
      />

      <EditPurchaseItemDialog
        open={Boolean(editItem)}
        item={editItem}
        onSave={updatePurchaseItem}
        onClose={() => setEditItem(null)}
      />

      {/* Delete item confirm */}
      <Dialog open={Boolean(deleteConfirm)} onClose={deletingItem ? undefined : () => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar producto</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
            ¿Eliminar <strong>"{deleteConfirm?.product_name}"</strong> de esta compra?
            El total guardado no se ajusta solo — usá "Ajustar total" si hace falta corregirlo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} disabled={deletingItem}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteItem} disabled={deletingItem}
            startIcon={deletingItem ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
