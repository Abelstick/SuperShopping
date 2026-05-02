import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, IconButton, List, ListItem,
  ListItemText, Chip, Grid, Skeleton, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Tooltip,
} from '@mui/material'
import { ArrowBack, Store, CalendarToday, Edit, Delete, Sync } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { usePurchaseStore } from '../store/purchaseStore'

// ── Edit item dialog ──────────────────────────────────────────────────────────
function EditItemDialog({ open, item, onClose, onSave }) {
  const [form, setForm] = useState({ product_name: '', brand: '', quantity: 1, unit_price: '', total_price: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && item) {
      setForm({
        product_name: item.product_name || '',
        brand: item.brand || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price ?? '',
        total_price: item.total_price ?? '',
      })
    }
  }, [open, item])

  const handleSave = async () => {
    if (!form.product_name.trim()) return
    setSaving(true)
    await onSave(item.id, {
      product_name: form.product_name.trim(),
      brand: form.brand.trim() || null,
      quantity: Number(form.quantity),
      unit_price: form.unit_price !== '' ? Number(form.unit_price) : null,
      total_price: form.total_price !== '' ? Number(form.total_price) : null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>Editar producto</Typography>
        <Typography variant="caption" color="text.secondary">Editá nombre, precio o cantidad del item registrado</Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            fullWidth label="Producto *" value={form.product_name}
            onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
            autoFocus
          />
          <TextField
            fullWidth label="Marca (opcional)" value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
          />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth type="number" label="Cant."
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth type="number" label="P. unit."
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                slotProps={{ input: { startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 13 }}>S/</Box> } }}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth type="number" label="Total"
                value={form.total_price}
                onChange={(e) => setForm((f) => ({ ...f, total_price: e.target.value }))}
                slotProps={{ input: { startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 13 }}>S/</Box> } }}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained" fullWidth
          onClick={handleSave}
          disabled={saving || !form.product_name.trim()}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PurchaseDetailPage() {
  const { purchaseId } = useParams()
  const navigate = useNavigate()
  const {
    currentPurchase, purchaseItems, loading,
    fetchPurchaseWithItems, updatePurchase, updatePurchaseItem, deletePurchaseItem,
  } = usePurchaseStore()
  const { enqueueSnackbar } = useSnackbar()
  const [editItem, setEditItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => { fetchPurchaseWithItems(purchaseId) }, [purchaseId])

  // Always show the real sum from items — never trust stored total_amount alone
  const calculatedTotal = purchaseItems.reduce((acc, i) => acc + (i.total_price || 0), 0)
  const storedTotal = currentPurchase?.total_amount || 0
  const totalMismatch = Math.abs(calculatedTotal - storedTotal) > 0.01

  const handleSaveItem = async (id, updates) => {
    const { error } = await updatePurchaseItem(id, updates)
    if (error) enqueueSnackbar('Error al actualizar', { variant: 'error' })
    else enqueueSnackbar('Producto actualizado', { variant: 'success' })
  }

  const handleDeleteItem = async () => {
    const { error } = await deletePurchaseItem(deleteConfirm.id)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Producto eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    const newTotal = purchaseItems.reduce((acc, i) => acc + (i.total_price || 0), 0)
    const { error } = await updatePurchase(purchaseId, { total_amount: newTotal })
    setRecalculating(false)
    if (error) enqueueSnackbar('Error al recalcular', { variant: 'error' })
    else enqueueSnackbar(`Total actualizado: S/${newTotal.toFixed(2)}`, { variant: 'success' })
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
                S/{calculatedTotal.toFixed(2)}
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
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>Items comprados</Typography>
          {totalMismatch && (
            <Tooltip title="El total guardado no coincide con la suma de los items. Hacé clic para sincronizarlo.">
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<Sync sx={{ fontSize: 15 }} />}
                onClick={handleRecalculate}
                disabled={recalculating}
                sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              >
                {recalculating ? 'Recalculando…' : 'Recalcular total'}
              </Button>
            </Tooltip>
          )}
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
            <ListItem sx={{ py: 1.5 }}>
              <ListItemText primary={<Typography fontWeight={700} variant="body1">TOTAL</Typography>} />
              <Typography variant="h6" fontWeight={800} color="primary">
                S/{calculatedTotal.toFixed(2)}
              </Typography>
            </ListItem>
          </List>
        )}
      </Card>

      {/* Edit item dialog */}
      <EditItemDialog
        open={Boolean(editItem)}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={handleSaveItem}
      />

      {/* Delete item confirm */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar producto</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Eliminar <strong>"{deleteConfirm?.product_name}"</strong> de esta compra?
            El total se actualizará al recalcular.
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
