import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, ButtonBase, Card, Typography, TextField,
  InputAdornment, IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  ToggleButtonGroup, ToggleButton, Skeleton, Divider, Tab, Tabs,
  Tooltip, useMediaQuery, useTheme,
} from '@mui/material'
import {
  Add, Search, ViewList, ViewModule, MoreVert, Edit, Remove, Close,
  DeleteForever, History, Category, Inventory2, VisibilityOff, Visibility,
  Warning,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import StockBadge from '@/shared/components/StockBadge'
import { CategoryIcon, ChipRow, ConfirmDialog, FilterChip, PageHeader, PrimaryAction, RowDivider } from '@/shared/components/ui'
import { roundQty, stepFor } from '@/shared/utils/quantity'
import { LOCALE } from '@/shared/utils/format'
import ProductForm from '../components/ProductForm'
import CategoryManager from '../components/CategoryManager'
import ProductHistoryDrawer from '../components/ProductHistoryDrawer'
import { FS, NUM, reveal } from '@/theme/tokens'
import { canEditRole, canManageRole } from '@/features/workspace/constants'

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'low_stock', label: 'Stock bajo' },
  { key: 'inactive', label: 'Inactivos' },
]
const NO_FILTERS = { search: '', categoryId: '', status: 'all' }

const isLowStock = (p) => p.current_quantity <= p.min_quantity && p.min_quantity > 0
const isAtRisk = (p) => p.min_quantity > 0 && p.current_quantity > p.min_quantity && p.current_quantity <= p.min_quantity * 2

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
  return new Date(dateStr).toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Nivel de stock frente al mínimo: la barra se llena al triple del mínimo
function StockLevel({ product, width = '100%' }) {
  const st = useTheme().vars.palette.stock
  const pct = product.min_quantity > 0 ? Math.min(product.current_quantity / (product.min_quantity * 3), 1) : 1
  const fill = isLowStock(product) ? st.agotado.icon : isAtRisk(product) ? st.riesgo.icon : 'primary.main'
  return (
    <Box aria-hidden sx={{ height: 4, width, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden', flexShrink: 0 }}>
      <Box sx={{ height: '100%', width: '100%', borderRadius: 99, bgcolor: fill, transform: `scaleX(${pct})`, transformOrigin: 'left', transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
    </Box>
  )
}

function InactiveMark() {
  return (
    <Tooltip title="Inactivo">
      <Box component="span" role="img" tabIndex={0} aria-label="Inactivo" sx={{ display: 'inline-flex', color: 'text.secondary', borderRadius: '8px', flexShrink: 0 }}>
        <VisibilityOff sx={{ fontSize: 18 }} />
      </Box>
    </Tooltip>
  )
}

function ProductActionsMenu({ product, anchorEl, onClose, onEdit, onHistory, onDeactivate, onReactivate, onDelete }) {
  const run = (fn) => () => { onClose(); fn() }
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <MenuItem onClick={run(onEdit)}>
        <ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Editar</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(onHistory)}>
        <ListItemIcon><History fontSize="small" /></ListItemIcon><ListItemText>Historial</ListItemText>
      </MenuItem>
      <Divider sx={{ my: 0.5 }} />
      {product.is_active ? (
        <MenuItem onClick={run(onDeactivate)}>
          <ListItemIcon><VisibilityOff fontSize="small" /></ListItemIcon><ListItemText>Desactivar</ListItemText>
        </MenuItem>
      ) : (
        <MenuItem onClick={run(onReactivate)}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon><ListItemText>Reactivar</ListItemText>
        </MenuItem>
      )}
      {onDelete && (
        <MenuItem onClick={run(onDelete)}>
          <ListItemIcon><DeleteForever fontSize="small" /></ListItemIcon><ListItemText>Eliminar</ListItemText>
        </MenuItem>
      )}
    </Menu>
  )
}

// Ajuste rápido del stock: + al reponer, − al consumir, sin abrir el formulario
function QuickStock({ product, busy, onAdjust }) {
  const canDecrease = Number(product.current_quantity) > 0
  return (
    <Box role="group" aria-label={`Ajustar stock de ${product.name}`} sx={{ display: 'inline-flex', border: 1, borderColor: 'divider', borderRadius: '10px', flexShrink: 0 }}>
      <IconButton aria-label={`Restar stock de ${product.name}`} disabled={busy || !canDecrease} onClick={(e) => { e.stopPropagation(); onAdjust(product, -1) }} sx={{ width: 44, height: 44 }}>
        <Remove fontSize="small" />
      </IconButton>
      <IconButton aria-label={`Sumar stock de ${product.name}`} disabled={busy} onClick={(e) => { e.stopPropagation(); onAdjust(product, 1) }} sx={{ width: 44, height: 44 }}>
        <Add fontSize="small" />
      </IconButton>
    </Box>
  )
}

function StockAmount({ product, size = FS.body }) {
  const st = useTheme().vars.palette.stock
  const low = isLowStock(product)
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5, minWidth: 0 }}>
      <Typography component="span" sx={{ ...NUM, fontSize: size, fontWeight: 700, color: low ? st.agotado.text : isAtRisk(product) ? st.riesgo.text : 'text.primary' }}>
        {product.current_quantity}
      </Typography>
      <Typography component="span" sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{product.unit}</Typography>
    </Box>
  )
}

// ── Vista de cuadrícula (tablet y escritorio) ────────────────────────────────
function ProductCard({ product, isEditor, busy, onAdjust, onEdit, onDeactivate, onReactivate, onDelete, onHistory }) {
  const [anchorEl, setAnchorEl] = useState(null)
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1.5, bgcolor: product.is_active ? 'background.paper' : 'action.hover', borderStyle: product.is_active ? 'solid' : 'dashed' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <CategoryIcon category={product.categories} size={40} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35 }} noWrap>{product.name}</Typography>
            {!product.is_active && <InactiveMark />}
          </Box>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>
            {product.categories?.name}{product.categories?.aisle ? ` · Pasillo ${product.categories.aisle}` : ''}
          </Typography>
        </Box>
        {isEditor && (
          <>
            <IconButton aria-label={`Acciones de ${product.name}`} onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ flexShrink: 0, mt: -0.5, mr: -0.75, color: 'text.secondary' }}>
              <MoreVert fontSize="small" />
            </IconButton>
            <ProductActionsMenu product={product} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} onEdit={onEdit} onHistory={onHistory} onDeactivate={onDeactivate} onReactivate={onReactivate} onDelete={onDelete} />
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 44 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.3 }}>Stock actual</Typography>
            <StockAmount product={product} size={20} />
          </Box>
          {isEditor && product.is_active && <QuickStock product={product} busy={busy} onAdjust={onAdjust} />}
        </Box>
        <StockLevel product={product} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', minHeight: 24 }}>
          {isLowStock(product) && <StockBadge>Stock bajo (mín {product.min_quantity} {product.unit})</StockBadge>}
          {product.updated_at && (
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>Actualizado {relativeTime(product.updated_at)}</Typography>
          )}
        </Box>
      </Box>
    </Card>
  )
}

// ── Vista de lista: la predeterminada en móvil ───────────────────────────────
function ProductRow({ product, isEditor, isPhone, busy, onAdjust, onEdit, onDeactivate, onReactivate, onDelete, onHistory }) {
  const st = useTheme().vars.palette.stock
  const [anchorEl, setAnchorEl] = useState(null)
  const low = isLowStock(product)
  const canOpenMenu = isEditor
  // En móvil toda la fila abre las acciones: deja sitio al nombre y al ajuste de stock
  const rowIsMenu = isPhone && canOpenMenu

  const body = (
    <>
      <CategoryIcon category={product.categories} size={36} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.35 }} noWrap>{product.name}</Typography>
          {!product.is_active && <InactiveMark />}
        </Box>
        {isPhone ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            {low && <Warning sx={{ fontSize: 14, color: st.agotado.icon, flexShrink: 0 }} />}
            <StockAmount product={product} size={FS.meta} />
            {product.min_quantity > 0 && <Typography component="span" sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }} noWrap>· mín {product.min_quantity}</Typography>}
          </Box>
        ) : (
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>
            {product.categories?.name}{product.categories?.aisle ? ` · Pasillo ${product.categories.aisle}` : ''}
          </Typography>
        )}
        {isPhone && <Box sx={{ mt: 0.5 }}><StockLevel product={product} width={72} /></Box>}
      </Box>
      {!isPhone && (
        <Box sx={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
          <StockAmount product={product} />
          {low ? <StockBadge>Stock bajo</StockBadge> : product.updated_at && (
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{relativeTime(product.updated_at)}</Typography>
          )}
        </Box>
      )}
    </>
  )

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: { xs: 1, sm: 1.5 }, bgcolor: product.is_active ? 'transparent' : 'action.hover' }}>
      {rowIsMenu ? (
        <ButtonBase
          aria-label={`Acciones de ${product.name}`}
          aria-haspopup="menu"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1.25, pl: 1.5, py: 1, minHeight: 64, textAlign: 'left' }}
        >
          {body}
        </ButtonBase>
      ) : (
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5, pl: { xs: 1.5, sm: 2 }, py: 1, minHeight: 64 }}>{body}</Box>
      )}
      {isEditor && product.is_active && <QuickStock product={product} busy={busy} onAdjust={onAdjust} />}
      {canOpenMenu && !isPhone && (
        <IconButton aria-label={`Acciones de ${product.name}`} onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ flexShrink: 0, color: 'text.secondary' }}>
          <MoreVert fontSize="small" />
        </IconButton>
      )}
      {canOpenMenu && (
        <ProductActionsMenu product={product} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} onEdit={onEdit} onHistory={onHistory} onDeactivate={onDeactivate} onReactivate={onReactivate} onDelete={onDelete} />
      )}
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const {
    products, categories, loading, filters, setFilters,
    fetchProducts, fetchCategories, deleteProduct, hardDeleteProduct, updateProduct, getFilteredProducts,
  } = useInventoryStore()
  const refreshSignal = useAppStore((s) => s.refreshSignal)
  const { enqueueSnackbar } = useSnackbar()
  // Sin elección del usuario: lista en móvil, cuadrícula con más espacio
  const [viewChoice, setViewChoice] = useState(null)
  const view = viewChoice ?? (isPhone ? 'list' : 'grid')
  const [tab, setTab] = useState(0)
  const [productDialog, setProductDialog] = useState({ open: false, product: null })
  const [historyDrawer, setHistoryDrawer] = useState({ open: false, product: null })
  const [deactivateConfirm, setDeactivateConfirm] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [adjusting, setAdjusting] = useState(new Set())
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
  const isEditor = canEditRole(currentWorkspace?.my_role)
  // Eliminar productos y categorías es de propietario y administradores (los editores desactivan)
  const canDelete = canManageRole(currentWorkspace?.my_role)
  const activeCount = products.filter((p) => p.is_active).length
  const lowCount = products.filter((p) => p.is_active && p.current_quantity <= p.min_quantity && p.min_quantity > 0).length
  const productCounts = useMemo(() => {
    const map = {}
    products.forEach((p) => { if (p.is_active && p.category_id) map[p.category_id] = (map[p.category_id] || 0) + 1 })
    return map
  }, [products])

  const hasFilters = Boolean(filters.search || filters.categoryId || filters.status !== 'all')

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

  // También reutiliza updateProduct, así el ajuste queda en el historial del producto
  const handleAdjust = async (product, dir) => {
    const next = Math.max(0, roundQty(Number(product.current_quantity) + dir * stepFor(product.unit)))
    setAdjusting((prev) => new Set(prev).add(product.id))
    const { error } = await updateProduct(product.id, { current_quantity: next }, currentWorkspace.id, user.id)
    setAdjusting((prev) => { const n = new Set(prev); n.delete(product.id); return n })
    if (error) enqueueSnackbar('No se pudo cambiar la cantidad', { variant: 'error' })
  }

  const openNew = () => setProductDialog({ open: true, product: null })
  const rowActions = (p) => ({
    isEditor,
    busy: adjusting.has(p.id),
    onAdjust: handleAdjust,
    onEdit: () => setProductDialog({ open: true, product: p }),
    onDeactivate: () => setDeactivateConfirm(p),
    onReactivate: () => handleReactivate(p),
    onDelete: canDelete ? () => setDeleteConfirm(p) : undefined,
    onHistory: () => setHistoryDrawer({ open: true, product: p }),
  })

  const showSkeleton = loading && products.length === 0
  const failedWithoutData = Boolean(loadError) && products.length === 0
  const GRID = { display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }

  const statusChips = STATUS_FILTERS.map((st) => (
    <FilterChip
      key={st.key}
      label={st.key === 'low_stock' && lowCount > 0 ? `${st.label} ${lowCount}` : st.label}
      icon={st.key === 'low_stock' ? <Warning sx={{ fontSize: 16 }} /> : undefined}
      selected={filters.status === st.key}
      onClick={() => setFilters({ status: st.key })}
    />
  ))
  const categoryChips = categories.map((c) => (
    <FilterChip
      key={c.id}
      label={c.name}
      icon={<Box sx={{ ml: '8px !important', mr: '-2px !important', width: 10, height: 10, borderRadius: '50%', bgcolor: c.color }} />}
      selected={filters.categoryId === c.id}
      onClick={() => setFilters({ categoryId: filters.categoryId === c.id ? '' : c.id })}
    />
  ))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 2 } }}>
      <PageHeader
        {...reveal(0)}
        title="Inventario"
        subtitle={!showSkeleton && `${activeCount} productos activos${lowCount > 0 ? ` · ${lowCount} con stock bajo` : ''}`}
        actions={isEditor && (tab === 0
          ? <PrimaryAction icon={<Add />} label="Nuevo producto" onClick={openNew} />
          : <Button startIcon={<Add />} variant="outlined" onClick={openNew} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Nuevo producto</Button>)}
      />

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      <Box {...reveal(1)}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<Inventory2 sx={{ fontSize: 20 }} />} label="Productos" iconPosition="start" />
          <Tab icon={<Category sx={{ fontSize: 20 }} />} label="Categorías" iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box {...reveal(2)} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
          {/* Búsqueda y vista */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="Buscar productos"
              size="small"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              slotProps={{
                htmlInput: { 'aria-label': 'Buscar productos', enterKeyHint: 'search' },
                input: {
                  startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>,
                  endAdornment: filters.search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" edge="end" aria-label="Limpiar búsqueda" onClick={() => setFilters({ search: '' })}><Close fontSize="small" /></IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
              sx={{ maxWidth: { sm: 420 } }}
            />
            <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setViewChoice(v)} size="small" sx={{ ml: 'auto', flexShrink: 0 }}>
              <ToggleButton value="list" aria-label="Vista de lista"><ViewList sx={{ fontSize: 20 }} /></ToggleButton>
              <ToggleButton value="grid" aria-label="Vista de tarjetas"><ViewModule sx={{ fontSize: 20 }} /></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Filtros a un toque: en móvil, una sola fila deslizable para dejar sitio a los productos */}
          {isPhone ? (
            <ChipRow label="Filtrar productos">{statusChips}{categoryChips}</ChipRow>
          ) : (
            <>
              <ChipRow label="Filtrar por estado">{statusChips}</ChipRow>
              {categories.length > 0 && <ChipRow label="Filtrar por categoría">{categoryChips}</ChipRow>}
            </>
          )}

          {products.length > 0 && (!isPhone || hasFilters) && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 28 }}>
              <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
                Mostrando {filtered.length} de {products.length}
              </Typography>
              {hasFilters && <Button onClick={() => setFilters(NO_FILTERS)} sx={{ minHeight: 28, py: 0, px: 1 }}>Limpiar filtros</Button>}
            </Box>
          )}

          {/* Contenido */}
          {showSkeleton ? (
            view === 'grid' ? (
              <Box sx={GRID}>
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="rectangular" height={168} sx={{ borderRadius: '16px' }} />)}
              </Box>
            ) : (
              <Card>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, minHeight: 64 }}>
                    <Skeleton variant="rectangular" width={36} height={36} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton variant="text" width="50%" sx={{ fontSize: FS.body }} />
                      <Skeleton variant="text" width="30%" sx={{ fontSize: FS.meta }} />
                    </Box>
                    <Skeleton variant="rectangular" width={88} height={44} />
                  </Box>
                ))}
              </Card>
            )
          ) : failedWithoutData ? null : products.length === 0 ? (
            <EmptyState
              icon={<Inventory2 sx={{ fontSize: 28 }} />}
              title="Sin productos"
              body="Agrega tu primer producto al inventario"
              action={isEditor && <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Agregar producto</Button>}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search sx={{ fontSize: 28 }} />}
              title="Sin resultados"
              body="Ningún producto coincide con los filtros aplicados."
              action={<Button variant="outlined" onClick={() => setFilters(NO_FILTERS)}>Limpiar filtros</Button>}
            />
          ) : view === 'grid' ? (
            <Box sx={GRID}>
              {filtered.map((p) => <ProductCard key={p.id} product={p} {...rowActions(p)} />)}
            </Box>
          ) : (
            <Card>
              {filtered.map((p, i) => (
                <Box key={p.id}>
                  <ProductRow product={p} isPhone={isPhone} {...rowActions(p)} />
                  {i < filtered.length - 1 && <RowDivider inset={1.5} />}
                </Box>
              ))}
            </Card>
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box {...reveal(2)}>
          <CategoryManager
            workspaceId={currentWorkspace?.id}
            isEditor={isEditor}
            canDelete={canDelete}
            productCounts={productCounts}
            onOpenCategory={(id) => { setFilters({ ...NO_FILTERS, categoryId: id }); setTab(0) }}
          />
        </Box>
      )}

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

      <ConfirmDialog
        open={Boolean(deactivateConfirm)}
        title="Desactivar producto"
        subtitle="El producto quedará oculto"
        icon={<VisibilityOff sx={{ fontSize: 22 }} />}
        danger={false}
        confirmLabel="Desactivar"
        loading={deactivating}
        onCancel={() => setDeactivateConfirm(null)}
        onConfirm={handleDeactivate}
      >
        <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
          ¿Desactivar <strong>"{deactivateConfirm?.name}"</strong>? Podrás reactivarlo filtrando por "Inactivos".
        </Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar producto"
        subtitle="Esta acción es permanente"
        icon={<DeleteForever sx={{ fontSize: 22 }} />}
        confirmLabel="Eliminar definitivamente"
        loadingLabel="Eliminando…"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          Esta acción <strong>no se puede deshacer</strong>. El producto será eliminado del sistema junto con su historial.
        </Alert>
        <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
          ¿Confirmas que deseas eliminar <strong>"{deleteConfirm?.name}"</strong>?
        </Typography>
        <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', mt: 1, display: 'block' }}>
          Si solo quieres ocultarlo, usa "Desactivar" en su lugar.
        </Typography>
      </ConfirmDialog>
    </Box>
  )
}
