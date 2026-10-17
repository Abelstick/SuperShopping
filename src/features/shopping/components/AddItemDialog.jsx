import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Checkbox, FormControlLabel, Switch, Autocomplete,
  FormControl, InputLabel, MenuItem, Select, InputAdornment, CircularProgress, Collapse, useTheme,
} from '@mui/material'
import { TrendingUp, TrendingDown, ExpandMore, ExpandLess } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useShoppingStore } from '../store/shoppingStore'
import { UNITS } from '@/shared/constants/units'
import { fmtMoney } from '@/shared/utils/format'

// Tamaños: 20 título · 15 texto · 13 meta
const FS = { title: 20, body: 15, meta: 13 }
const NUM = { fontVariantNumeric: 'tabular-nums' }

// Validación al salir del campo (on blur) y de nuevo al guardar
const validators = {
  product_name: (v) => (String(v).trim() ? '' : 'Ingresa el nombre del producto.'),
  quantity: (v) => (Number(v) > 0 ? '' : 'La cantidad debe ser mayor a 0.'),
  unit_price: (v) => (v !== '' && v !== null && Number(v) < 0 ? 'El precio no puede ser negativo.' : ''),
}
const FIELD_ORDER = ['product_name', 'quantity', 'unit_price']
const NAME_ID = 'shopping-item-name'

export default function AddItemDialog({ open, budgetItem, initialName, initialProduct, sessionId, purchaseId, userId, workspaceId, products, categories, onClose }) {
  const theme = useTheme()
  const st = theme.palette.stock
  const { addPurchaseItem, unlockItem } = useShoppingStore()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({
    product_name: '', product_id: '', brand: '', quantity: 1, unit_price: '', unit: 'unidad', category_id: '', is_household: true,
  })
  const [saving, setSaving] = useState(false)
  const [multiplyQty, setMultiplyQty] = useState(false)
  const [priceHint, setPriceHint] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [moreOpen, setMoreOpen] = useState(false)
  const nameIdRef = useRef(NAME_ID)
  const qtyRef = useRef(null)
  const priceRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm({
        product_name: budgetItem?.product_name ?? initialProduct?.name ?? initialName ?? '',
        product_id: budgetItem?.product_id ?? initialProduct?.id ?? '',
        brand: '',
        quantity: budgetItem?.quantity ?? 1,
        unit_price: budgetItem?.estimated_price ?? '',
        unit: budgetItem?.unit ?? initialProduct?.unit ?? 'unidad',
        category_id: budgetItem?.category_id ?? initialProduct?.category_id ?? '',
        is_household: true,
      })
      setMultiplyQty(false)
      setPriceHint(null)
      setFieldErrors({})
      setMoreOpen(false)
    }
  }, [open, budgetItem, initialName, initialProduct])

  // Fetch historical prices for this product, whether it came from the budget
  // item or was just picked from the inventory autocomplete below.
  useEffect(() => {
    if (!open || !form.product_id) { setPriceHint(null); return }
    supabase
      .from('purchase_items')
      .select('unit_price, unit, quantity')
      .eq('product_id', form.product_id)
      .not('unit_price', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!data || data.length === 0) { setPriceHint(null); return }
        const prices = data.map((d) => Number(d.unit_price))
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length
        // Most recent purchase's own quantity/unit/price — the average above
        // can blend older records bought in a different unit, but this is
        // exactly what was bought and paid last time.
        setPriceHint({
          avg, count: prices.length, min: Math.min(...prices), max: Math.max(...prices),
          unit: data[0].unit, lastQuantity: data[0].quantity, lastPrice: Number(data[0].unit_price),
        })
      })
  }, [open, form.product_id])

  const total = multiplyQty
    ? Number(form.quantity || 0) * Number(form.unit_price || 0)
    : Number(form.unit_price || 0)

  const priceDiff = priceHint && form.unit_price
    ? ((Number(form.unit_price) - priceHint.avg) / priceHint.avg) * 100
    : null

  const linkedCategory = categories.find((c) => c.id === form.category_id)

  const handleProductPick = (value) => {
    if (value && typeof value === 'object') {
      setForm((f) => ({ ...f, product_name: value.name, product_id: value.id, unit: value.unit, category_id: value.category_id || '' }))
    } else {
      setForm((f) => ({ ...f, product_name: value || '', product_id: '' }))
    }
  }

  const blur = (field) => () => setFieldErrors((errs) => ({ ...errs, [field]: validators[field](form[field]) }))

  const focusField = (field) => {
    if (field === 'product_name') document.getElementById(nameIdRef.current)?.focus()
    else if (field === 'quantity') qtyRef.current?.focus()
    else priceRef.current?.focus()
  }

  const handleSave = async () => {
    const errs = Object.fromEntries(FIELD_ORDER.map((f) => [f, validators[f](form[f])]))
    setFieldErrors(errs)
    const firstInvalid = FIELD_ORDER.find((f) => errs[f])
    if (firstInvalid) { focusField(firstInvalid); return }
    setSaving(true)
    const { error } = await addPurchaseItem(
      sessionId, purchaseId,
      {
        product_name: form.product_name.trim(),
        brand: form.brand.trim() || null,
        quantity: Number(form.quantity),
        unit_price: form.unit_price ? Number(form.unit_price) : null,
        total_price: total || null,
        unit: form.unit,
        budget_item_id: budgetItem?.id ?? null,
        product_id: form.product_id || null,
        category_id: form.category_id || null,
        is_household: form.is_household,
      },
      userId,
      workspaceId,
    )
    setSaving(false)
    if (error) { enqueueSnackbar('Error al agregar el producto', { variant: 'error' }); return }
    if (budgetItem) await unlockItem(sessionId, budgetItem.id)
    enqueueSnackbar(`"${form.product_name}" agregado`, { variant: 'success' })
    onClose()
  }

  // Más caro que lo habitual = coral; más barato = neutro con signo (no es un flujo positivo)
  const hintColor = priceDiff > 15 ? st.agotado.text : theme.palette.text.secondary
  const HintIcon = priceDiff > 0 ? TrendingUp : TrendingDown

  return (
    <Dialog
      open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth
      sx={{ '& .MuiDialog-container': { alignItems: { xs: 'flex-start', sm: 'center' } }, '& .MuiDialog-paper': { m: { xs: 1, sm: 4 }, width: { xs: 'calc(100% - 16px)', sm: undefined }, maxHeight: { xs: 'calc(100dvh - 16px)', sm: undefined } } }}
    >
      <DialogTitle sx={{ pb: { xs: 1, sm: 2 } }}>
        <Typography component="span" sx={{ display: 'block', fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>
          {budgetItem ? `Comprar: ${budgetItem.product_name}` : 'Agregar producto'}
        </Typography>
        {!budgetItem && (
          <Typography component="span" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: FS.meta, fontWeight: 400, color: 'text.secondary', mt: 0.5 }}>
            Si no está en el inventario, se creará automáticamente.
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          {budgetItem ? (
            <TextField
              id={NAME_ID}
              fullWidth size="small" label="Producto" required value={form.product_name}
              onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
              onBlur={blur('product_name')}
              error={Boolean(fieldErrors.product_name)} helperText={fieldErrors.product_name || undefined}
            />
          ) : (
            <Autocomplete
              freeSolo
              autoHighlight
              options={products}
              getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name)}
              inputValue={form.product_name}
              onInputChange={(e, newInputValue, reason) => {
                if (reason === 'input') setForm((f) => ({ ...f, product_name: newInputValue, product_id: '' }))
              }}
              onChange={(e, value) => handleProductPick(value)}
              noOptionsText="Sin coincidencias — se creará un producto nuevo"
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id} sx={{ flexDirection: 'column', alignItems: 'flex-start !important', gap: 0.5 }}>
                  <Typography sx={{ fontSize: FS.body, fontWeight: 500 }}>{option.name}</Typography>
                  <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
                    {option.current_quantity} {option.unit} en stock{option.categories?.name ? ` · ${option.categories.name}` : ''}
                  </Typography>
                </Box>
              )}
              renderInput={(params) => {
                nameIdRef.current = params.id
                return (
                  <TextField
                    {...params}
                    size="small" label="Producto" required
                    placeholder="Buscar en tu inventario o escribir uno nuevo…"
                    autoFocus
                    onBlur={blur('product_name')}
                    error={Boolean(fieldErrors.product_name)} helperText={fieldErrors.product_name || undefined}
                  />
                )
              }}
            />
          )}

          {!budgetItem && (
            form.product_id ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ px: 1, py: 0.5, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main' }}>
                  <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>
                    Vinculado a tu inventario{linkedCategory ? ` · ${linkedCategory.name}` : ''}
                  </Typography>
                </Box>
                <Button onClick={() => setForm((f) => ({ ...f, product_id: '' }))}>No es este producto</Button>
              </Box>
            ) : form.product_name.trim() && (
              <FormControl fullWidth size="small">
                <InputLabel id="ai-cat">Categoría (producto nuevo)</InputLabel>
                <Select
                  labelId="ai-cat"
                  value={form.category_id}
                  label="Categoría (producto nuevo)"
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                >
                  <MenuItem value=""><Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Sin categoría</Typography></MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                        {c.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )
          )}

          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: '1fr 1fr' }}>
            <TextField
              fullWidth size="small" type="number" label="Cant." value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              onBlur={blur('quantity')}
              error={Boolean(fieldErrors.quantity)} helperText={fieldErrors.quantity || undefined}
              inputRef={qtyRef}
              slotProps={{ htmlInput: { min: 0.01, step: 0.01, inputMode: 'decimal' } }}
            />
            <FormControl fullWidth size="small">
              <InputLabel id="ai-unit">Unidad</InputLabel>
              <Select labelId="ai-unit" value={form.unit} label="Unidad" onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              fullWidth size="small" type="number" label="Precio"
              value={form.unit_price}
              onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
              onBlur={blur('unit_price')}
              error={Boolean(fieldErrors.unit_price)} helperText={fieldErrors.unit_price || undefined}
              inputRef={priceRef}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> }, htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 1.5, minHeight: 40, bgcolor: 'action.hover', borderRadius: '8px' }}>
              <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.2 }}>{multiplyQty ? 'Subtotal' : 'Total'}</Typography>
              <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, lineHeight: 1.3 }}>{fmtMoney(total)}</Typography>
            </Box>
          </Box>

          {/* Price history hint */}
          {priceHint && (
            <Box sx={{ mt: -1 }}>
              <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', display: 'block' }}>
                Última compra: {priceHint.lastQuantity} {priceHint.unit} · {fmtMoney(priceHint.lastPrice)}
              </Typography>
              {form.unit_price && (
                <Typography sx={{ ...NUM, fontSize: FS.meta, display: 'flex', alignItems: 'center', gap: 0.5, color: hintColor, fontWeight: priceDiff > 15 ? 700 : 400 }}>
                  {priceDiff !== null && Math.abs(priceDiff) > 15 && <HintIcon sx={{ fontSize: 16 }} />}
                  Historial ({priceHint.count} compras): {fmtMoney(priceHint.avg)} / {priceHint.unit}
                  {priceDiff !== null && ` · ${priceDiff > 0 ? '+' : ''}${Math.round(priceDiff)}% vs. habitual`}
                </Typography>
              )}
            </Box>
          )}

          <Button
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            startIcon={moreOpen ? <ExpandLess /> : <ExpandMore />}
            sx={{ alignSelf: 'flex-start', ml: -1 }}
          >
            Más opciones
          </Button>
          <Collapse in={moreOpen} unmountOnExit>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                fullWidth size="small" label="Marca (opcional)" value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              />
              <FormControlLabel
                control={<Checkbox checked={multiplyQty} onChange={(e) => setMultiplyQty(e.target.checked)} />}
                label={<Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>Multiplicar por cantidad</Typography>}
                sx={{ m: 0 }}
              />
{/* Household classification */}
              <FormControlLabel
                control={<Switch checked={form.is_household} onChange={(e) => setForm((f) => ({ ...f, is_household: e.target.checked }))} />}
                labelPlacement="start"
                label={(
                  <Box>
                    <Typography sx={{ fontSize: FS.body, fontWeight: 600 }}>Gasto del hogar</Typography>
                    <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Desactiva para regalos o gastos excepcionales</Typography>
                  </Box>
                )}
                sx={{ m: 0, px: 2, py: 1, border: 1, borderColor: 'divider', borderRadius: '8px', justifyContent: 'space-between', alignItems: 'center' }}
              />
            </Box>
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="inherit" sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ flexGrow: 1 }}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {saving ? 'Guardando…' : 'Agregar al carrito'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
