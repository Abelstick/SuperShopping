import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, Typography, Stack, Grid, Checkbox, FormControlLabel,
} from '@mui/material'
import { useSnackbar } from 'notistack'

export default function EditPurchaseItemDialog({ open, item, onSave, onClose }) {
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ product_name: '', brand: '', quantity: 1, unit_price: '', unit: 'unidad' })
  const [multiplyQty, setMultiplyQty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && item) {
      const guessMultiply = item.unit_price && item.total_price &&
        Math.abs(item.total_price - item.unit_price * item.quantity) < 0.01 &&
        item.quantity !== 1
      setMultiplyQty(Boolean(guessMultiply))
      setForm({
        product_name: item.product_name || '',
        brand: item.brand || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price ?? '',
        unit: item.unit || 'unidad',
      })
    }
  }, [open, item])

  const total = multiplyQty
    ? Number(form.quantity || 0) * Number(form.unit_price || 0)
    : Number(form.unit_price || 0)

  const handleSave = async () => {
    if (!form.product_name.trim()) return
    setSaving(true)
    const { error } = await onSave(item.id, {
      product_name: form.product_name.trim(),
      brand: form.brand.trim() || null,
      quantity: Number(form.quantity),
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      total_price: total || null,
      unit: form.unit,
    })
    setSaving(false)
    if (error) { enqueueSnackbar('Error al actualizar el producto', { variant: 'error' }); return }
    enqueueSnackbar('Producto actualizado', { variant: 'success' })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>Editar producto</Typography>
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
            <Grid size={{ xs: 5 }}>
              <TextField
                fullWidth type="number" label="Cant." value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              />
            </Grid>
            <Grid size={{ xs: 7 }}>
              <TextField
                fullWidth type="number" label="Precio"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                slotProps={{ input: { startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 14 }}>S/</Box> } }}
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={<Checkbox size="small" checked={multiplyQty} onChange={(e) => setMultiplyQty(e.target.checked)} />}
            label={<Typography variant="caption" color="text.secondary">Multiplicar por cantidad</Typography>}
            sx={{ m: 0 }}
          />
          {total > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">{multiplyQty ? 'Subtotal' : 'Total'}</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">S/{total.toFixed(2)}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.product_name.trim()} fullWidth>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
