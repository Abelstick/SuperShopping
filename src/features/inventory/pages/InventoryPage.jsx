import { useState, useEffect } from 'react'
import {
  Box, Button, Card, Typography, TextField,
  InputAdornment, Chip, IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, FormControl, InputLabel, ToggleButtonGroup,
  ToggleButton, Skeleton, Divider, Tab, Tabs, LinearProgress, Alert,
  Tooltip, CircularProgress, useTheme,
} from '@mui/material'
import {
  Add, Search, ViewList, ViewModule, MoreVert, Edit,
  DeleteForever, History, Category, Inventory2, VisibilityOff, Visibility,
  Warning, ErrorOutlined,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import StockBadge from '@/shared/components/StockBadge'
import ProductForm from '../components/ProductForm'
import CategoryManager from '../components/CategoryManager'
import ProductHistoryDrawer from '../components/ProductHistoryDrawer'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const NUM = { fontVariantNumeric: 'tabular-nums' }
const STATUS_LABELS = { active: 'Activos', inactive: 'Inactivos', low_stock: 'Stock bajo' }
const NO_FILTERS = { search: '', categoryId: '', status: 'all' }

const isLowStock = (p) => p.current_quantity <= p.min_quantity && p.min_quantity > 0

// Cada bloque entra una sola vez, escalonado (único momento orquestado)
const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

// Fechas dd/mm/aaaa a partir de 30 días
function relativeTime(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Piezas compartidas ───────────────────────────────────────────────────────

function InactiveMark() {
  return (
    <Tooltip title="Inactivo">
      <Box component="span" role="img" tabIndex={0} aria-label="Inactivo" sx={{ display: 'inline-flex', color: 'text.secondary', borderRadius: '8px', flexShrink: 0 }}>
        <VisibilityOff sx={{ fontSize: 20 }} />
      </Box>
    </Tooltip>
  )
}

// Acciones por fila: siempre en la misma posición (arriba/derecha)
function ProductMenu({ product, onEdit, onHistory, onDeactivate, onReactivate, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const close = () => setAnchorEl(null)
  return (
    <>
      <IconButton aria-label={`Acciones de ${product.name}`} onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget) }} sx={{ flexShrink: 0 }}>
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
        <MenuItem onClick={() => { close(); onEdit() }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { close(); onHistory() }}>
          <ListItemIcon><History fontSize="small" /></ListItemIcon><ListItemText>Historial</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        {product.is_active ? (
          <MenuItem onClick={() => { close(); onDeactivate() }}>
            <ListItemIcon><VisibilityOff fontSize="small" /></ListItemIcon><ListItemText>Desactivar</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => { close(); onReactivate() }}>
            <ListItemIcon><Visibility fontSize="small" /></ListItemIcon><ListItemText>Reactivar</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { close(); onDelete() }}>
          <ListItemIcon><DeleteForever fontSize="small" /></ListItemIcon><ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

// ── Hero: productos con stock bajo (o, si no hay, productos activos) ─────────
function InventoryHero({ loading, lowCount, activeCount }) {
  const theme = useTheme()
  const st = theme.palette.stock
  const low = lowCount > 0
  const skin = low ? st.agotado : st.saludable
  const Icon = low ? ErrorOutlined : Inventory2

  return (
    <Card sx={{ bgcolor: loading ? 'background.paper' : skin.tint, borderColor: loading ? 'divider' : skin.line, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, flexWrap: 'wrap' }}>
      {loading ? (
        <Box sx={{ width: '100%' }}>
          <Skeleton variant="text" width="40%" sx={{ fontSize: FS.hero }} />
          <Skeleton variant="text" width="30%" sx={{ fontSize: FS.body }} />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon sx={{ fontSize: 32, color: skin.icon }} />
            <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: skin.text }}>
              {low ? lowCount : activeCount}
              <Box component="span" sx={{ fontSize: FS.title, fontWeight: 700, ml: 1 }}>
                {low ? 'con stock bajo' : 'productos activos'}
              </Box>
            </Typography>
          </Box>
          {low && (
            <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 600 }}>
              {activeCount} productos activos
            </Typography>
          )}
        </>
      )}
    </Card>
  )
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, isEditor, onEdit, onDeactivate, onReactivate, onDelete, onHistory }) {
  const theme = useTheme()
  const st = theme.palette.stock
  const catColor = product.categories?.color || theme.palette.text.disabled
  const stockPct = product.min_quantity > 0
    ? Math.min((product.current_quantity / (product.min_quantity * 3)) * 100, 100)
    : 100
  const isLow = isLowStock(product)

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, gap: 2, bgcolor: product.is_active ? 'background.paper' : 'action.hover', borderStyle: product.is_active ? 'solid' : 'dashed' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: 700, lineHeight: 1.4 }} noWrap>{product.name}</Typography>
            {!product.is_active && <InactiveMark />}
          </Box>
          {product.categories && (
            <Box sx={{ mt: 1, display: 'inline-flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: catColor }} />
              <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 600 }}>{product.categories.name}</Typography>
            </Box>
          )}
        </Box>
        {isEditor && (
          <ProductMenu product={product} onEdit={onEdit} onHistory={onHistory} onDeactivate={onDeactivate} onReactivate={onReactivate} onDelete={onDelete} />
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Stock actual</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.2, color: isLow ? st.agotado.text : 'text.primary' }}>
              {product.current_quantity}
            </Typography>
            <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{product.unit}</Typography>
          </Box>
        </Box>
        <LinearProgress
          aria-hidden
          variant="determinate"
          value={stockPct}
          sx={{ height: 8, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: isLow ? st.agotado.icon : 'primary.main' } }}
        />
        {isLow && (
          <Box><StockBadge>Stock bajo (mín {product.min_quantity} {product.unit})</StockBadge></Box>
        )}
        {product.updated_at && (
          <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
            Actualizado {relativeTime(product.updated_at)}
          </Typography>
        )}
      </Box>
    </Card>
  )
}

// ── Product Row ───────────────────────────────────────────────────────────────
function ProductRow({ product, isEditor, divider, onEdit, onDeactivate, onReactivate, onDelete, onHistory }) {
  const theme = useTheme()
  const st = theme.palette.stock
  const catColor = product.categories?.color || theme.palette.text.disabled
  const isLow = isLowStock(product)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 1, minHeight: 72, gap: 2, bgcolor: product.is_active ? 'transparent' : 'action.hover' }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: catColor, flexShrink: 0 }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{product.name}</Typography>
            {!product.is_active && <InactiveMark />}
          </Box>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>
            {product.categories?.name}{product.categories?.aisle ? ` · Pasillo ${product.categories.aisle}` : ''}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, color: isLow ? st.agotado.text : 'text.primary' }}>
            {product.current_quantity}{' '}
            <Typography component="span" sx={{ fontSize: FS.meta, color: 'text.secondary', fontWeight: 400 }}>{product.unit}</Typography>
          </Typography>
          {isLow && <StockBadge>Stock bajo</StockBadge>}
          {product.updated_at && (
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{relativeTime(product.updated_at)}</Typography>
          )}
        </Box>
        {isEditor && (
          <ProductMenu product={product} onEdit={onEdit} onHistory={onHistory} onDeactivate={onDeactivate} onReactivate={onReactivate} onDelete={onDelete} />
        )}
      </Box>
      {divider && <Divider sx={{ mx: 3 }} />}
    </Box>
  )
}

// ── Diálogos de confirmación ─────────────────────────────────────────────────
function DeleteConfirmDialog({ product, onClose, onConfirm, loading }) {
  if (!product) return null
  return (
    <Dialog open onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, bgcolor: 'error.main', borderRadius: '8px', color: 'error.contrastText', display: 'flex' }}>
            <DeleteForever sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography component="span" sx={{ display: 'block', fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Eliminar producto</Typography>
            <Typography component="span" sx={{ display: 'block', fontSize: FS.body, fontWeight: 400, color: 'text.secondary' }}>Esta acción es permanente</Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          Esta acción <strong>no se puede deshacer</strong>. El producto será eliminado del sistema junto con su historial.
        </Alert>
        <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
          ¿Confirmas que deseas eliminar <strong>"{product.name}"</strong>?
        </Typography>
        <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', mt: 1, display: 'block' }}>
          Si solo quieres ocultarlo, usa "Desactivar" en su lugar.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const theme = useTheme()
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const {
    products, categories, loading, filters, setFilters,
    fetchProducts, fetchCategories, deleteProduct, hardDeleteProduct, updateProduct, getFilteredProducts,
  } = useInventoryStore()
  const { refreshSignal } = useAppStore()
  const { enqueueSnackbar } = useSnackbar()
  const [view, setView] = useState('grid')
  const [tab, setTab] = useState(0)
  const [productDialog, setProductDialog] = useState({ open: false, product: null })
  const [historyDrawer, setHistoryDrawer] = useState({ open: false, product: null })
  const [deactivateConfirm, setDeactivateConfirm] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)

  // Mismas dos cargas de siempre; ahora se recoge el `{ error }` que ya devuelven
  useEffect(() => {
    if (!currentWorkspace) return
    let cancelled = false
    Promise.all([fetchProducts(currentWorkspace.id), fetchCategories(currentWorkspace.id)])
      .then((results) => {
        if (cancelled) return
        const failed = results.find((r) => r?.error)
        setLoadError(failed ? { message: failed.error.message || 'Sin detalle del servidor' } : null)
      })
      .catch((e) => { if (!cancelled) setLoadError({ message: e?.message || 'Sin detalle del servidor' }) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, refreshSignal, retryTick])

  const filtered = getFilteredProducts()
  const isEditor = ['owner', 'editor'].includes(currentWorkspace?.my_role)
  const activeCount = products.filter((p) => p.is_active).length
  const lowCount = products.filter((p) => p.is_active && p.current_quantity <= p.min_quantity && p.min_quantity > 0).length

  const hasFilters = Boolean(filters.search || filters.categoryId || filters.status !== 'all')
  const selectedCategory = categories.find((c) => c.id === filters.categoryId)
  const activeChips = [
    filters.search && { key: 'search', label: `"${filters.search}"`, clear: { search: '' } },
    filters.categoryId && { key: 'categoryId', label: selectedCategory?.name || 'Categoría', clear: { categoryId: '' } },
    filters.status !== 'all' && { key: 'status', label: STATUS_LABELS[filters.status], clear: { status: 'all' } },
  ].filter(Boolean)

  const handleDeactivate = async () => {
    setDeactivating(true)
    const { error } = await deleteProduct(deactivateConfirm.id, currentWorkspace.id, user.id)
    setDeactivating(false)
    if (error) enqueueSnackbar('Error al desactivar', { variant: 'error' })
    else enqueueSnackbar('Producto desactivado', { variant: 'success' })
    setDeactivateConfirm(null)
  }

  // Reactivar reutiliza updateProduct: vuelve a poner is_active en true y queda en el historial
  const handleReactivate = async (product) => {
    const { error } = await updateProduct(product.id, { is_active: true }, currentWorkspace.id, user.id)
    if (error) enqueueSnackbar('Error al reactivar', { variant: 'error' })
    else enqueueSnackbar('Producto reactivado', { variant: 'success' })
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await hardDeleteProduct(deleteConfirm.id)
    setDeleting(false)
    if (error) enqueueSnackbar('No se pudo eliminar. El producto tiene historial vinculado.', { variant: 'error' })
    else enqueueSnackbar('Producto eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const openNew = () => setProductDialog({ open: true, product: null })
  const rowActions = (p) => ({
    isEditor,
    onEdit: () => setProductDialog({ open: true, product: p }),
    onDeactivate: () => setDeactivateConfirm(p),
    onReactivate: () => handleReactivate(p),
    onDelete: () => setDeleteConfirm(p),
    onHistory: () => setHistoryDrawer({ open: true, product: p }),
  })

  const showSkeleton = loading && products.length === 0
  const failedWithoutData = Boolean(loadError) && products.length === 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header: título + única acción primaria */}
      <Box {...reveal(0)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>Inventario</Typography>
        {isEditor && (
          <Button startIcon={<Add />} variant={tab === 0 ? 'contained' : 'outlined'} onClick={openNew}>
            Nuevo producto
          </Button>
        )}
      </Box>

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      {/* Nivel 1: dato hero */}
      <Box {...reveal(1)}>
        <InventoryHero loading={showSkeleton} lowCount={lowCount} activeCount={activeCount} />
      </Box>

      {/* Tabs */}
      <Box {...reveal(2)}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<Inventory2 sx={{ fontSize: 20 }} />} label="Productos" iconPosition="start" />
          <Tab icon={<Category sx={{ fontSize: 20 }} />} label="Categorías" iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box {...reveal(3)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Filtros */}
          <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                label="Buscar productos"
                size="small"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment> } }}
                sx={{ minWidth: 200, flexGrow: 1, maxWidth: 360 }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="inv-cat-label">Categoría</InputLabel>
                <Select labelId="inv-cat-label" value={filters.categoryId} label="Categoría" onChange={(e) => setFilters({ categoryId: e.target.value })}>
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
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="inv-status-label">Estado</InputLabel>
                <Select labelId="inv-status-label" value={filters.status} label="Estado" onChange={(e) => setFilters({ status: e.target.value })}>
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="active">Activos</MenuItem>
                  <MenuItem value="inactive">Inactivos</MenuItem>
                  <MenuItem value="low_stock">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warning sx={{ fontSize: 16, color: 'text.secondary' }} />
                      Stock bajo
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small" sx={{ ml: { md: 'auto' } }}>
                <ToggleButton value="grid" aria-label="Vista de tarjetas"><ViewModule sx={{ fontSize: 20 }} /></ToggleButton>
                <ToggleButton value="list" aria-label="Vista de lista"><ViewList sx={{ fontSize: 20 }} /></ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Filtros activos: chips removibles + limpiar */}
            {hasFilters && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {activeChips.map((c) => (
                  <Chip
                    key={c.key}
                    label={c.label}
                    aria-label={`Quitar filtro ${c.label}`}
                    onDelete={() => setFilters(c.clear)}
                    sx={{ bgcolor: 'action.selected', color: 'primary.main', '& .MuiChip-deleteIcon': { color: 'primary.main' } }}
                  />
                ))}
                <Button onClick={() => setFilters(NO_FILTERS)} sx={{ color: 'text.secondary' }}>Limpiar filtros</Button>
              </Box>
            )}
          </Card>

          {products.length > 0 && (
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
              Mostrando {filtered.length} de {products.length}
            </Typography>
          )}

          {/* Contenido */}
          {showSkeleton ? (
            view === 'grid' ? (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="rectangular" height={188} sx={{ borderRadius: '12px' }} />)}
              </Box>
            ) : (
              <Card>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, minHeight: 72 }}>
                    <Skeleton variant="circular" width={12} height={12} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton variant="text" width="40%" sx={{ fontSize: FS.body }} />
                      <Skeleton variant="text" width="25%" sx={{ fontSize: FS.meta }} />
                    </Box>
                    <Skeleton variant="text" width={56} sx={{ fontSize: FS.body }} />
                  </Box>
                ))}
              </Card>
            )
          ) : failedWithoutData ? null : products.length === 0 ? (
            <EmptyState
              icon={<Inventory2 sx={{ fontSize: 28 }} />}
              title="Sin productos"
              body="Agrega tu primer producto al inventario"
              action={isEditor && <Button variant="contained" startIcon={<Add />} onClick={openNew}>Agregar producto</Button>}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search sx={{ fontSize: 28 }} />}
              title="Sin resultados"
              body="Ningún producto coincide con los filtros aplicados."
              action={<Button variant="outlined" onClick={() => setFilters(NO_FILTERS)}>Limpiar filtros</Button>}
            />
          ) : view === 'grid' ? (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {filtered.map((p) => <ProductCard key={p.id} product={p} {...rowActions(p)} />)}
            </Box>
          ) : (
            <Card>
              {filtered.map((p, i) => (
                <ProductRow key={p.id} product={p} divider={i < filtered.length - 1} {...rowActions(p)} />
              ))}
            </Card>
          )}
        </Box>
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
      <Dialog open={Boolean(deactivateConfirm)} onClose={deactivating ? undefined : () => setDeactivateConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: theme.palette.stock.riesgo.tint, border: 1, borderColor: theme.palette.stock.riesgo.line, borderRadius: '8px', color: theme.palette.stock.riesgo.icon, display: 'flex' }}>
              <VisibilityOff sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography component="span" sx={{ display: 'block', fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Desactivar producto</Typography>
              <Typography component="span" sx={{ display: 'block', fontSize: FS.body, fontWeight: 400, color: 'text.secondary' }}>El producto quedará oculto</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
            ¿Desactivar <strong>"{deactivateConfirm?.name}"</strong>? Podrás reactivarlo filtrando por "Inactivos".
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateConfirm(null)} disabled={deactivating}>Cancelar</Button>
          <Button variant="contained" onClick={handleDeactivate} disabled={deactivating}
            startIcon={deactivating ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Desactivar
          </Button>
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
