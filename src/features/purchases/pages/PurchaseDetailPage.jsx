import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Card, IconButton, Skeleton, Typography } from '@mui/material'
import { ArrowBack, Store, CalendarToday, Edit, Delete, Inventory2Outlined } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { usePurchaseStore } from '../store/purchaseStore'
import AdjustTotalDialog from '../components/AdjustTotalDialog'
import EditPurchaseItemDialog from '../components/EditPurchaseItemDialog'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import { fmtMoney, fmtDate } from '@/shared/utils/format'
import { CategoryIcon, ConfirmDialog, PageHeader, Panel, RowDivider, StatusPill } from '@/shared/components/ui'
import { FS, NUM, reveal } from '@/theme/tokens'
import { canEditRole } from '@/features/workspace/constants'


// ── Page ──────────────────────────────────────────────────────────────────────
export default function PurchaseDetailPage() {
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
  const canEdit = canEditRole(currentWorkspace?.my_role)
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Skeleton variant="text" width={240} sx={{ fontSize: FS.page }} />
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '16px' }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '16px' }} />
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        {...reveal(0)}
        title={currentPurchase?.name}
        onBack={() => navigate('/purchases')}
        backLabel="Volver al historial de compras"
        subtitle={currentPurchase?.budgets && <StatusPill tone="brand">Presupuesto: {currentPurchase.budgets.name}</StatusPill>}
      />

      {loadError && <LoadErrorBanner message={loadError.message} onRetry={retry} />}

      <Box {...reveal(1)}>
        <Typography sx={{ fontSize: FS.meta, fontWeight: 600, color: 'text.secondary' }}>Total gastado</Typography>
        <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em' }}>{fmtMoney(total)}</Typography>
      </Box>

      <Box {...reveal(2)}>
        {/* En móvil, filas de etiqueta y valor: una fecha no cabe en tres columnas */}
        <Card sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' }, gap: '1px', bgcolor: 'divider', overflow: 'hidden' }}>
          {[
            { Icon: Inventory2Outlined, label: 'Productos', value: purchaseItems.length },
            { Icon: Store, label: 'Tienda', value: currentPurchase?.store || '—' },
            { Icon: CalendarToday, label: 'Fecha', value: currentPurchase?.date ? fmtDate(currentPurchase.date) : '—' },
          ].map(({ Icon, label, value }) => (
            <Box key={label} sx={{ bgcolor: 'background.paper', px: { xs: 2, sm: 2.5 }, py: { xs: 1, sm: 2 }, display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, alignItems: { xs: 'center', sm: 'flex-start' }, justifyContent: 'space-between', gap: { xs: 2, sm: 0.5 }, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', flexShrink: 0 }}>
                <Icon sx={{ fontSize: 17 }} />
                <Typography component="span" sx={{ fontSize: FS.meta, color: 'inherit' }}>{label}</Typography>
              </Box>
              <Typography sx={{ ...NUM, fontSize: { xs: FS.body, sm: 20 }, fontWeight: 700, lineHeight: 1.3, minWidth: 0 }} noWrap>{value}</Typography>
            </Box>
          ))}
        </Card>
      </Box>

      {/* Items list */}
      <Box {...reveal(3)}>
        <Panel title="Items comprados">
          {purchaseItems.length === 0 ? (
            <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>No hay items registrados en esta compra.</Typography>
            </Box>
          ) : (
            <>
              {purchaseItems.map((item, i) => {
                const meta = [
                  `${item.quantity} ${item.unit}`,
                  item.unit_price ? `${fmtMoney(item.unit_price)} c/u` : null,
                  item.categories?.name,
                  item.profiles?.full_name,
                ].filter(Boolean).join(' · ')
                return (
                  <Box key={item.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pl: { xs: 2, sm: 2.5 }, pr: { xs: 0.75, sm: 1.5 }, py: 1, minHeight: 64 }}>
                      <CategoryIcon category={item.categories} size={36} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.35 }} noWrap>
                          {item.product_name}
                          {item.brand && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}> ({item.brand})</Box>}
                        </Typography>
                        <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }}>{meta}</Typography>
                      </Box>
                      <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {fmtMoney(item.total_price || 0)}
                      </Typography>
                      {canEdit && (
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexShrink: 0 }}>
                          <IconButton aria-label={`Editar ${item.product_name}`} onClick={() => setEditItem(item)} sx={{ color: 'text.secondary' }}><Edit sx={{ fontSize: 20 }} /></IconButton>
                          <IconButton aria-label={`Eliminar ${item.product_name}`} onClick={() => setDeleteConfirm(item)} sx={{ color: 'text.secondary' }}><Delete sx={{ fontSize: 20 }} /></IconButton>
                        </Box>
                      )}
                    </Box>
                    {i < purchaseItems.length - 1 && <RowDivider />}
                  </Box>
                )
              })}

              {/* Cierre de ticket */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: { xs: 2, sm: 2.5 }, py: 2, flexWrap: 'wrap', borderTop: '1px dashed', borderColor: 'divider' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3 }}>TOTAL</Typography>
                  {Math.abs(total - itemsSubtotal) > 0.009 && (
                    <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>Suma de productos: {fmtMoney(itemsSubtotal)}</Typography>
                  )}
                </Box>
                <Typography sx={{ ...NUM, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{fmtMoney(total)}</Typography>
                {canEdit && (
                  <Button variant="outlined" startIcon={<Edit sx={{ fontSize: 20 }} />} onClick={() => setAdjustDialog(true)}>Ajustar total</Button>
                )}
              </Box>
            </>
          )}
        </Panel>
      </Box>

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

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar producto"
        confirmLabel="Eliminar"
        loading={deletingItem}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteItem}
      >
        <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
          ¿Eliminar <strong>"{deleteConfirm?.product_name}"</strong> de esta compra?
          El total guardado no se ajusta solo — usa "Ajustar total" si hace falta corregirlo.
        </Typography>
      </ConfirmDialog>
    </Box>
  )
}
