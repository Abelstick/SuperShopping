import { useEffect, useRef, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, Typography, Checkbox, FormControlLabel, InputAdornment, CircularProgress,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { fmtMoney } from '@/shared/utils/format'

// Tamaños: 20 título · 15 texto · 13 meta
const FS = { title: 20, body: 15, meta: 13 }

// Validación al salir del campo (on blur) y de nuevo al guardar
const validators = {
  product_name: (v) => (String(v).trim() ? '' : 'Ingresa el nombre del producto.'),
  quantity: (v) => (Number(v) > 0 ? '' : 'La cantidad debe ser mayor a 0.'),
  unit_price: (v) => (v !== '' && v !== null && Number(v) < 0 ? 'El precio no puede ser negativo.' : ''),
}
const FIELD_ORDER = ['product_name', 'quantity', 'unit_price']

export default function EditPurchaseItemDialog({ open, item, onSave, onClose }) {
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ product_name: '', brand: '', quantity: 1, unit_price: '', unit: 'unidad' })
  const [multiplyQty, setMultiplyQty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const nameRef = useRef(null)
  const qtyRef = useRef(null)
  const priceRef = useRef(null)

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
      setFieldErrors({})
    }
  }, [open, item])

  const total = multiplyQty
    ? Number(form.quantity || 0) * Number(form.unit_price || 0)
    : Number(form.unit_price || 0)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const blur = (field) => () => setFieldErrors((errs) => ({ ...errs, [field]: validators[field](form[field]) }))

  const handleSave = async () => {
    const errs = Object.fromEntries(FIELD_ORDER.map((f) => [f, validators[f](form[f])]))
    setFieldErrors(errs)
    const firstInvalid = FIELD_ORDER.find((f) => errs[f])
    if (firstInvalid) {
      const refs = { product_name: nameRef, quantity: qtyRef, unit_price: priceRef }
      refs[firstInvalid].current?.focus()
      return
    }
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
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Typography component="span" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Editar producto</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth label="Producto" required value={form.product_name}
            onChange={set('product_name')} onBlur={blur('product_name')}
            error={Boolean(fieldErrors.product_name)} helperText={fieldErrors.product_name || ' '}
            inputRef={nameRef} autoFocus
          />
          <TextField fullWidth label="Marca (opcional)" value={form.brand} onChange={set('brand')} />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '5fr 7fr' }}>
            <TextField
              fullWidth type="number" label="Cant." value={form.quantity}
              onChange={set('quantity')} onBlur={blur('quantity')}
              error={Boolean(fieldErrors.quantity)} helperText={fieldErrors.quantity || ' '}
              inputRef={qtyRef}
              slotProps={{ htmlInput: { min: 0.01, step: 0.01, inputMode: 'decimal' } }}
            />
            <TextField
              fullWidth type="number" label="Precio" value={form.unit_price}
              onChange={set('unit_price')} onBlur={blur('unit_price')}
              error={Boolean(fieldErrors.unit_price)} helperText={fieldErrors.unit_price || ' '}
              inputRef={priceRef}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> }, htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
            />
          </Box>
          <FormControlLabel
            control={<Checkbox checked={multiplyQty} onChange={(e) => setMultiplyQty(e.target.checked)} />}
            label={<Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>Multiplicar por cantidad</Typography>}
            sx={{ m: 0 }}
          />
          {total > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: '8px' }}>
              <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>{multiplyQty ? 'Subtotal' : 'Total'}</Typography>
              <Typography sx={{ fontSize: FS.title, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(total)}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="inherit" sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ flexGrow: 1 }}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
