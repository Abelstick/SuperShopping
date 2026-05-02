import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, Typography, List, ListItem,
  ListItemText, IconButton, Chip, LinearProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, FormControl, InputLabel, Select, MenuItem, Alert,
  Skeleton, InputAdornment, Menu, Tooltip, Switch, FormControlLabel,
} from '@mui/material'
import {
  ArrowBack, Add, Edit, Delete, ShoppingCart, CheckCircle,
  RadioButtonUnchecked, Close, ShoppingBag, Tune, DeleteForever,
  DoneAll, RemoveDone,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useBudgetStore } from '../store/budgetStore'
import { useInventoryStore } from '@/features/inventory/store/inventoryStore'

const UNITS = ['unidad', 'kg', 'g', 'L', 'ml', 'paquete', 'caja', 'botella', 'lata', 'bolsa', 'docena']

function SectionLabel({ children }) {
  return (
    <Typography variant="overline" color="text.disabled"
      sx={{ display: 'block', mb: 1.5, fontSize: '0.6875rem', letterSpacing: '0.08em', fontWeight: 700 }}>
      {children}
    </Typography>
  )
}

// ── Item row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, isEditor, onEdit, onDelete, onToggle, multiplyByQty }) {
  const estimated = multiplyByQty ? item.quantity * (item.estimated_price || 0) : (item.estimated_price || 0)
  const catColor = item.categories?.color

  return (
    <ListItem
      sx={{
        px: 2, py: 1.25,
        opacity: item.is_checked ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
      secondaryAction={
        isEditor && (
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <IconButton size="small" onClick={onEdit}><Edit sx={{ fontSize: 16 }} /></IconButton>
            <IconButton size="small" color="error" onClick={onDelete}><Delete sx={{ fontSize: 16 }} /></IconButton>
          </Box>
        )
      }
    >
      <Tooltip title={item.is_checked ? 'Desmarcar' : 'Marcar como completado'} placement="left">
        <IconButton size="small" onClick={onToggle} sx={{ mr: 1, flexShrink: 0 }}>
          {item.is_checked
            ? <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
            : <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 20 }} />
          }
        </IconButton>
      </Tooltip>
      <ListItemText
        primary={
          <Typography variant="body2" fontWeight={600} sx={{ textDecoration: item.is_checked ? 'line-through' : 'none' }}>
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
          </Box>
        }
      />
    </ListItem>
  )
}

// ── Budget item form dialog ──────────────────────────────────────────────────
function BudgetItemForm({ open, item, budgetId, categories, products, onClose }) {
  const { addBudgetItem, updateBudgetItem } = useBudgetStore()
  const { enqueueSnackbar } = useSnackbar()
  const isEdit = Boolean(item)

  const empty = { product_name: '', product_id: '', quantity: 1, estimated_price: '', unit: 'unidad', category_id: '', notes: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(item
        ? { product_name: item.product_name, product_id: item.product_id || '', quantity: item.quantity, estimated_price: item.estimated_price || '', unit: item.unit, category_id: item.category_id || '', notes: item.notes || '' }
        : empty
      )
    }
  }, [open, item])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleProductSelect = (productId) => {
    const p = products.find((x) => x.id === productId)
    if (p) setForm((f) => ({ ...f, product_id: productId, product_name: p.name, unit: p.unit, category_id: p.category_id || '' }))
    else setForm((f) => ({ ...f, product_id: '' }))
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
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Seleccionar del inventario</InputLabel>
          <Select
            value={form.product_id}
            label="Seleccionar del inventario"
            onChange={(e) => handleProductSelect(e.target.value)}
          >
            <MenuItem value=""><Typography color="text.secondary" variant="body2">Producto nuevo / sin vincular</Typography></MenuItem>
            {products.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {p.categories?.color && (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.categories.color, flexShrink: 0 }} />
                  )}
                  <Box>
                    <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                    <Typography variant="caption" color="text.disabled">{p.current_quantity} {p.unit} en stock</Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
    checkAllItems, uncheckAllItems, clearCheckedItems, clearAllItems,
  } = useBudgetStore()
  const { products, categories, fetchProducts, fetchCategories } = useInventoryStore()
  const { enqueueSnackbar } = useSnackbar()
  const [itemDialog, setItemDialog] = useState({ open: false, item: null })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [maintenanceAnchor, setMaintenanceAnchor] = useState(null)
  const [clearCheckedConfirm, setClearCheckedConfirm] = useState(false)
  const [clearAllConfirm, setClearAllConfirm] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [multiplyByQty, setMultiplyByQty] = useState(false)

  useEffect(() => {
    fetchBudgetWithItems(budgetId)
    if (currentWorkspace) {
      fetchProducts(currentWorkspace.id)
      fetchCategories(currentWorkspace.id)
    }
  }, [budgetId])

  const checked   = budgetItems.filter((i) => i.is_checked)
  const unchecked = budgetItems.filter((i) => !i.is_checked)

  const handleCheckAll = async () => {
    setMaintenanceAnchor(null)
    setBulkLoading(true)
    const { error } = await checkAllItems(budgetId)
    setBulkLoading(false)
    if (error) enqueueSnackbar('Error al actualizar', { variant: 'error' })
    else enqueueSnackbar('Todos los items marcados', { variant: 'success' })
  }

  const handleUncheckAll = async () => {
    setMaintenanceAnchor(null)
    setBulkLoading(true)
    const { error } = await uncheckAllItems(budgetId)
    setBulkLoading(false)
    if (error) enqueueSnackbar('Error al actualizar', { variant: 'error' })
    else enqueueSnackbar('Todos los items desmarcados', { variant: 'success' })
  }

  const handleClearChecked = async () => {
    setClearCheckedConfirm(false)
    setBulkLoading(true)
    const { error } = await clearCheckedItems(budgetId)
    setBulkLoading(false)
    if (error) enqueueSnackbar('Error al limpiar', { variant: 'error' })
    else enqueueSnackbar('Items completados eliminados', { variant: 'success' })
  }

  const handleClearAll = async () => {
    setClearAllConfirm(false)
    setBulkLoading(true)
    const { error } = await clearAllItems(budgetId)
    setBulkLoading(false)
    if (error) enqueueSnackbar('Error al vaciar', { variant: 'error' })
    else enqueueSnackbar('Lista vaciada', { variant: 'success' })
  }
  const totalEst  = multiplyByQty
    ? budgetItems.reduce((a, i) => a + (i.quantity * (i.estimated_price || 0)), 0)
    : budgetItems.reduce((a, i) => a + (i.estimated_price || 0), 0)
  const checkedEst = multiplyByQty
    ? checked.reduce((a, i) => a + (i.quantity * (i.estimated_price || 0)), 0)
    : checked.reduce((a, i) => a + (i.estimated_price || 0), 0)
  const budgetProgress = currentBudget?.target_amount
    ? Math.min((checkedEst / currentBudget.target_amount) * 100, 100)
    : 0
  const overBudget = currentBudget?.target_amount && checkedEst > currentBudget.target_amount

  const isEditor = ['owner', 'editor'].includes(currentWorkspace?.my_role)
  const statusMeta = STATUS_META[currentBudget?.status] || STATUS_META.draft

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
          { label: 'Items total',    value: budgetItems.length,       color: '#6366f1' },
          { label: 'Completados',    value: checked.length,           color: '#10b981' },
          { label: 'Est. total',     value: `S/${totalEst.toFixed(0)}`, color: '#71717a' },
          { label: 'Est. completado', value: `S/${checkedEst.toFixed(0)}`, color: overBudget ? '#f43f5e' : '#f59e0b' },
        ].map((s) => (
          <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
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
            <Typography variant="body2" fontWeight={600}>Progreso vs. presupuesto</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color={overBudget ? 'error.main' : 'text.primary'}>
                S/{checkedEst.toFixed(0)}
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
              ⚠ Superaste el presupuesto por S/{(checkedEst - currentBudget.target_amount).toFixed(0)}
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
              {checked.length}/{budgetItems.length} completados
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                  <Box sx={{ px: 2, py: 1, pb: 0.5 }}>
                    <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6875rem' }}>
                      ACCIONES MASIVAS
                    </Typography>
                  </Box>
                  <MenuItem onClick={handleCheckAll} disabled={unchecked.length === 0}>
                    <DoneAll sx={{ fontSize: 17, mr: 1.25, color: 'success.main' }} />
                    Marcar todos como completados
                  </MenuItem>
                  <MenuItem onClick={handleUncheckAll} disabled={checked.length === 0}>
                    <RemoveDone sx={{ fontSize: 17, mr: 1.25, color: 'text.secondary' }} />
                    Desmarcar todos
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    onClick={() => { setMaintenanceAnchor(null); setClearCheckedConfirm(true) }}
                    disabled={checked.length === 0}
                  >
                    <Delete sx={{ fontSize: 17, mr: 1.25, color: 'warning.main' }} />
                    Limpiar completados
                    {checked.length > 0 && (
                      <Chip size="small" label={checked.length} sx={{ ml: 'auto', height: 18, fontSize: '0.6875rem', bgcolor: 'rgba(245,158,11,0.12)', color: 'warning.main' }} />
                    )}
                  </MenuItem>
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
            <Button startIcon={<Add />} size="small" variant="outlined" onClick={() => setItemDialog({ open: true, item: null })}>
              Agregar
            </Button>
          </Box>
        )}
        </Box>
      </Box>

      <Card>
        {budgetItems.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
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
            {/* Pending items */}
            {unchecked.map((item, i) => (
              <Box key={item.id}>
                <ItemRow
                  item={item}
                  isEditor={isEditor}
                  multiplyByQty={multiplyByQty}
                  onToggle={() => updateBudgetItem(item.id, { is_checked: true })}
                  onEdit={() => setItemDialog({ open: true, item })}
                  onDelete={() => setDeleteConfirm(item)}
                />
                {(i < unchecked.length - 1 || checked.length > 0) && <Divider sx={{ mx: 2 }} />}
              </Box>
            ))}

            {/* Divider for checked section */}
            {checked.length > 0 && unchecked.length > 0 && (
              <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.disabled" fontWeight={700}>
                  COMPLETADOS ({checked.length})
                </Typography>
              </Box>
            )}

            {/* Checked items */}
            {checked.map((item, i) => (
              <Box key={item.id}>
                <ItemRow
                  item={item}
                  isEditor={isEditor}
                  multiplyByQty={multiplyByQty}
                  onToggle={() => updateBudgetItem(item.id, { is_checked: false })}
                  onEdit={() => setItemDialog({ open: true, item })}
                  onDelete={() => setDeleteConfirm(item)}
                />
                {i < checked.length - 1 && <Divider sx={{ mx: 2 }} />}
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

      {/* Clear checked items */}
      <Dialog open={clearCheckedConfirm} onClose={() => setClearCheckedConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: 'rgba(245,158,11,0.1)', borderRadius: 2, color: 'warning.main', display: 'flex' }}>
              <Delete sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Limpiar completados</Typography>
              <Typography variant="body2" color="text.secondary">{checked.length} item{checked.length !== 1 ? 's' : ''} se eliminarán</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Se eliminarán todos los items marcados como completados. Los items pendientes no se verán afectados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearCheckedConfirm(false)}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={handleClearChecked}>
            Limpiar completados
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
    </Box>
  )
}
