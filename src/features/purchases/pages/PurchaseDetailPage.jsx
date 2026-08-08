import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, IconButton, List, ListItem,
  ListItemText, Chip, Grid, Skeleton, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
} from '@mui/material'
import { ArrowBack, Store, CalendarToday, Edit, Delete } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { usePurchaseStore } from '../store/purchaseStore'
import AdjustTotalDialog from '../components/AdjustTotalDialog'
import EditPurchaseItemDialog from '../components/EditPurchaseItemDialog'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PurchaseDetailPage() {
  const { purchaseId } = useParams()
  const navigate = useNavigate()
  const {
    currentPurchase, purchaseItems, loading,
    fetchPurchaseWithItems, updatePurchase, updatePurchaseItem, deletePurchaseItem,
  } = usePurchaseStore()
  const { enqueueSnackbar } = useSnackbar()
  const [adjustDialog, setAdjustDialog] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPurchaseWithItems(purchaseId) }, [purchaseId])

  const itemsSubtotal = purchaseItems.reduce((a, i) => a + (i.total_price || 0), 0)

  const handleAdjustTotal = async (total) => {
    setSaving(true)
    const { error } = await updatePurchase(purchaseId, { total_amount: total })
    setSaving(false)
    if (error) enqueueSnackbar('Error al ajustar el total', { variant: 'error' })
    else { enqueueSnackbar('Total actualizado', { variant: 'success' }); setAdjustDialog(false) }
  }

  const handleDeleteItem = async () => {
    const { error } = await deletePurchaseItem(deleteConfirm.id)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Producto eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  if (loading && !currentPurchase) return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/purchases')} size="small"><ArrowBack /></IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} noWrap>{currentPurchase?.name}</Typography>
          {currentPurchase?.budgets && (
            <Chip size="small" label={`Presupuesto: ${currentPurchase.budgets.name}`} sx={{ mt: 0.5 }} />
          )}
        </Box>
      </Box>

      {/* Stats cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" fontWeight={700} color="primary">
                S/{(currentPurchase?.total_amount || 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Total gastado</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" fontWeight={700}>{purchaseItems.length}</Typography>
              <Typography variant="caption" color="text.secondary">Productos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <Store fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600}>{currentPurchase?.store || '—'}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">Tienda</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600}>
                  {currentPurchase?.date
                    ? new Date(currentPurchase.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                    : '—'}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">Fecha</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Items list */}
      <Card>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
          <Typography variant="h6" fontWeight={700}>Items comprados</Typography>
        </Box>

        {purchaseItems.length === 0 ? (
          <Box sx={{ px: 2.5, pb: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">No hay items registrados en esta compra.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {purchaseItems.map((item, i) => (
              <Box key={item.id}>
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => setEditItem(item)}
                          sx={{ opacity: 0.45, '&:hover': { opacity: 1 } }}
                        >
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirm(item)}
                          sx={{ opacity: 0.45, '&:hover': { opacity: 1, color: 'error.main' } }}
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={600}>{item.product_name}</Typography>
                        {item.brand && (
                          <Typography variant="body2" color="text.secondary">({item.brand})</Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip size="small" label={`${item.quantity} ${item.unit}`} variant="outlined" sx={{ height: 20, fontSize: '0.6875rem' }} />
                        {item.unit_price && (
                          <Chip size="small" label={`S/${item.unit_price} c/u`} variant="outlined" sx={{ height: 20, fontSize: '0.6875rem' }} />
                        )}
                        {item.categories && (
                          <Chip size="small" label={item.categories.name} sx={{ height: 20, fontSize: '0.6875rem', bgcolor: item.categories.color + '20' }} />
                        )}
                        {item.profiles?.full_name && (
                          <Typography variant="caption" color="text.disabled">{item.profiles.full_name}</Typography>
                        )}
                      </Box>
                    }
                  />
                  <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                    S/{(item.total_price || 0).toFixed(2)}
                  </Typography>
                </ListItem>
                {i < purchaseItems.length - 1 && <Divider sx={{ mx: 2 }} />}
              </Box>
            ))}

            <Divider />
            <ListItem
              sx={{ py: 1.5 }}
              secondaryAction={
                <Tooltip title="Ajustar total">
                  <IconButton size="small" onClick={() => setAdjustDialog(true)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemText
                primary={<Typography fontWeight={700} variant="body1">TOTAL</Typography>}
                secondary={
                  Math.abs((currentPurchase?.total_amount || 0) - itemsSubtotal) > 0.009
                    ? `Suma de productos: S/${itemsSubtotal.toFixed(2)}`
                    : null
                }
              />
              <Typography variant="h6" fontWeight={800} color="primary">
                S/{(currentPurchase?.total_amount || 0).toFixed(2)}
              </Typography>
            </ListItem>
          </List>
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
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar producto</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Eliminar <strong>"{deleteConfirm?.product_name}"</strong> de esta compra?
            El total guardado no se ajusta solo — usá "Ajustar total" si hace falta corregirlo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteItem}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
