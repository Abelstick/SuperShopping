import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Box, Button, Card, Typography, List, ListItem,
  ListItemText, IconButton, Chip, LinearProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, FormControl, InputLabel, Select, MenuItem, Alert,
  Skeleton, InputAdornment, Menu, Tooltip, Switch, FormControlLabel,
  Autocomplete,
} from '@mui/material'
import {
  ArrowBack, Add, Edit, Delete, ShoppingCart, CheckCircle,
  RadioButtonUnchecked, Close, ShoppingBag, Tune, DeleteForever,
  DoneAll, RemoveDone, Warning, Checklist,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '../store/budgetStore'
import { useInventoryStore } from '@/features/inventory/store/inventoryStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import { UNITS } from '@/shared/constants/units'

function isPreviousCalendarMonth(iso) {
  const d = new Date(`${iso}T00:00:00`)
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()
}

function formatShortDate(iso) {
  const d = new Date(`${iso}T00:00:00`)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('es-AR', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

function isLowStock(p) {
  return p.is_active && p.min_quantity > 0 && p.current_quantity <= p.min_quantity
}

function SectionLabel({ children }) {
  return (
    <Typography variant="overline" color="text.disabled"
      sx={{ display: 'block', mb: 1.5, fontSize: '0.6875rem', letterSpacing: '0.08em', fontWeight: 700 }}>
      {children}
    </Typography>
  )
}

// ── Item row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, isEditor, onEdit, onDelete, multiplyByQty, isLowStock, selectMode, selected, onToggleSelect }) {
  const estimated = multiplyByQty ? item.quantity * (item.estimated_price || 0) : (item.estimated_price || 0)
  const catColor = item.categories?.color

  return (
    <ListItem
      sx={{ px: 2, py: 1.25, cursor: selectMode ? 'pointer' : 'default' }}
      onClick={selectMode ? onToggleSelect : undefined}
      secondaryAction={
        !selectMode && isEditor && (
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <IconButton size="small" onClick={onEdit}><Edit sx={{ fontSize: 16 }} /></IconButton>
            <IconButton size="small" color="error" onClick={onDelete}><Delete sx={{ fontSize: 16 }} /></IconButton>
          </Box>
        )
      }
    >
      {selectMode && (
        <IconButton size="small" tabIndex={-1} disableRipple sx={{ mr: 1, p: 0.5 }}>
          {selected
            ? <CheckCircle color="primary" sx={{ fontSize: 20 }} />
            : <RadioButtonUnchecked color="disabled" sx={{ fontSize: 20 }} />}
        </IconButton>
      )}
      <ListItemText
        primary={
          <Typography variant="body2" fontWeight={600}>
            {item.product_name}
          </Typography>
        }
        secondary={
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.4, alignItems: 'center' }}>
            <Chip size="small" label={`${item.quantity} ${item.unit}`} variant="outlined" sx={{ height: 20, fontSize: '0.6875rem' }} />
            {item.estimated_price && (
              <Chip size="small" label={`S/${item.estimated_price}`} variant="outlined" color="success" sx={{ height: 20, fontSize: '0.6875rem' }} />
            )}
            {multiplyByQty && estimated > 0 && (
              <Typography variant="caption" color="text.secondary">= S/{estimated.toFixed(2)}</Typography>
            )}
            {catColor && (
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: catColor, flexShrink: 0 }} />
            )}
            {isLowStock && (
              <Chip size="small" icon={<Warning sx={{ fontSize: 12 }} />} label="Stock bajo" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.6875rem' }} />
            )}
          </Box>
        }
      />
    </ListItem>
  )
}

// ── Budget item form dialog ──────────────────────────────────────────────────
function BudgetItemForm({ open, item, budgetId, categories, products, budgetItems, onClose }) {
  const { addBudgetItem, updateBudgetItem } = useBudgetStore()
  const { getLastPriceForProduct } = usePurchaseStore()
  const { enqueueSnackbar } = useSnackbar()
  const isEdit = Boolean(item)

  const empty = { product_name: '', product_id: '', quantity: 1, estimated_price: '', unit: 'unidad', category_id: '', notes: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [priceSuggestion, setPriceSuggestion] = useState(null)
  const [onlyLowStock, setOnlyLowStock] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(item
        ? { product_name: item.product_name, product_id: item.product_id || '', quantity: item.quantity, estimated_price: item.estimated_price || '', unit: item.unit, category_id: item.category_id || '', notes: item.notes || '' }
        : empty
      )
      setPriceSuggestion(null)
      setOnlyLowStock(false)
    }
  }, [open, item])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

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
    if (!form.product_name.trim()) return
    setSaving(true)
    const payload = { ...form, product_id: form.product_id || null, category_id: form.category_id || null, estimated_price: form.estimated_price || null }
    const { error } = isEdit ? await updateBudgetItem(item.id, payload) : await addBudgetItem(budgetId, payload)
    setSaving(false)
    if (error) enqueueSnackbar('Error al guardar', { variant: 'error' })
    else { enqueueSnackbar(isEdit ? 'Item actualizado' : 'Item agregado', { variant: 'success' }); onClose() }
  }

  const selectedCategory = categories.find((c) => c.id === form.category_id)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ px: 3, pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1.25, bgcolor: 'rgba(99,102,241,0.12)', borderRadius: '10px', color: 'primary.main', display: 'flex', flexShrink: 0 }}>
            <ShoppingBag sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {isEdit ? 'Editar item' : 'Agregar item'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isEdit ? 'Modifica los datos del item' : 'Agrega un producto al presupuesto'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {/* Vincular producto */}
        <SectionLabel>Vincular al inventario (opcional)</SectionLabel>
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            options={productOptions}
            value={products.find((p) => p.id === form.product_id) || null}
            onChange={(e, value) => handleProductSelect(value)}
            getOptionLabel={(opt) => opt.name}
            isOptionEqualToValue={(opt, val) => opt.id === val?.id}
            noOptionsText="Sin coincidencias"
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id} sx={{ flexDirection: 'column', alignItems: 'flex-start !important', gap: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {option.categories?.color && (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: option.categories.color, flexShrink: 0 }} />
                  )}
                  <Typography variant="body2" fontWeight={500}>{option.name}</Typography>
                  {isLowStock(option) && (
                    <Chip size="small" label="Stock bajo" color="warning" sx={{ height: 16, fontSize: '0.625rem' }} />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">{option.current_quantity} {option.unit} en stock</Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField {...params} label="Seleccionar del inventario" placeholder="Buscar producto…" />
            )}
          />
          {lowStockCount > 0 && (
            <Chip
              size="small"
              icon={<Warning sx={{ fontSize: 14 }} />}
              label={`Stock bajo (${lowStockCount})`}
              color={onlyLowStock ? 'warning' : 'default'}
              variant={onlyLowStock ? 'filled' : 'outlined'}
              onClick={() => setOnlyLowStock((v) => !v)}
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        {/* Nombre */}
        <SectionLabel>Detalle del producto</SectionLabel>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Nombre del producto"
              required
              value={form.product_name}
              onChange={set('product_name')}
              placeholder="Ej: Leche, Arroz 1kg…"
              autoFocus={!isEdit}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth
              type="number"
              label="Cantidad"
              value={form.quantity}
              onChange={set('quantity')}
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
            />
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth>
              <InputLabel>Unidad</InputLabel>
              <Select value={form.unit} label="Unidad" onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Precio y categoría */}
        <Box sx={{ mt: 3 }}>
          <SectionLabel>Precio y categoría</SectionLabel>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Precio estimado"
                value={form.estimated_price}
                onChange={set('estimated_price')}
                placeholder="0.00"
                slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
              />
              {priceSuggestion && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    {isPreviousCalendarMonth(priceSuggestion.date)
                      ? `Mes pasado compraste ${priceSuggestion.quantity} ${priceSuggestion.unit} · S/${priceSuggestion.price.toFixed(2)}`
                      : `Última compra (${formatShortDate(priceSuggestion.date)}): ${priceSuggestion.quantity} ${priceSuggestion.unit} · S/${priceSuggestion.price.toFixed(2)}`}
                  </Typography>
                  {Number(form.estimated_price) !== priceSuggestion.price && (
                    <Button
                      size="small"
                      onClick={() => setForm((f) => ({ ...f, estimated_price: priceSuggestion.price }))}
                      sx={{ minHeight: 28, fontSize: '0.6875rem', py: 0, px: 1 }}
                    >
                      Usar
                    </Button>
                  )}
                </Box>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={form.category_id}
                  label="Categoría"
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  renderValue={(val) => {
                    if (!val) return <Typography color="text.disabled" variant="body2">Sin categoría</Typography>
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: selectedCategory?.color }} />
                        {selectedCategory?.name}
                      </Box>
                    )
                  }}
                >
                  <MenuItem value=""><Typography color="text.secondary" variant="body2">Sin categoría</Typography></MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                        {c.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Notas"
                value={form.notes}
                onChange={set('notes')}
                placeholder="Marca preferida, sustitutos aceptados…"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.product_name.trim()} sx={{ minWidth: 120 }}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar item'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:     { label: 'Borrador',   color: '#71717a' },
  active:    { label: 'Activo',     color: '#6366f1' },
  completed: { label: 'Completado', color: '#10b981' },
  cancelled: { label: 'Cancelado',  color: '#f43f5e' },
}

export default function BudgetDetailPage() {
  const { budgetId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const {
    currentBudget, budgetItems, loading,
    fetchBudgetWithItems, updateBudgetItem, deleteBudgetItem,
    clearAllItems, addBudgetItemsBulk, deleteBudgetItemsBulk,
  } = useBudgetStore()
  const { products, categories, fetchProducts, fetchCategories } = useInventoryStore()
  const { enqueueSnackbar } = useSnackbar()
  const [itemDialog, setItemDialog] = useState({ open: false, item: null })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [maintenanceAnchor, setMaintenanceAnchor] = useState(null)
  const [clearAllConfirm, setClearAllConfirm] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [multiplyByQty, setMultiplyByQty] = useState(false)
  const [addingLowStock, setAddingLowStock] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    fetchBudgetWithItems(budgetId)
    if (currentWorkspace) {
      fetchProducts(currentWorkspace.id)
      fetchCategories(currentWorkspace.id)
    }
  }, [budgetId])

  const totalEst = multiplyByQty
    ? budgetItems.reduce((a, i) => a + (i.quantity * (i.estimated_price || 0)), 0)
    : budgetItems.reduce((a, i) => a + (i.estimated_price || 0), 0)

  const overBudget = currentBudget?.target_amount && totalEst > currentBudget.target_amount
  const budgetProgress = currentBudget?.target_amount
    ? Math.min((totalEst / currentBudget.target_amount) * 100, 100)
    : 0

  const isEditor = ['owner', 'editor'].includes(currentWorkspace?.my_role)
  const statusMeta = STATUS_META[currentBudget?.status] || STATUS_META.draft

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

  if (loading && !currentBudget) {
    return (
      <Box>
        <Skeleton height={40} width={200} sx={{ mb: 2 }} />
        <Skeleton height={100} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton height={300} sx={{ borderRadius: 2 }} />
      </Box>
    )
  }

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={() => navigate('/budgets')} size="small" sx={{ flexShrink: 0 }}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.015em' }}>
              {currentBudget?.name}
            </Typography>
            <Chip
              size="small"
              label={statusMeta.label}
              sx={{
                bgcolor: statusMeta.color + '18',
                color: statusMeta.color,
                border: `1px solid ${statusMeta.color}33`,
                fontWeight: 700,
                fontSize: '0.6875rem',
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
            {currentBudget?.store && (
              <Typography variant="caption" color="text.secondary">{currentBudget.store}</Typography>
            )}
            {currentBudget?.date && (
              <Typography variant="caption" color="text.secondary">
                {new Date(currentBudget.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Typography>
            )}
          </Box>
        </Box>
        {isEditor && currentBudget?.status === 'active' && (
          <Button
            variant="contained"
            startIcon={<ShoppingCart sx={{ fontSize: 17 }} />}
            onClick={() => navigate(`/shopping/new?budgetId=${budgetId}`)}
            size="small"
          >
            Iniciar compra
          </Button>
        )}
      </Box>

      {/* ── Summary cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Items',      value: budgetItems.length,           color: '#6366f1' },
          { label: 'Est. total', value: `S/${totalEst.toFixed(0)}`,   color: overBudget ? '#f43f5e' : '#71717a' },
        ].map((s) => (
          <Grid size={{ xs: 6 }} key={s.label}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800} sx={{ color: s.color, letterSpacing: '-0.02em' }}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Budget progress ── */}
      {currentBudget?.target_amount && (
        <Card sx={{ p: 2.5, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" fontWeight={600}>Estimado vs. presupuesto</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color={overBudget ? 'error.main' : 'text.primary'}>
                S/{totalEst.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">/ S/{currentBudget.target_amount}</Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={budgetProgress}
            color={overBudget ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
          {overBudget && (
            <Typography variant="caption" color="error.main" fontWeight={600} sx={{ mt: 0.75, display: 'block' }}>
              ⚠ El estimado supera el presupuesto por S/{(totalEst - currentBudget.target_amount).toFixed(0)}
            </Typography>
          )}
        </Card>
      )}

      {/* ── Items list header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700}>
          Lista de compras
          {budgetItems.length > 0 && (
            <Typography component="span" variant="body2" color="text.secondary" fontWeight={400} sx={{ ml: 1 }}>
              {budgetItems.length} items
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {selectMode ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
              </Typography>
              <Tooltip title="Seleccionar todos">
                <IconButton size="small" onClick={() => setSelectedIds(new Set(budgetItems.map((i) => i.id)))}>
                  <DoneAll sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Deseleccionar todos">
                <IconButton size="small" onClick={() => setSelectedIds(new Set())}>
                  <RemoveDone sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Button
                size="small" variant="contained" color="error" startIcon={<Delete sx={{ fontSize: 16 }} />}
                disabled={selectedIds.size === 0}
                onClick={() => setBulkDeleteConfirm(true)}
              >
                Eliminar
              </Button>
              <Button size="small" color="inherit" startIcon={<Close sx={{ fontSize: 16 }} />} onClick={exitSelectMode}>
                Cancelar
              </Button>
            </Box>
          ) : (
            <>
              {budgetItems.length > 0 && (
                <FormControlLabel
                  control={<Switch size="small" checked={multiplyByQty} onChange={(e) => setMultiplyByQty(e.target.checked)} />}
                  label={<Typography variant="caption" color="text.secondary">×cant.</Typography>}
                  labelPlacement="start"
                  sx={{ m: 0, gap: 0.5 }}
                />
              )}
              {isEditor && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {budgetItems.length > 0 && (
                    <>
                      <Tooltip title="Seleccionar varios items para eliminar">
                        <IconButton
                          size="small"
                          onClick={enterSelectMode}
                          disabled={bulkLoading}
                          sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                        >
                          <Checklist sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Mantenimiento de lista">
                        <IconButton
                          size="small"
                          onClick={(e) => setMaintenanceAnchor(e.currentTarget)}
                          disabled={bulkLoading}
                          sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                        >
                          <Tune sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                      <Menu
                        anchorEl={maintenanceAnchor}
                        open={Boolean(maintenanceAnchor)}
                        onClose={() => setMaintenanceAnchor(null)}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                      >
                        <MenuItem
                          onClick={() => { setMaintenanceAnchor(null); setClearAllConfirm(true) }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteForever sx={{ fontSize: 17, mr: 1.25 }} />
                          Vaciar lista completa
                        </MenuItem>
                      </Menu>
                    </>
                  )}
                  {lowStockToAdd.length > 0 && (
                    <Tooltip title="Agrega de una vez todos los productos con stock bajo que aún no están en la lista">
                      <span>
                        <Button
                          startIcon={<Warning sx={{ fontSize: 16 }} />}
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={handleAddLowStock}
                          disabled={addingLowStock}
                        >
                          {addingLowStock ? 'Agregando…' : `Stock bajo (${lowStockToAdd.length})`}
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                  <Button startIcon={<Add />} size="small" variant="outlined" onClick={() => setItemDialog({ open: true, item: null })}>
                    Agregar
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      <Card>
        {budgetItems.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center'}}>
            <ShoppingBag sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" variant="body2" fontWeight={600}>Sin items</Typography>
            <Typography color="text.disabled" variant="caption" display="block" sx={{ mb: 2.5 }}>
              Agrega productos para planificar la compra 
            </Typography>
            {isEditor && (
              <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setItemDialog({ open: true, item: null })}>
                Agregar primer item
              </Button>
            )}
          </Box>
        ) : (
          <List disablePadding>
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
                {i < budgetItems.length - 1 && <Divider sx={{ mx: 2 }} />}
              </Box>
            ))}
          </List>
        )}
      </Card>

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
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar item</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Eliminar <strong>"{deleteConfirm?.product_name}"</strong> del presupuesto?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={async () => { await deleteBudgetItem(deleteConfirm.id); setDeleteConfirm(null) }}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear all items */}
      <Dialog open={clearAllConfirm} onClose={() => setClearAllConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: 'rgba(244,63,94,0.1)', borderRadius: 2, color: 'error.main', display: 'flex' }}>
              <DeleteForever sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Vaciar lista</Typography>
              <Typography variant="body2" color="text.secondary">Se eliminan {budgetItems.length} items</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 1 }}>Esta acción no se puede deshacer.</Alert>
          <Typography variant="body2" color="text.secondary">
            Se eliminarán <strong>todos</strong> los items de la lista. El presupuesto en sí no será afectado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAllConfirm(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleClearAll}>
            Vaciar lista
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete selected items */}
      <Dialog open={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar seleccionados</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Eliminar los <strong>{selectedIds.size}</strong> items seleccionados del presupuesto?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteConfirm(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
