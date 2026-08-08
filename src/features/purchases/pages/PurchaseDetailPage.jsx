import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, IconButton, List, ListItem,
  ListItemText, Chip, Grid, Skeleton, Divider, Avatar,
} from '@mui/material'
import { ArrowBack, Receipt, Person, Store, CalendarToday, Edit } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { usePurchaseStore } from '../store/purchaseStore'
import AdjustTotalDialog from '../components/AdjustTotalDialog'
import EditPurchaseItemDialog from '../components/EditPurchaseItemDialog'

export default function PurchaseDetailPage() {
  const { purchaseId } = useParams()
  const navigate = useNavigate()
  const { currentPurchase, purchaseItems, loading, fetchPurchaseWithItems, updatePurchase, updatePurchaseItem } = usePurchaseStore()
  const { enqueueSnackbar } = useSnackbar()
  const [adjustDialog, setAdjustDialog] = useState(false)
  const [editItem, setEditItem] = useState(null)
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

  if (loading && !currentPurchase) return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/purchases')}><ArrowBack /></IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>{currentPurchase?.name}</Typography>
          {currentPurchase?.budgets && <Chip size="small" label={`Presupuesto: ${currentPurchase.budgets.name}`} />}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h5" fontWeight={700} color="primary">S/{(currentPurchase?.total_amount || 0).toFixed(2)}</Typography>
            <Typography variant="caption">Total gastado</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h5" fontWeight={700}>{purchaseItems.length}</Typography>
            <Typography variant="caption">Productos</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Store fontSize="small" />
              <Typography variant="body2" fontWeight={600}>{currentPurchase?.store || '—'}</Typography>
            </Box>
            <Typography variant="caption">Tienda</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <CalendarToday fontSize="small" />
              <Typography variant="body2" fontWeight={600}>{currentPurchase?.date ? new Date(currentPurchase.date).toLocaleDateString() : '—'}</Typography>
            </Box>
            <Typography variant="caption">Fecha</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Items comprados</Typography>
          {purchaseItems.length === 0 ? (
            <Typography color="text.secondary">No hay items.</Typography>
          ) : (
            <List disablePadding>
              {purchaseItems.map((item, i) => (
                <Box key={item.id}>
                  <ListItem>
                    <ListItemText
                      primary={<Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{item.product_name}</Typography>
                        {item.brand && <Typography variant="body2" color="text.secondary">({item.brand})</Typography>}
                      </Box>}
                      secondary={<Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip size="small" label={`${item.quantity} ${item.unit}`} variant="outlined" />
                        {item.unit_price && <Chip size="small" label={`S/${item.unit_price} c/u`} variant="outlined" />}
                        {item.categories && <Chip size="small" label={item.categories.name} sx={{ bgcolor: item.categories.color + '20' }} />}
                        <Typography variant="caption">{item.profiles?.full_name}</Typography>
                      </Box>}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, flexShrink: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ whiteSpace: 'nowrap' }}>
                        S/{(item.total_price || 0).toFixed(2)}
                      </Typography>
                      <IconButton size="small" onClick={() => setEditItem(item)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                  {i < purchaseItems.length - 1 && <Divider />}
                </Box>
              ))}
              <Divider />
              <ListItem
                secondaryAction={
                  <IconButton size="small" onClick={() => setAdjustDialog(true)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                    <Edit fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={<Typography fontWeight={700}>TOTAL</Typography>}
                  secondary={
                    Math.abs((currentPurchase?.total_amount || 0) - itemsSubtotal) > 0.009
                      ? `Suma de productos: S/${itemsSubtotal.toFixed(2)}`
                      : null
                  }
                />
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mr: 1 }}>
                  S/{(currentPurchase?.total_amount || 0).toFixed(2)}
                </Typography>
              </ListItem>
            </List>
          )}
        </CardContent>
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
    </Box>
  )
}
