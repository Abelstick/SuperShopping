import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Box, Button, Card, Typography, IconButton, Chip, LinearProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert,
  Skeleton, InputAdornment, Menu, ListItemIcon, ListItemText, Tooltip, Switch, FormControlLabel,
  Autocomplete, Checkbox, CircularProgress, useTheme,
} from '@mui/material'
import {
  ArrowBack, Add, Edit, Delete, ShoppingCart,
  Close, ShoppingBag, Tune, DeleteForever,
  DoneAll, RemoveDone, Warning, Checklist, ErrorOutlined, Receipt,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '../store/budgetStore'
import { useInventoryStore } from '@/features/inventory/store/inventoryStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import { UNITS } from '@/shared/constants/units'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import StockBadge from '@/shared/components/StockBadge'
import { fmtMoney, fmtDate } from '@/shared/utils/format'
import BudgetStatusChip from '../components/BudgetStatusChip'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos/KPIs · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const NUM = { fontVariantNumeric: 'tabular-nums' }
const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

function isPreviousCalendarMonth(iso) {
  const d = new Date(`${iso}T00:00:00`)
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()
}

function isLowStock(p) {
  return p.is_active && p.min_quantity > 0 && p.current_quantity <= p.min_quantity
}

function SectionLabel({ children }) {
  return <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: 700, mb: 2 }}>{children}</Typography>
}

// ── Item row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, isEditor, onEdit, onDelete, multiplyByQty, isLowStock: low, selectMode, selected, onToggleSelect }) {
  const estimated = multiplyByQty ? item.quantity * (item.estimated_price || 0) : (item.estimated_price || 0)
  const catColor = item.categories?.color

  return (
    <Box
      onClick={selectMode ? onToggleSelect : undefined}
      sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1, minHeight: 72, cursor: selectMode ? 'pointer' : 'default', '&:hover': selectMode ? { bgcolor: 'action.hover' } : {} }}
    >
      {selectMode && (
        <Checkbox
          className="select-in"
          checked={selected}
          sx={{ ml: -1 }}
          onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          inputProps={{ 'aria-label': `Seleccionar item ${item.product_name}` }}
        />
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>{item.product_name}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5, alignItems: 'center' }}>
          <Box sx={{ ...NUM, px: 1, py: 0.5, borderRadius: '8px', border: 1, borderColor: 'divider', fontSize: FS.meta, fontWeight: 600, lineHeight: 1.4 }}>
            {item.quantity} {item.unit}
          </Box>
          {catColor && <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: catColor, flexShrink: 0 }} />}
          {low && <StockBadge>Stock bajo</StockBadge>}
        </Box>
      </Box>
      {Boolean(item.estimated_price) && (
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{fmtMoney(item.estimated_price)}</Typography>
          {multiplyByQty && estimated > 0 && (
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>= {fmtMoney(estimated)}</Typography>
          )}
        </Box>
      )}
      {!selectMode && isEditor && (
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <IconButton aria-label={`Editar item ${item.product_name}`} onClick={onEdit}><Edit sx={{ fontSize: 20 }} /></IconButton>
          <IconButton aria-label={`Eliminar item ${item.product_name}`} onClick={onDelete}><Delete sx={{ fontSize: 20 }} /></IconButton>
        </Box>
      )}
    </Box>
  )
}

// ── Budget item form dialog ──────────────────────────────────────────────────
// Validación al salir del campo (on blur) y de nuevo al guardar
const itemValidators = {
  product_name: (v) => (String(v).trim() ? '' : 'Ingresa el nombre del producto.'),
  quantity: (v) => (Number(v) > 0 ? '' : 'La cantidad debe ser mayor a 0.'),
  estimated_price: (v) => (v !== '' && v !== null && Number(v) < 0 ? 'El precio no puede ser negativo.' : ''),
}
const ITEM_FIELD_ORDER = ['product_name', 'quantity', 'estimated_price']

function BudgetItemForm({ open, item, budgetId, categories, products, budgetItems, onClose }) {
  const theme = useTheme()
  const { addBudgetItem, updateBudgetItem } = useBudgetStore()
  const { getLastPriceForProduct } = usePurchaseStore()
  const { enqueueSnackbar } = useSnackbar()
  const isEdit = Boolean(item)

  const empty = { product_name: '', product_id: '', quantity: 1, estimated_price: '', unit: 'unidad', category_id: '', notes: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [priceSuggestion, setPriceSuggestion] = useState(null)
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const nameRef = useRef(null)
  const qtyRef = useRef(null)
  const priceRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(item
        ? { product_name: item.product_name, product_id: item.product_id || '', quantity: item.quantity, estimated_price: item.estimated_price || '', unit: item.unit, category_id: item.category_id || '', notes: item.notes || '' }
        : empty
      )
      setPriceSuggestion(null)
      setOnlyLowStock(false)
      setFieldErrors({})
    }
  }, [open, item])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const blur = (field) => () => setFieldErrors((errs) => ({ ...errs, [field]: itemValidators[field](form[field]) }))

  // Products already on this budget's list can't be picked again — keeps the
  // same low-stock item from being added twice via the linker below.
  const alreadyAddedProductIds = useMemo(
    () => new Set(budgetItems.filter((bi) => bi.product_id && bi.id !== item?.id).map((bi) => bi.product_id)),
    [budgetItems, item?.id]
  )

  const lowStockCount = useMemo(
    () => products.filter((p) => isLowStock(p) && !alreadyAddedProductIds.has(p.id)).length,
    [products, alreadyAddedProductIds]
  )
  const productOptions = useMemo(() => {
    const list = (onlyLowStock ? products.filter(isLowStock) : products).filter((p) => !alreadyAddedProductIds.has(p.id))
    return [...list].sort((a, b) => {
      const rank = (p) => (isLowStock(p) ? 0 : 1)
      return rank(a) - rank(b) || a.name.localeCompare(b.name)
    })
  }, [products, onlyLowStock, alreadyAddedProductIds])

  // A price suggested for one product is meaningless for another, so switching
  // products always replaces the price field instead of leaving a stale value.
  const handleProductSelect = async (product) => {
    setPriceSuggestion(null)
    setForm((f) => (product
      ? { ...f, product_id: product.id, product_name: product.name, unit: product.unit, category_id: product.category_id || '', estimated_price: '' }
      : { ...f, product_id: '', estimated_price: '' }
    ))
    if (!product) return
    const { data } = await getLastPriceForProduct(product.id)
    if (!data) return
    setPriceSuggestion(data)
    setForm((f) => ({ ...f, estimated_price: data.price }))
  }

  const handleSave = async () => {
    const errs = Object.fromEntries(ITEM_FIELD_ORDER.map((f) => [f, itemValidators[f](form[f])]))
    setFieldErrors(errs)
    const firstInvalid = ITEM_FIELD_ORDER.find((f) => errs[f])
    if (firstInvalid) {
      const refs = { product_name: nameRef, quantity: qtyRef, estimated_price: priceRef }
      refs[firstInvalid].current?.focus()
      return
    }
    setSaving(true)
    const payload = { ...form, product_id: form.product_id || null, category_id: form.category_id || null, estimated_price: form.estimated_price || null }
    const { error } = isEdit ? await updateBudgetItem(item.id, payload) : await addBudgetItem(budgetId, payload)
    setSaving(false)
    if (error) enqueueSnackbar('Error al guardar', { variant: 'error' })
    else { enqueueSnackbar(isEdit ? 'Item actualizado' : 'Item agregado', { variant: 'success' }); onClose() }
  }

  const submitLabel = isEdit ? 'Guardar cambios' : 'Agregar item'
  const selectedCategory = categories.find((c) => c.id === form.category_id)
  const st = theme.palette.stock

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, bgcolor: 'action.selected', borderRadius: '8px', color: 'primary.main', display: 'flex', flexShrink: 0 }}>
            <ShoppingBag sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography component="span" sx={{ display: 'block', fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>
              {isEdit ? 'Editar item' : 'Agregar item'}
            </Typography>
            <Typography component="span" sx={{ display: 'block', fontSize: FS.meta, fontWeight: 400, color: 'text.secondary' }}>
              {isEdit ? 'Modifica los datos del item' : 'Agrega un producto al presupuesto'}
            </Typography>
          </Box>
          <IconButton aria-label="Cerrar" onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {/* Vincular producto */}
        <SectionLabel>Vincular al inventario (opcional)</SectionLabel>
        <Box sx={{ mb: 4 }}>
          <Autocomplete
            options={productOptions}
            value={products.find((p) => p.id === form.product_id) || null}
            onChange={(e, value) => handleProductSelect(value)}
            getOptionLabel={(opt) => opt.name}
            isOptionEqualToValue={(opt, val) => opt.id === val?.id}
            noOptionsText="Sin coincidencias"
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id} sx={{ flexDirection: 'column', alignItems: 'flex-start !important', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {option.categories?.color && (
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: option.categories.color, flexShrink: 0 }} />
                  )}
                  <Typography sx={{ fontSize: FS.body, fontWeight: 500 }}>{option.name}</Typography>
                  {isLowStock(option) && <StockBadge>Stock bajo</StockBadge>}
                </Box>
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{option.current_quantity} {option.unit} en stock</Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField {...params} label="Seleccionar del inventario" placeholder="Buscar producto…" />
            )}
          />
          {lowStockCount > 0 && (
            <Chip
              icon={<Warning sx={{ fontSize: 16 }} />}
              label={`Stock bajo (${lowStockCount})`}
              aria-pressed={onlyLowStock}
              onClick={() => setOnlyLowStock((v) => !v)}
              sx={{
                mt: 1,
                bgcolor: onlyLowStock ? 'action.selected' : 'transparent',
                color: onlyLowStock ? 'primary.main' : 'text.primary',
                border: 1, borderColor: onlyLowStock ? 'primary.main' : 'divider',
                '& .MuiChip-icon': { color: st.agotado.icon },
              }}
            />
          )}
        </Box>

        {/* Nombre */}
        <SectionLabel>Detalle del producto</SectionLabel>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField
              fullWidth
              label="Nombre del producto"
              required
              value={form.product_name}
              onChange={set('product_name')}
              onBlur={blur('product_name')}
              error={Boolean(fieldErrors.product_name)}
              helperText={fieldErrors.product_name || ' '}
              inputRef={nameRef}
              placeholder="Ej: Leche, Arroz 1kg…"
              autoFocus={!isEdit}
            />
          </Box>
          <TextField
            fullWidth
            type="number"
            label="Cantidad"
            value={form.quantity}
            onChange={set('quantity')}
            onBlur={blur('quantity')}
            error={Boolean(fieldErrors.quantity)}
            helperText={fieldErrors.quantity || ' '}
            inputRef={qtyRef}
            slotProps={{ htmlInput: { min: 0.01, step: 0.01, inputMode: 'decimal' } }}
          />
          <FormControl fullWidth>
            <InputLabel id="bi-unit">Unidad</InputLabel>
            <Select labelId="bi-unit" value={form.unit} label="Unidad" onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
              {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Precio y categoría */}
        <Box sx={{ mt: 3 }}>
          <SectionLabel>Precio y categoría</SectionLabel>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <TextField
                fullWidth
                type="number"
                label="Precio estimado"
                value={form.estimated_price}
                onChange={set('estimated_price')}
                onBlur={blur('estimated_price')}
                error={Boolean(fieldErrors.estimated_price)}
                helperText={fieldErrors.estimated_price || ' '}
                inputRef={priceRef}
                placeholder="0.00"
                slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> }, htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
              />
              {priceSuggestion && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
                    {isPreviousCalendarMonth(priceSuggestion.date)
                      ? `Mes pasado compraste ${priceSuggestion.quantity} ${priceSuggestion.unit} · ${fmtMoney(priceSuggestion.price)}`
                      : `Última compra (${fmtDate(priceSuggestion.date)}): ${priceSuggestion.quantity} ${priceSuggestion.unit} · ${fmtMoney(priceSuggestion.price)}`}
                  </Typography>
                  {Number(form.estimated_price) !== priceSuggestion.price && (
                    <Button onClick={() => setForm((f) => ({ ...f, estimated_price: priceSuggestion.price }))}>Usar</Button>
                  )}
                </Box>
              )}
            </Box>
            <FormControl fullWidth>
              <InputLabel id="bi-cat" shrink>Categoría</InputLabel>
              <Select
                labelId="bi-cat"
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                      {c.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                fullWidth
                label="Notas"
                value={form.notes}
                onChange={set('notes')}
                placeholder="Marca preferida, sustitutos aceptados…"
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ minWidth: 144 }}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Hero: estimado vs. presupuesto ───────────────────────────────────────────
function EstimateHero({ total, target, over, progress }) {
  const st = useTheme().palette.stock
  const skin = over ? st.agotado : st.saludable
  const Icon = over ? ErrorOutlined : Receipt
  return (
    <Card sx={{ bgcolor: skin.tint, borderColor: skin.line, p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ fontSize: 24, color: skin.icon }} />
        <Typography component="h2" sx={{ fontSize: FS.body, fontWeight: 700 }}>
          {target ? 'Estimado vs. presupuesto' : 'Est. total'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: skin.text }}>
          {fmtMoney(total)}
        </Typography>
        {target && (
          <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>/ {fmtMoney(target)}</Typography>
        )}
      </Box>
      {target && (
        <LinearProgress
          aria-hidden
          variant="determinate"
          value={progress}
          sx={{ height: 8, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: over ? st.agotado.icon : 'primary.main' } }}
        />
      )}
      {over && (
        <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, color: st.agotado.text }}>
          <Warning sx={{ fontSize: 20, color: st.agotado.icon }} />
          El estimado supera el presupuesto por {fmtMoney(total - target)}
        </Typography>
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BudgetDetailPage() {
  const { budgetId } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspaceStore()
  const {
    currentBudget, budgetItems, loading,
    fetchBudgetWithItems, deleteBudgetItem,
    clearAllItems, addBudgetItemsBulk, deleteBudgetItemsBulk,
  } = useBudgetStore()
  const { products, categories, fetchProducts, fetchCategories } = useInventoryStore()
  const { enqueueSnackbar } = useSnackbar()
  const [itemDialog, setItemDialog] = useState({ open: false, item: null })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deletingItem, setDeletingItem] = useState(false)
  const [maintenanceAnchor, setMaintenanceAnchor] = useState(null)
  const [clearAllConfirm, setClearAllConfirm] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [multiplyByQty, setMultiplyByQty] = useState(false)
  const [addingLowStock, setAddingLowStock] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)

  // Mismas cargas de siempre; ahora se recoge el `{ error }` y se espera al hogar si aún no cargó
  useEffect(() => {
    let cancelled = false
    const calls = [fetchBudgetWithItems(budgetId)]
    if (currentWorkspace) {
      calls.push(fetchProducts(currentWorkspace.id), fetchCategories(currentWorkspace.id))
    }
    Promise.all(calls)
      .then((results) => {
        if (cancelled) return
        const failed = results.find((r) => r?.error)
        setLoadError(failed ? { message: failed.error.message || 'Sin detalle del servidor' } : null)
      })
      .catch((e) => { if (!cancelled) setLoadError({ message: e?.message || 'Sin detalle del servidor' }) })
    return () => { cancelled = true }
  }, [budgetId, currentWorkspace?.id, retryTick])

  const totalEst = multiplyByQty
    ? budgetItems.reduce((a, i) => a + (i.quantity * (i.estimated_price || 0)), 0)
    : budgetItems.reduce((a, i) => a + (i.estimated_price || 0), 0)

  const target = currentBudget?.target_amount || 0
  const overBudget = Boolean(target && totalEst > target)
  const budgetProgress = target ? Math.min((totalEst / target) * 100, 100) : 0

  const isEditor = ['owner', 'editor'].includes(currentWorkspace?.my_role)
  const primaryIsStart = isEditor && currentBudget?.status === 'active'

  const addedProductIds = useMemo(
    () => new Set(budgetItems.filter((i) => i.product_id).map((i) => i.product_id)),
    [budgetItems]
  )
  const lowStockProducts = useMemo(() => products.filter(isLowStock), [products])
  const lowStockProductIds = useMemo(() => new Set(lowStockProducts.map((p) => p.id)), [lowStockProducts])
  const lowStockToAdd = useMemo(
    () => lowStockProducts.filter((p) => !addedProductIds.has(p.id)),
    [lowStockProducts, addedProductIds]
  )

  const handleAddLowStock = async () => {
    setAddingLowStock(true)

    // Pull each product's most recent purchase in one round trip: sorted by
    // date desc, so the first row seen per product_id is its latest one.
    const { data: lastPurchases } = await supabase
      .from('purchase_items')
      .select('product_id, unit_price, unit, quantity, purchases!inner(date)')
      .in('product_id', lowStockToAdd.map((p) => p.id))
      .not('unit_price', 'is', null)
      .order('date', { foreignTable: 'purchases', ascending: false })

    const lastByProduct = new Map()
    for (const row of lastPurchases || []) {
      if (!lastByProduct.has(row.product_id)) lastByProduct.set(row.product_id, row)
    }

    const payload = lowStockToAdd.map((p) => {
      const last = lastByProduct.get(p.id)
      return {
        product_id: p.id,
        product_name: p.name,
        quantity: last ? Number(last.quantity) : (p.min_quantity > 0 ? Math.max(p.min_quantity - p.current_quantity, 1) : 1),
        unit: last?.unit || p.unit,
        category_id: p.category_id || null,
        estimated_price: last ? Number(last.unit_price) : null,
      }
    })
    const { error } = await addBudgetItemsBulk(budgetId, payload)
    setAddingLowStock(false)
    if (error) enqueueSnackbar('Error al agregar productos con stock bajo', { variant: 'error' })
    else enqueueSnackbar(`${payload.length} producto${payload.length !== 1 ? 's' : ''} con stock bajo agregado${payload.length !== 1 ? 's' : ''} — revisa cantidad y precio`, { variant: 'success' })
  }

  const handleClearAll = async () => {
    setClearAllConfirm(false)
    setBulkLoading(true)
    const { error } = await clearAllItems(budgetId)
    setBulkLoading(false)
    if (error) enqueueSnackbar('Error al vaciar', { variant: 'error' })
    else enqueueSnackbar('Lista vaciada', { variant: 'success' })
  }

  const handleDeleteItem = async () => {
    setDeletingItem(true)
    const { error } = await deleteBudgetItem(deleteConfirm.id)
    setDeletingItem(false)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Item eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const enterSelectMode = () => {
    setSelectedIds(new Set())
    setSelectMode(true)
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const toggleItemSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    const { error } = await deleteBudgetItemsBulk([...selectedIds])
    setBulkDeleting(false)
    setBulkDeleteConfirm(false)
    if (error) enqueueSnackbar('Error al eliminar los items', { variant: 'error' })
    else {
      enqueueSnackbar(`${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''} eliminado${selectedIds.size !== 1 ? 's' : ''}`, { variant: 'success' })
      exitSelectMode()
    }
  }

  // Solo se muestra el presupuesto que corresponde a la URL (no el anterior mientras carga)
  const budgetReady = currentBudget?.id === budgetId
  const retry = () => { setLoadError(null); setRetryTick((t) => t + 1) }

  if (!budgetReady && (loading || !loadError)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="text" width={240} sx={{ fontSize: FS.title }} />
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 8fr) minmax(0, 4fr)' } }}>
          <Skeleton variant="rectangular" height={168} sx={{ borderRadius: '12px' }} />
          <Skeleton variant="rectangular" height={168} sx={{ borderRadius: '12px' }} />
        </Box>
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '12px' }} />
      </Box>
    )
  }

  if (!budgetReady) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/budgets')} sx={{ color: 'text.secondary' }}>Presupuestos</Button>
        </Box>
        <LoadErrorBanner message={loadError?.message || 'Sin detalle del servidor'} onRetry={retry} />
      </Box>
    )
  }

  const selectedNames = budgetItems.filter((i) => selectedIds.has(i.id)).map((i) => i.product_name)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header: título + única acción primaria ── */}
      <Box {...reveal(0)} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <IconButton aria-label="Volver a presupuestos" onClick={() => navigate('/budgets')} sx={{ flexShrink: 0 }}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
              {currentBudget?.name}
            </Typography>
            <BudgetStatusChip status={currentBudget?.status} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {currentBudget?.store && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{currentBudget.store}</Typography>}
            {currentBudget?.date && <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{fmtDate(currentBudget.date)}</Typography>}
          </Box>
        </Box>
        {primaryIsStart && (
          <Button variant="contained" startIcon={<ShoppingCart sx={{ fontSize: 20 }} />} onClick={() => navigate(`/shopping/new?budgetId=${budgetId}`)}>
            Iniciar compra
          </Button>
        )}
      </Box>

      {loadError && <LoadErrorBanner message={loadError.message} onRetry={retry} />}

      {/* ── Nivel 1 y 2: hero + KPI ── */}
      <Box {...reveal(1)} sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 8fr) minmax(0, 4fr)' } }}>
        <EstimateHero total={totalEst} target={target} over={overBudget} progress={budgetProgress} />
        <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Items</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{budgetItems.length}</Typography>
        </Card>
      </Box>

      {/* ── Lista de compras ── */}
      <Box {...reveal(2)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Lista de compras</Typography>
            {budgetItems.length > 0 && (
              <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>{budgetItems.length} items</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {selectMode ? (
              <>
                <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>
                  {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                </Typography>
                <Tooltip title="Seleccionar todos">
                  <IconButton aria-label="Seleccionar todos" onClick={() => setSelectedIds(new Set(budgetItems.map((i) => i.id)))}>
                    <DoneAll sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Deseleccionar todos">
                  <IconButton aria-label="Deseleccionar todos" onClick={() => setSelectedIds(new Set())}>
                    <RemoveDone sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" startIcon={<Delete sx={{ fontSize: 20 }} />} disabled={selectedIds.size === 0} onClick={() => setBulkDeleteConfirm(true)}>
                  Eliminar
                </Button>
                <Button color="inherit" startIcon={<Close sx={{ fontSize: 20 }} />} onClick={exitSelectMode} sx={{ color: 'text.secondary' }}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                {budgetItems.length > 0 && (
                  <FormControlLabel
                    control={<Switch checked={multiplyByQty} onChange={(e) => setMultiplyByQty(e.target.checked)} />}
                    label={<Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>×cant.</Typography>}
                    labelPlacement="start"
                    sx={{ m: 0, gap: 0.5 }}
                  />
                )}
                {isEditor && (
                  <>
                    {budgetItems.length > 0 && (
                      <>
                        <Tooltip title="Seleccionar varios items para eliminar">
                          <span>
                            <IconButton aria-label="Seleccionar varios items para eliminar" onClick={enterSelectMode} disabled={bulkLoading}
                              sx={{ border: 1, borderColor: 'divider' }}>
                              <Checklist sx={{ fontSize: 20 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Mantenimiento de lista">
                          <span>
                            <IconButton aria-label="Mantenimiento de lista" onClick={(e) => setMaintenanceAnchor(e.currentTarget)} disabled={bulkLoading}
                              sx={{ border: 1, borderColor: 'divider' }}>
                              <Tune sx={{ fontSize: 20 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Menu
                          anchorEl={maintenanceAnchor}
                          open={Boolean(maintenanceAnchor)}
                          onClose={() => setMaintenanceAnchor(null)}
                          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                          <MenuItem onClick={() => { setMaintenanceAnchor(null); setClearAllConfirm(true) }}>
                            <ListItemIcon><DeleteForever fontSize="small" /></ListItemIcon>
                            <ListItemText>Vaciar lista completa</ListItemText>
                          </MenuItem>
                        </Menu>
                      </>
                    )}
                    {lowStockToAdd.length > 0 && (
                      <Tooltip title="Agrega de una vez todos los productos con stock bajo que aún no están en la lista">
                        <span>
                          <Button startIcon={<Warning sx={{ fontSize: 20 }} />} variant="outlined" onClick={handleAddLowStock} disabled={addingLowStock}>
                            {addingLowStock ? 'Agregando…' : `Stock bajo (${lowStockToAdd.length})`}
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                    <Button startIcon={<Add />} variant={primaryIsStart ? 'outlined' : 'contained'} onClick={() => setItemDialog({ open: true, item: null })}>
                      Agregar
                    </Button>
                  </>
                )}
              </>
            )}
          </Box>
        </Box>

        {budgetItems.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag sx={{ fontSize: 28 }} />}
            title="Sin items"
            body="Agrega productos para planificar la compra"
            action={isEditor && <Button variant="contained" startIcon={<Add />} onClick={() => setItemDialog({ open: true, item: null })}>Agregar primer item</Button>}
          />
        ) : (
          <Card>
            {budgetItems.map((item, i) => (
              <Box key={item.id}>
                <ItemRow
                  item={item}
                  isEditor={isEditor}
                  multiplyByQty={multiplyByQty}
                  isLowStock={Boolean(item.product_id && lowStockProductIds.has(item.product_id))}
                  selectMode={selectMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleItemSelected(item.id)}
                  onEdit={() => setItemDialog({ open: true, item })}
                  onDelete={() => setDeleteConfirm(item)}
                />
                {i < budgetItems.length - 1 && <Divider sx={{ mx: 3 }} />}
              </Box>
            ))}
          </Card>
        )}
      </Box>

      <BudgetItemForm
        open={itemDialog.open}
        item={itemDialog.item}
        budgetId={budgetId}
        categories={categories}
        products={products}
        budgetItems={budgetItems}
        onClose={() => setItemDialog({ open: false, item: null })}
      />

      {/* Delete single item */}
      <Dialog open={Boolean(deleteConfirm)} onClose={deletingItem ? undefined : () => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar item</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
            ¿Eliminar <strong>"{deleteConfirm?.product_name}"</strong> del presupuesto?
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

      {/* Clear all items */}
      <Dialog open={clearAllConfirm} onClose={() => setClearAllConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: 'error.main', borderRadius: '8px', color: 'error.contrastText', display: 'flex' }}>
              <DeleteForever sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography component="span" sx={{ display: 'block', fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Vaciar lista</Typography>
              <Typography component="span" sx={{ display: 'block', fontSize: FS.body, fontWeight: 400, color: 'text.secondary' }}>Se eliminan {budgetItems.length} items</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>Esta acción no se puede deshacer.</Alert>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
            Se eliminarán <strong>todos</strong> los items de la lista. El presupuesto en sí no será afectado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAllConfirm(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleClearAll}>Vaciar lista</Button>
        </DialogActions>
      </Dialog>

      {/* Delete selected items */}
      <Dialog open={bulkDeleteConfirm} onClose={bulkDeleting ? undefined : () => setBulkDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar seleccionados</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
            ¿Eliminar los <strong>{selectedIds.size}</strong> items seleccionados del presupuesto?
          </Typography>
          <Box component="ul" sx={{ m: 0, mt: 2, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {selectedNames.slice(0, 5).map((n, i) => (
              <li key={`${n}-${i}`}><Typography component="span" sx={{ fontSize: FS.body, fontWeight: 600 }}>{n}</Typography></li>
            ))}
            {selectedNames.length > 5 && (
              <li><Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>+{selectedNames.length - 5} más</Typography></li>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleBulkDelete} disabled={bulkDeleting}
            startIcon={bulkDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {bulkDeleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
