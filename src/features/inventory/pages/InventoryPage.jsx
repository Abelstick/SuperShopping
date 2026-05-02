import { useState, useEffect } from 'react'
import {
  Box, Button, Card, Typography, Grid, TextField,
  InputAdornment, Chip, IconButton, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, FormControl, InputLabel, ToggleButtonGroup,
  ToggleButton, Skeleton, Divider, Tab, Tabs, LinearProgress, Alert,
} from '@mui/material'
import {
  Add, Search, ViewList, ViewModule, MoreVert, Edit,
  DeleteForever, History, Category, Inventory2, VisibilityOff,
  Delete,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useAppStore } from '@/store/appStore'
import ProductForm from '../components/ProductForm'
import CategoryManager from '../components/CategoryManager'
import ProductHistoryDrawer from '../components/ProductHistoryDrawer'

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, isEditor, onEdit, onDeactivate, onDelete, onHistory }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const catColor = product.categories?.color || '#a1a1aa'
  const stockPct = product.min_quantity > 0
    ? Math.min((product.current_quantity / (product.min_quantity * 3)) * 100, 100)
    : 100
  const isLow = product.current_quantity <= product.min_quantity && product.min_quantity > 0

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: product.is_active ? 1 : 0.55,
        overflow: 'hidden',
        '&:hover': { borderColor: catColor + '66' },
        transition: 'border-color 0.15s',
      }}
    >
      <Box sx={{ height: 3, bgcolor: catColor, flexShrink: 0 }} />
      <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0, mr: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{product.name}</Typography>
            {product.categories && (
              <Chip
                size="small"
                label={product.categories.name}
                sx={{
                  mt: 0.5, height: 20, fontSize: '0.6875rem',
                  bgcolor: catColor + '18', color: catColor,
                  border: `1px solid ${catColor}33`, fontWeight: 600,
                }}
              />
            )}
          </Box>
          {isEditor && (
            <>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget) }} sx={{ mt: -0.5 }}>
                <MoreVert fontSize="small" />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => { setAnchorEl(null); onEdit() }}>
                  <Edit fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />Editar
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); onHistory() }}>
                  <History fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />Historial
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => { setAnchorEl(null); onDeactivate() }} sx={{ color: 'warning.main' }}>
                  <VisibilityOff fontSize="small" sx={{ mr: 1.25 }} />Desactivar
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); onDelete() }} sx={{ color: 'error.main' }}>
                  <DeleteForever fontSize="small" sx={{ mr: 1.25 }} />Eliminar
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
        <Box sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
            <Typography variant="caption" color="text.secondary">Stock actual</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1, color: isLow ? 'error.main' : 'text.primary' }}>
                {product.current_quantity}
              </Typography>
              <Typography variant="caption" color="text.secondary">{product.unit}</Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={stockPct}
            sx={{
              height: 5,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                background: isLow
                  ? 'linear-gradient(90deg, #f43f5e, #e11d48)'
                  : `linear-gradient(90deg, ${catColor}88, ${catColor})`,
              },
            }}
          />
          {isLow && (
            <Typography variant="caption" color="error.main" fontWeight={600} sx={{ mt: 0.5, display: 'block' }}>
              ⚠ Bajo mínimo ({product.min_quantity} {product.unit})
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  )
}

// ── Product Row ───────────────────────────────────────────────────────────────
function ProductRow({ product, isEditor, divider, onEdit, onDeactivate, onDelete, onHistory }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const catColor = product.categories?.color || '#a1a1aa'
  const isLow = product.current_quantity <= product.min_quantity && product.min_quantity > 0

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 2, opacity: product.is_active ? 1 : 0.55 }}>
        <Box sx={{ width: 3, height: 36, borderRadius: 1, bgcolor: catColor, flexShrink: 0 }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{product.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {product.categories?.name}{product.categories?.aisle ? ` · Pasillo ${product.categories.aisle}` : ''}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="body2" fontWeight={700} color={isLow ? 'error.main' : 'text.primary'}>
            {product.current_quantity}{' '}
            <Typography component="span" variant="caption" color="text.secondary">{product.unit}</Typography>
          </Typography>
          {isLow && <Typography variant="caption" color="error.main" display="block">Bajo stock</Typography>}
        </Box>
        {isEditor && (
          <>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { setAnchorEl(null); onEdit() }}>
                <Edit fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />Editar
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); onHistory() }}>
                <History fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />Historial
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={() => { setAnchorEl(null); onDeactivate() }} sx={{ color: 'warning.main' }}>
                <VisibilityOff fontSize="small" sx={{ mr: 1.25 }} />Desactivar
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); onDelete() }} sx={{ color: 'error.main' }}>
                <DeleteForever fontSize="small" sx={{ mr: 1.25 }} />Eliminar
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
      {divider && <Divider sx={{ mx: 2 }} />}
    </Box>
  )
}

// ── Delete confirm dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({ product, onClose, onConfirm, loading }) {
  if (!product) return null
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, bgcolor: 'rgba(244,63,94,0.1)', borderRadius: 2, color: 'error.main', display: 'flex' }}>
            <DeleteForever sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>Eliminar producto</Typography>
            <Typography variant="body2" color="text.secondary">Esta acción es permanente</Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          Esta acción <strong>no se puede deshacer</strong>. El producto será eliminado del sistema junto con su historial.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          ¿Confirmas que deseas eliminar <strong>"{product.name}"</strong>?
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
          Si solo quieres ocultarlo, usa "Desactivar" en su lugar.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}>
          {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const {
    products, categories, loading, filters, setFilters,
    fetchProducts, fetchCategories, deleteProduct, hardDeleteProduct, getFilteredProducts,
  } = useInventoryStore()
  const { refreshSignal } = useAppStore()
  const { enqueueSnackbar } = useSnackbar()
  const [view, setView] = useState('grid')
  const [tab, setTab] = useState(0)
  const [productDialog, setProductDialog] = useState({ open: false, product: null })
  const [historyDrawer, setHistoryDrawer] = useState({ open: false, product: null })
  const [deactivateConfirm, setDeactivateConfirm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (currentWorkspace) {
      fetchProducts(currentWorkspace.id)
      fetchCategories(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, refreshSignal])

  const filtered = getFilteredProducts()
  const isEditor = ['owner', 'editor'].includes(currentWorkspace?.my_role)
  const lowCount = products.filter((p) => p.is_active && p.current_quantity <= p.min_quantity && p.min_quantity > 0).length

  const handleDeactivate = async () => {
    const { error } = await deleteProduct(deactivateConfirm.id, currentWorkspace.id, user.id)
    if (error) enqueueSnackbar('Error al desactivar', { variant: 'error' })
    else enqueueSnackbar('Producto desactivado', { variant: 'success' })
    setDeactivateConfirm(null)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await hardDeleteProduct(deleteConfirm.id)
    setDeleting(false)
    if (error) enqueueSnackbar('No se pudo eliminar. El producto tiene historial vinculado.', { variant: 'error' })
    else enqueueSnackbar('Producto eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>Inventario</Typography>
          <Typography variant="body2" color="text.secondary">
            {products.filter((p) => p.is_active).length} productos activos
            {lowCount > 0 && (
              <Box component="span" sx={{ color: 'error.main', fontWeight: 600, ml: 1 }}>
                · {lowCount} con stock bajo
              </Box>
            )}
          </Typography>
        </Box>
        {isEditor && (
          <Button startIcon={<Add />} variant="contained" onClick={() => setProductDialog({ open: true, product: null })}>
            Nuevo producto
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', minHeight: 40 }}>
        <Tab icon={<Inventory2 sx={{ fontSize: 17 }} />} label="Productos" iconPosition="start" sx={{ minHeight: 40 }} />
        <Tab icon={<Category sx={{ fontSize: 17 }} />} label="Categorías" iconPosition="start" sx={{ minHeight: 40 }} />
      </Tabs>

      {tab === 0 && (
        <>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Buscar productos…"
              size="small"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
              sx={{ minWidth: 200, flexGrow: 1, maxWidth: 340 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Categoría</InputLabel>
              <Select value={filters.categoryId} label="Categoría" onChange={(e) => setFilters({ categoryId: e.target.value })}>
                <MenuItem value="">Todas</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color }} />
                      {c.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Estado</InputLabel>
              <Select value={filters.status} label="Estado" onChange={(e) => setFilters({ status: e.target.value })}>
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Activos</MenuItem>
                <MenuItem value="inactive">Inactivos</MenuItem>
              </Select>
            </FormControl>
            <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small" sx={{ ml: 'auto' }}>
              <ToggleButton value="grid"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
              <ToggleButton value="list"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Content */}
          {loading ? (
            <Grid container spacing={2}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <Skeleton variant="rectangular" height={148} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
              <Inventory2 sx={{ fontSize: 52, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>Sin productos</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                {filters.search || filters.categoryId ? 'Prueba con otros filtros' : 'Agrega tu primer producto al inventario'}
              </Typography>
              {isEditor && !filters.search && (
                <Button variant="contained" startIcon={<Add />} onClick={() => setProductDialog({ open: true, product: null })}>
                  Agregar producto
                </Button>
              )}
            </Box>
          ) : view === 'grid' ? (
            <Grid container spacing={2}>
              {filtered.map((p) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={p.id}>
                  <ProductCard
                    product={p}
                    isEditor={isEditor}
                    onEdit={() => setProductDialog({ open: true, product: p })}
                    onDeactivate={() => setDeactivateConfirm(p)}
                    onDelete={() => setDeleteConfirm(p)}
                    onHistory={() => setHistoryDrawer({ open: true, product: p })}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card>
              {filtered.map((p, i) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  isEditor={isEditor}
                  divider={i < filtered.length - 1}
                  onEdit={() => setProductDialog({ open: true, product: p })}
                  onDeactivate={() => setDeactivateConfirm(p)}
                  onDelete={() => setDeleteConfirm(p)}
                  onHistory={() => setHistoryDrawer({ open: true, product: p })}
                />
              ))}
            </Card>
          )}
        </>
      )}

      {tab === 1 && <CategoryManager workspaceId={currentWorkspace?.id} isEditor={isEditor} />}

      <ProductForm
        open={productDialog.open}
        product={productDialog.product}
        categories={categories}
        workspaceId={currentWorkspace?.id}
        userId={user?.id}
        onClose={() => setProductDialog({ open: false, product: null })}
      />
      <ProductHistoryDrawer
        open={historyDrawer.open}
        product={historyDrawer.product}
        onClose={() => setHistoryDrawer({ open: false, product: null })}
      />

      {/* Deactivate confirm */}
      <Dialog open={Boolean(deactivateConfirm)} onClose={() => setDeactivateConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: 'rgba(245,158,11,0.1)', borderRadius: 2, color: 'warning.main', display: 'flex' }}>
              <VisibilityOff sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Desactivar producto</Typography>
              <Typography variant="body2" color="text.secondary">El producto quedará oculto</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Desactivar <strong>"{deactivateConfirm?.name}"</strong>? Podrás reactivarlo filtrando por "Inactivos".
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={handleDeactivate}>Desactivar</Button>
        </DialogActions>
      </Dialog>

      {/* Hard delete confirm */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          product={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </Box>
  )
}
