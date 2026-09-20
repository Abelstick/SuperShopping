import { useState, useEffect, useRef } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Typography, Alert, InputAdornment, IconButton, Divider, CircularProgress,
} from '@mui/material'
import { Inventory2, Close, QrCode2 } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useInventoryStore } from '../store/inventoryStore'
import { UNITS } from '@/shared/constants/units'

// Tamaños: 20 título · 15 texto · 13 meta
const FS = { title: 20, body: 15, meta: 13 }

function SectionLabel({ children }) {
  return (
    <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: 700, mb: 2 }}>
      {children}
    </Typography>
  )
}

// Validación de formato al salir del campo (on blur) y de nuevo al guardar
const validators = {
  name: (v) => (String(v).trim() ? '' : 'Ingresa el nombre del producto.'),
  current_quantity: (v) => (Number(v) < 0 ? 'La cantidad no puede ser negativa.' : ''),
  min_quantity: (v) => (Number(v) < 0 ? 'El mínimo no puede ser negativo.' : ''),
}
const FIELD_ORDER = ['name', 'current_quantity', 'min_quantity']

export default function ProductForm({ open, product, categories, workspaceId, userId, onClose }) {
  const { createProduct, updateProduct } = useInventoryStore()
  const { enqueueSnackbar } = useSnackbar()
  const isEdit = Boolean(product)

  const emptyForm = { name: '', description: '', category_id: '', unit: 'unidad', current_quantity: 0, min_quantity: 0, barcode: '' }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const nameRef = useRef(null)
  const currentRef = useRef(null)
  const minRef = useRef(null)

  useEffect(() => {
    if (open) {
      setError('')
      setFieldErrors({})
      setForm(product
        ? { name: product.name || '', description: product.description || '', category_id: product.category_id || '', unit: product.unit || 'unidad', current_quantity: product.current_quantity ?? 0, min_quantity: product.min_quantity ?? 0, barcode: product.barcode || '' }
        : emptyForm
      )
    }
  }, [open, product])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const blur = (field) => () => setFieldErrors((errs) => ({ ...errs, [field]: validators[field](form[field]) }))

  const handleSubmit = async () => {
    const errs = Object.fromEntries(FIELD_ORDER.map((f) => [f, validators[f](form[f])]))
    setFieldErrors(errs)
    const firstInvalid = FIELD_ORDER.find((f) => errs[f])
    if (firstInvalid) {
      if (firstInvalid === 'name') setError('El nombre del producto es requerido.')
      const refs = { name: nameRef, current_quantity: currentRef, min_quantity: minRef }
      refs[firstInvalid].current?.focus()
      return
    }
    setSaving(true)
    setError('')
    const payload = { ...form, category_id: form.category_id || null }
    const { error: err } = isEdit
      ? await updateProduct(product.id, payload, workspaceId, userId)
      : await createProduct(workspaceId, payload, userId)
    setSaving(false)
    if (err) { setError(err.message || 'Error al guardar el producto.'); return }
    enqueueSnackbar(isEdit ? 'Producto actualizado' : 'Producto creado', { variant: 'success' })
    onClose()
  }

  const submitLabel = isEdit ? 'Guardar cambios' : 'Crear producto'
  const selectedCategory = categories.find((c) => c.id === form.category_id)
  const unitAdornment = form.unit && (
    <InputAdornment position="end"><Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{form.unit}</Typography></InputAdornment>
  )

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, bgcolor: 'action.selected', borderRadius: '8px', color: 'primary.main', display: 'flex', flexShrink: 0 }}>
            <Inventory2 sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography component="span" sx={{ display: 'block', fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>
              {isEdit ? 'Editar producto' : 'Nuevo producto'}
            </Typography>
            <Typography component="span" sx={{ display: 'block', fontSize: FS.meta, fontWeight: 400, color: 'text.secondary' }}>
              {isEdit ? 'Modifica los datos del producto' : 'Completa la información del nuevo producto'}
            </Typography>
          </Box>
          <IconButton aria-label="Cerrar" onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {error && <Alert severity="warning" onClose={() => setError('')} sx={{ mb: 3 }}>{error}</Alert>}

        {/* Información básica */}
        <SectionLabel>Información básica</SectionLabel>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Nombre del producto"
            required
            value={form.name}
            onChange={set('name')}
            onBlur={blur('name')}
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name || ' '}
            inputRef={nameRef}
            placeholder="Ej: Leche entera, Jabón de manos…"
            autoFocus
          />
          <TextField
            fullWidth
            label="Descripción"
            value={form.description}
            onChange={set('description')}
            multiline
            rows={2}
            placeholder="Marca, presentación u otras notas (opcional)"
          />
        </Box>

        {/* Clasificación */}
        <Box sx={{ mt: 4 }}>
          <SectionLabel>Clasificación</SectionLabel>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '7fr 5fr' } }}>
            <FormControl fullWidth>
              <InputLabel id="pf-cat" shrink>Categoría</InputLabel>
              <Select
                labelId="pf-cat"
                value={form.category_id}
                label="Categoría"
                displayEmpty
                notched
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                renderValue={(val) => {
                  if (!val) return <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Sin categoría</Typography>
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: selectedCategory?.color }} />
                      {selectedCategory?.name}
                    </Box>
                  )
                }}
              >
                <MenuItem value=""><Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Sin categoría</Typography></MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontSize: FS.body, fontWeight: 500 }}>{c.name}</Typography>
                        {c.aisle && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Pasillo {c.aisle}</Typography>}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="pf-unit">Unidad de medida</InputLabel>
              <Select labelId="pf-unit" value={form.unit} label="Unidad de medida" onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Stock */}
        <Box sx={{ mt: 4 }}>
          <SectionLabel>Control de stock</SectionLabel>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              fullWidth
              type="number"
              label="Cantidad actual"
              value={form.current_quantity}
              onChange={set('current_quantity')}
              onBlur={blur('current_quantity')}
              error={Boolean(fieldErrors.current_quantity)}
              inputRef={currentRef}
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' }, input: { endAdornment: unitAdornment } }}
              helperText={fieldErrors.current_quantity || 'Stock disponible ahora'}
            />
            <TextField
              fullWidth
              type="number"
              label="Mínimo requerido"
              value={form.min_quantity}
              onChange={set('min_quantity')}
              onBlur={blur('min_quantity')}
              error={Boolean(fieldErrors.min_quantity)}
              inputRef={minRef}
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' }, input: { endAdornment: unitAdornment } }}
              helperText={fieldErrors.min_quantity || 'Alerta cuando baje de este valor'}
            />
          </Box>
        </Box>

        {/* Código de barras */}
        <Box sx={{ mt: 4 }}>
          <SectionLabel>Opcional</SectionLabel>
          <TextField
            fullWidth
            label="Código de barras"
            value={form.barcode}
            onChange={set('barcode')}
            placeholder="Ingresa el código de barras del producto (opcional)"
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><QrCode2 sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment> } }}
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ minWidth: 144 }}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
