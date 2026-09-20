import { useEffect, useMemo, useState } from 'react'
import {
  Box, Card, Typography, Avatar, Chip, Skeleton, Divider,
  List, ListItem, ListItemText, useTheme, Button, useMediaQuery, CircularProgress,
  Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
} from '@mui/material'
import {
  Inventory2, Receipt, ShoppingCart, AttachMoney, Warning, ErrorOutlined,
  ArrowForward, TrendingUp, TrendingDown, Delete,
  AutoAwesome, CalendarToday, CheckCircle,
} from '@mui/icons-material'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useInventoryStore } from '@/features/inventory/store/inventoryStore'
import { useBudgetStore } from '@/features/budgets/store/budgetStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import { fmtMoney, fmtDate, fmtMonth } from '@/shared/utils/format'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos/KPIs · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }

const NUM = { fontVariantNumeric: 'tabular-nums' }

// Cada bloque entra una sola vez, escalonado (único momento orquestado)
const reveal = i => ({ className: 'reveal', style: { '--i': i } })

// ── Sub-components ────────────────────────────────────────────────────────────

function Panel({ children, sx, ...rest }) {
  return <Card component="section" {...rest} sx={{ overflow: 'hidden', ...sx }}>{children}</Card>
}

function PanelHeader({ title, caption, children }) {
  return (
    <Box sx={{ px: 3, py: 2, minHeight: 64, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{title}</Typography>
        {caption && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{caption}</Typography>}
      </Box>
      {children}
    </Box>
  )
}

function KpiCard({ icon, label, value, sub, loading, trendIcon }) {
  const theme = useTheme()
  const st = theme.palette.stock
  const subColor = sub?.negative ? st.agotado.text : theme.palette.text.secondary
  return (
    <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        {icon}
        <Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>{label}</Typography>
      </Box>
      {loading ? (
        <>
          <Skeleton variant="text" width="50%" sx={{ fontSize: FS.title }} />
          <Skeleton variant="text" width="70%" sx={{ fontSize: FS.meta }} />
        </>
      ) : (
        <>
          <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{value}</Typography>
          {sub && (
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: subColor, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: sub.negative ? 700 : 400 }}>
              {trendIcon}
              {sub.text}
            </Typography>
          )}
        </>
      )}
    </Card>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '8px', p: 1.5, boxShadow: '0 8px 24px rgba(15,23,42,0.16)' }}>
      <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} display="block">{fmtMonth(label)}</Typography>
      <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{fmtMoney(payload[0].value)}</Typography>
    </Box>
  )
}

function UserBar({ name, amount, max, reduceMotion }) {
  const pct = max > 0 ? Math.min((amount / max) * 100, 100) : 0
  return (
    <Box sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: FS.body }}>{name}</Typography>
        <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, textAlign: 'right' }}>{fmtMoney(amount)}</Typography>
      </Box>
      <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: '8px', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: '100%', transform: `scaleX(${pct / 100})`, transformOrigin: 'left', bgcolor: 'primary.main', borderRadius: '8px', transition: reduceMotion ? 'none' : 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </Box>
    </Box>
  )
}

function InsightCard({ icon, title, value, sub, color, loading, empty }) {
  return (
    <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        {icon}
        <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: 700, color: 'text.secondary' }}>{title}</Typography>
      </Box>
      {loading ? (
        <>
          <Skeleton variant="text" width="45%" sx={{ fontSize: FS.title }} />
          <Skeleton variant="text" width="65%" sx={{ fontSize: FS.meta }} />
        </>
      ) : empty ? (
        <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Sin datos</Typography>
      ) : (
        <>
          <Typography sx={{ ...NUM, fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, color: color || 'text.primary' }}>{value}</Typography>
          {sub && <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{sub}</Typography>}
        </>
      )}
    </Card>
  )
}

// El dato hero: cuántos productos piden reposición. Estado = tono + icono + texto.
function StockHero({ loading, unknown, count, lowCount, riskCount, primaryIsBudgets, onGo }) {
  const theme = useTheme()
  const st = theme.palette.stock
  const tone = unknown ? 'desconocido' : count === 0 ? 'saludable' : lowCount > 0 ? 'agotado' : 'riesgo'
  const skin = {
    desconocido: { ...st.saludable, Icon: ErrorOutlined },
    saludable:   { ...st.saludable, Icon: CheckCircle },
    riesgo:      { ...st.riesgo, Icon: Warning },
    agotado:     { ...st.agotado, Icon: ErrorOutlined },
  }[tone]

  return (
    <Card sx={{ bgcolor: loading ? 'background.paper' : skin.tint, borderColor: loading ? 'divider' : skin.line, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 3 }}>
      {loading ? (
        <>
          <Skeleton variant="text" width="50%" sx={{ fontSize: FS.body }} />
          <Skeleton variant="text" width="70%" sx={{ fontSize: FS.hero }} />
          <Skeleton variant="text" width="60%" sx={{ fontSize: FS.body }} />
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <skin.Icon sx={{ fontSize: 24, color: skin.icon }} />
              <Typography component="h2" sx={{ fontSize: FS.body, fontWeight: 700 }}>Items en riesgo</Typography>
            </Box>
            <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: skin.text }}>
              {count === 0 ? 'Sin alertas' : (
                <>
                  {count}
                  <Box component="span" sx={{ fontSize: FS.title, fontWeight: 700, ml: 1 }}>{count > 1 ? 'productos' : 'producto'}</Box>
                </>
              )}
            </Typography>
            <Typography sx={{ fontSize: FS.body, fontWeight: 600, color: 'text.primary' }}>
              {count === 0 ? 'Stock saludable' : `${lowCount} agotado${lowCount !== 1 ? 's' : ''} · ${riskCount} en riesgo`}
            </Typography>
          </Box>
        </>
      )}
      <Box>
        <Button variant={primaryIsBudgets ? 'outlined' : 'contained'} endIcon={<ArrowForward sx={{ fontSize: 20 }} />} onClick={onGo}>
          Ir al inventario
        </Button>
      </Box>
    </Card>
  )
}

function ListSkeleton({ rows = 3 }) {
  return (
    <Box sx={{ px: 3, py: 1 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 56 }}>
          <Skeleton variant="rectangular" width={40} height={40} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="55%" sx={{ fontSize: FS.body }} />
            <Skeleton variant="text" width="35%" sx={{ fontSize: FS.meta }} />
          </Box>
          <Skeleton variant="text" width={72} sx={{ fontSize: FS.body }} />
        </Box>
      ))}
    </Box>
  )
}

function NameList({ names }) {
  const shown = names.slice(0, 5)
  const rest = names.length - shown.length
  return (
    <Box component="ul" sx={{ m: 0, mt: 2, pl: 3, fontSize: FS.body, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {shown.map((n, i) => <li key={`${n}-${i}`}><Typography component="span" sx={{ fontSize: FS.body, fontWeight: 600 }}>{n}</Typography></li>)}
      {rest > 0 && <li><Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>+{rest} más</Typography></li>}
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const theme = useTheme()
  const st = theme.palette.stock
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { profile } = useAuthStore()
  const { currentWorkspace, members, fetchMembers } = useWorkspaceStore()
  const { products, fetchProducts, fetchCategories, deactivateProducts, loading: invLoading } = useInventoryStore()
  const { budgets, fetchBudgets, loading: budgLoading } = useBudgetStore()
  const { purchases, fetchPurchases, deletePurchases, getSpendingByUser, getMonthlySpending, loading: purchLoading } = usePurchaseStore()
  const { refreshSignal } = useAppStore()

  // ── Selection state
  const [purchSelectMode, setPurchSelectMode]       = useState(false)
  const [selectedPurch, setSelectedPurch]           = useState(new Set())
  const [purchDeleteConfirm, setPurchDeleteConfirm] = useState(false)
  const [purchDeleting, setPurchDeleting]           = useState(false)
  const [stockSelectMode, setStockSelectMode]       = useState(false)
  const [selectedStock, setSelectedStock]           = useState(new Set())
  const [stockConfirm, setStockConfirm]             = useState(false)
  const [stockDeactivating, setStockDeactivating]   = useState(false)
  const [loadError, setLoadError]                   = useState(null)
  const [retryTick, setRetryTick]                   = useState(0)

  // Mismas cinco cargas de siempre; ahora se recoge el `{ error }` que ya devuelven
  useEffect(() => {
    if (!currentWorkspace) return
    let cancelled = false
    Promise.all([
      fetchProducts(currentWorkspace.id),
      fetchCategories(currentWorkspace.id),
      fetchBudgets(currentWorkspace.id),
      fetchPurchases(currentWorkspace.id),
      fetchMembers(currentWorkspace.id),
    ])
      .then(results => {
        if (cancelled) return
        const failed = results.find(r => r?.error)
        setLoadError(failed ? { message: failed.error.message || 'Sin detalle del servidor' } : null)
      })
      .catch(e => { if (!cancelled) setLoadError({ message: e?.message || 'Sin detalle del servidor' }) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, refreshSignal, retryTick])

  // ── Derived stats
  const totalSpent     = useMemo(() => purchases.reduce((a, p) => a + (p.total_amount || 0), 0), [purchases])
  const activeBudgets  = useMemo(() => budgets.filter(b => b.status === 'active').length, [budgets])
  const activeProducts = useMemo(() => products.filter(p => p.is_active).length, [products])
  const lowStock       = useMemo(() => products.filter(p => p.is_active && p.min_quantity > 0 && p.current_quantity <= p.min_quantity), [products])
  const atRisk         = useMemo(() => products.filter(p => p.is_active && p.min_quantity > 0 && p.current_quantity > p.min_quantity && p.current_quantity <= p.min_quantity * 2), [products])
  const stockAlerts    = useMemo(() => [
    ...lowStock.map(p => ({ ...p, _sev: 'critical' })),
    ...atRisk.map(p => ({ ...p, _sev: 'warning' })),
  ], [lowStock, atRisk])
  const recentPurchases = useMemo(() => purchases.slice(0, 8), [purchases])

  const [thisMonthKey, lastMonthKey] = useMemo(() => {
    const now = new Date()
    return [
      now.toISOString().substring(0, 7),
      new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7),
    ]
  }, [])

  const thisMonthSpend = useMemo(() => purchases.filter(p => p.date?.startsWith(thisMonthKey)).reduce((a, p) => a + (p.total_amount || 0), 0), [purchases, thisMonthKey])
  const lastMonthSpend = useMemo(() => purchases.filter(p => p.date?.startsWith(lastMonthKey)).reduce((a, p) => a + (p.total_amount || 0), 0), [purchases, lastMonthKey])
  const thisMonthCount = useMemo(() => purchases.filter(p => p.date?.startsWith(thisMonthKey)).length, [purchases, thisMonthKey])
  const spendTrend     = useMemo(() => lastMonthSpend > 0 ? Math.round(((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100) : null, [thisMonthSpend, lastMonthSpend])

  const spendingByUser = useMemo(() => getSpendingByUser(), [purchases])
  const monthlyData    = useMemo(() => getMonthlySpending().slice(-8), [purchases])
  const maxUserSpent   = useMemo(() => Math.max(...spendingByUser.map(u => u.total), 1), [spendingByUser])

  // ── Predictions
  const sortedByDate = useMemo(() => [...purchases].filter(p => p.date).sort((a, b) => new Date(a.date) - new Date(b.date)), [purchases])

  const avgDaysBetween = useMemo(() => {
    if (sortedByDate.length < 2) return null
    const gaps = []
    for (let i = 1; i < sortedByDate.length; i++) {
      const gap = (new Date(sortedByDate[i].date) - new Date(sortedByDate[i - 1].date)) / 86400000
      if (gap > 0) gaps.push(gap)
    }
    return gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null
  }, [sortedByDate])

  const nextPurchaseDays = useMemo(() => {
    if (!avgDaysBetween || !sortedByDate.length) return null
    const last = new Date(sortedByDate[sortedByDate.length - 1].date)
    return Math.round((new Date(last.getTime() + avgDaysBetween * 86400000) - new Date()) / 86400000)
  }, [avgDaysBetween, sortedByDate])

  const avgMonthly = useMemo(() => {
    const now = new Date()
    const amounts = [0, 1, 2].map(i => {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().substring(0, 7)
      return purchases.filter(p => p.date?.startsWith(m)).reduce((a, p) => a + (p.total_amount || 0), 0)
    }).filter(a => a > 0)
    return amounts.length > 0 ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length) : 0
  }, [purchases])

  // ── Bulk handlers
  const togglePurchSelect = id => setSelectedPurch(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const handleBulkDeletePurch = async () => {
    setPurchDeleting(true)
    const ids = [...selectedPurch]
    const { error } = await deletePurchases(ids)
    setPurchDeleting(false); setPurchDeleteConfirm(false); setPurchSelectMode(false); setSelectedPurch(new Set())
    enqueueSnackbar(error ? 'Error al eliminar' : `${ids.length} compra${ids.length > 1 ? 's eliminadas' : ' eliminada'}`, { variant: error ? 'error' : 'success' })
  }

  const toggleStockSelect = id => setSelectedStock(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const handleBulkDeactivateStock = async () => {
    setStockDeactivating(true)
    const ids = [...selectedStock]
    const { error } = await deactivateProducts(ids)
    setStockDeactivating(false); setStockConfirm(false); setStockSelectMode(false); setSelectedStock(new Set())
    enqueueSnackbar(error ? 'Error al desactivar' : `${ids.length} producto${ids.length > 1 ? 's desactivados' : ' desactivado'}`, { variant: error ? 'error' : 'success' })
  }

  const hasChartData = monthlyData.length > 0
  const hasUserData  = spendingByUser.length > 0
  const primaryColor = theme.palette.primary.main
  const loading      = invLoading || budgLoading || purchLoading

  // Estado por dato (skeleton solo mientras no hay nada que mostrar en listas y gráficos)
  const purchListLoading = purchLoading && recentPurchases.length === 0
  const stockListLoading = invLoading && stockAlerts.length === 0
  const chartsLoading    = purchLoading && !hasChartData && !hasUserData

  // Acción primaria única: ir al inventario, salvo que no haya nada que reponer ni compras aún
  const primaryIsBudgets = stockAlerts.length === 0 && recentPurchases.length === 0

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  }, [])

  // Tendencia: bajar el gasto es neutro; subir hasta 15% avisa (ámbar); más de 15% es exceso (coral)
  const trendColor = spendTrend === null || spendTrend <= 0 ? theme.palette.text.primary
    : spendTrend <= 15 ? st.riesgo.text : st.agotado.text
  const TrendIcon = spendTrend !== null && spendTrend < 0 ? TrendingDown : TrendingUp

  const kpis = [
    {
      label: 'Productos activos', value: activeProducts,
      icon: <Inventory2 sx={{ fontSize: 20 }} />,
      sub: products.length > activeProducts ? { text: `${products.length - activeProducts} inactivo${products.length - activeProducts > 1 ? 's' : ''}` } : null,
    },
    {
      label: 'Presupuestos activos', value: activeBudgets,
      icon: <Receipt sx={{ fontSize: 20 }} />,
      sub: budgets.length > activeBudgets ? { text: `${budgets.length} en total` } : null,
    },
    {
      label: 'Compras este mes', value: thisMonthCount,
      icon: <ShoppingCart sx={{ fontSize: 20 }} />,
      sub: spendTrend !== null
        ? { text: `${spendTrend >= 0 ? '+' : ''}${spendTrend}% vs mes anterior`, negative: spendTrend > 25 }
        : purchases.length > 0 ? { text: `${purchases.length} en total` } : null,
      trendIcon: spendTrend !== null ? <TrendIcon sx={{ fontSize: 16 }} /> : null,
    },
    {
      label: 'Total gastado', value: fmtMoney(totalSpent),
      icon: <AttachMoney sx={{ fontSize: 20 }} />,
      sub: thisMonthSpend > 0 ? { text: `${fmtMoney(thisMonthSpend)} este mes` } : null,
    },
  ]

  const chartSummary = hasChartData
    ? `Gasto mensual, últimos ${monthlyData.length} meses: ${monthlyData.map(d => `${fmtMonth(d.month)} ${fmtMoney(d.total)}`).join(', ')}`
    : ''

  const selectedPurchNames = recentPurchases.filter(p => selectedPurch.has(p.id)).map(p => p.name)
  const selectedStockNames = stockAlerts.filter(p => selectedStock.has(p.id)).map(p => p.name)
  const alertsShown = Math.min(stockAlerts.length, 7)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Header ── */}
      <Box {...reveal(0)}>
        <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {greeting},{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>
            {profile?.full_name?.split(' ')[0] || 'bienvenido'}
          </Box>
        </Typography>
        <Typography sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>
          {currentWorkspace?.name && `${currentWorkspace.name}  ·  `}
          {new Date().toLocaleDateString('es-AR', { weekday: 'long' })} {fmtDate(new Date())}
        </Typography>
      </Box>

      {/* ── Error de carga: causa concreta + Reintentar ── */}
      {loadError && <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick(t => t + 1) }} />}

      {/* ── Nivel 1: dato hero + stock ── */}
      <Box {...reveal(1)} sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' } }}>
        <StockHero
          loading={invLoading && products.length === 0}
          unknown={Boolean(loadError) && products.length === 0}
          count={stockAlerts.length} lowCount={lowStock.length} riskCount={atRisk.length}
          primaryIsBudgets={primaryIsBudgets}
          onGo={() => navigate('/inventory')}
        />

        <Panel aria-label="Stock">
          <PanelHeader title={stockListLoading ? '' : lowStock.length > 0 ? 'Stock bajo' : atRisk.length > 0 ? 'Productos en riesgo' : 'Todo en orden'}>
            {stockAlerts.length > 0 && (
              <Chip
                label={stockAlerts.length}
                size="small"
                aria-label={`${stockAlerts.length} ${lowStock.length > 0 ? 'productos agotados o en riesgo' : 'productos en riesgo'}`}
                sx={{
                  bgcolor: (lowStock.length > 0 ? st.agotado : st.riesgo).tint,
                  color: (lowStock.length > 0 ? st.agotado : st.riesgo).text,
                  border: `1px solid ${(lowStock.length > 0 ? st.agotado : st.riesgo).line}`,
                  flexShrink: 0,
                }}
              />
            )}
            {stockAlerts.length > 0 && stockSelectMode && selectedStock.size > 0 && (
              <Button className="select-in" variant="outlined" startIcon={<Delete sx={{ fontSize: 20 }} />}
                onClick={() => setStockConfirm(true)} sx={{ flexShrink: 0 }}>
                Desactivar ({selectedStock.size})
              </Button>
            )}
            {stockAlerts.length > 0 && (
              <Tooltip title={stockSelectMode ? 'Cancelar' : 'Seleccionar'}>
                <Button variant={stockSelectMode ? 'outlined' : 'text'} color="inherit"
                  onClick={() => { setStockSelectMode(m => !m); setSelectedStock(new Set()) }}
                  sx={{ color: stockSelectMode ? 'text.primary' : 'text.secondary', flexShrink: 0 }}>
                  {stockSelectMode ? 'Cancelar' : 'Seleccionar'}
                </Button>
              </Tooltip>
            )}
          </PanelHeader>

          {stockListLoading ? (
            <ListSkeleton rows={3} />
          ) : stockAlerts.length === 0 ? (
            <Box sx={{ px: 3, py: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircle sx={{ fontSize: 32, color: 'text.secondary' }} />
              <Box>
                <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>Stock saludable</Typography>
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Todos los productos con stock suficiente</Typography>
              </Box>
            </Box>
          ) : (
            <>
              <List disablePadding>
                {stockAlerts.slice(0, 7).map((p, i) => (
                  <Box key={p.id}>
                    <ListItem
                      sx={{ px: 3, py: 1, minHeight: 56, gap: 2, cursor: stockSelectMode ? 'pointer' : 'default', '&:hover': stockSelectMode ? { bgcolor: 'action.hover' } : {} }}
                      onClick={stockSelectMode ? () => toggleStockSelect(p.id) : undefined}
                    >
                      {stockSelectMode && (
                        <Checkbox className="select-in" checked={selectedStock.has(p.id)}
                          sx={{ ml: -1 }}
                          onClick={e => { e.stopPropagation(); toggleStockSelect(p.id) }}
                          inputProps={{ 'aria-label': `Seleccionar producto ${p.name}` }} />
                      )}
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.categories?.color || theme.palette.text.disabled, flexShrink: 0 }} />
                      <ListItemText
                        sx={{ my: 0, minWidth: 0 }}
                        primary={<Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{p.name}</Typography>}
                        secondary={
                          <Typography component="span" sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
                            {p._sev === 'critical' ? 'Agotado' : 'Bajo'} · {p.current_quantity} {p.unit} (mín {p.min_quantity})
                          </Typography>
                        }
                        slotProps={{ secondary: { component: 'div' } }}
                      />
                      <Tooltip title={p._sev === 'critical' ? 'Agotado' : 'Stock bajo'}>
                        <Box component="span" role="img" tabIndex={0} aria-label={p._sev === 'critical' ? 'Agotado' : 'Stock bajo'}
                          sx={{ display: 'flex', flexShrink: 0, color: p._sev === 'critical' ? st.agotado.icon : st.riesgo.icon, borderRadius: '8px' }}>
                          {p._sev === 'critical' ? <ErrorOutlined sx={{ fontSize: 24 }} /> : <Warning sx={{ fontSize: 24 }} />}
                        </Box>
                      </Tooltip>
                    </ListItem>
                    {i < alertsShown - 1 && <Divider sx={{ mx: 3 }} />}
                  </Box>
                ))}
              </List>
              <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
                  Mostrando {alertsShown} de {stockAlerts.length}
                </Typography>
              </Box>
            </>
          )}
        </Panel>
      </Box>

      {/* ── Nivel 2: KPIs en bento ── */}
      <Box {...reveal(2)} sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} loading={loading} />)}
      </Box>

      {/* ── Nivel 3: gráficos — solo cuando hay datos de compras ── */}
      {(hasChartData || hasUserData || chartsLoading) && (
        <Box {...reveal(3)} sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: hasChartData && hasUserData ? 'minmax(0, 2fr) minmax(0, 1fr)' : 'minmax(0, 1fr)' } }}>
          {(hasChartData || chartsLoading) && (
            <Panel>
              <PanelHeader title="Gasto mensual" caption={hasChartData ? `Últimos ${monthlyData.length} meses` : undefined} />
              <Box sx={{ p: 3, pt: 2 }}>
                {chartsLoading ? (
                  <Skeleton variant="rectangular" height={200} />
                ) : (
                  <Box role="img" aria-label={chartSummary}>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={primaryColor} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={primaryColor} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke={theme.palette.divider} vertical={false} />
                        <XAxis dataKey="month" tickMargin={8} tickFormatter={fmtMonth} tick={{ fontSize: FS.meta, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} />
                        <YAxis width={72} tick={{ fontSize: FS.meta, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} tickFormatter={v => `S/ ${Number(v).toLocaleString('en-US')}`} />
                        <RechartTooltip content={<ChartTooltip />} cursor={{ stroke: primaryColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="total" stroke={primaryColor} strokeWidth={2} fill="url(#spendGrad)" dot={false}
                          isAnimationActive={!reduceMotion} animationDuration={240}
                          activeDot={{ r: 5, fill: primaryColor, stroke: theme.palette.background.paper, strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Box>
            </Panel>
          )}
          {hasUserData && (
            <Panel>
              <PanelHeader title="Gasto por miembro" caption="Distribución del equipo" />
              <Box sx={{ p: 3 }}>
                {[...spendingByUser].sort((a, b) => b.total - a.total).map(u => (
                  <UserBar key={u.name} name={u.name} amount={u.total} max={maxUserSpent} reduceMotion={reduceMotion} />
                ))}
              </Box>
            </Panel>
          )}
        </Box>
      )}

      {/* ── Predicciones e insights ── */}
      <Box {...reveal(4)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesome sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Predicciones e insights</Typography>
        </Box>
        <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' } }}>
          <InsightCard
            icon={<CalendarToday sx={{ fontSize: 20 }} />}
            title="Próxima compra"
            loading={purchLoading}
            empty={nextPurchaseDays === null}
            value={nextPurchaseDays === 0 ? 'Hoy' : nextPurchaseDays === 1 ? 'Mañana' : nextPurchaseDays < 0 ? `Hace ${Math.abs(nextPurchaseDays)}d` : `En ${nextPurchaseDays}d`}
            sub={avgDaysBetween ? `Ciclo: ${avgDaysBetween} días` : null}
          />
          <InsightCard
            icon={<AttachMoney sx={{ fontSize: 20 }} />}
            title="Presupuesto sugerido"
            loading={purchLoading}
            empty={avgMonthly === 0}
            value={fmtMoney(Math.round(avgMonthly * 1.1))}
            sub="Promedio + 10% buffer"
          />
          <InsightCard
            icon={<TrendIcon sx={{ fontSize: 20 }} />}
            title="Tendencia de gasto"
            color={trendColor}
            loading={purchLoading}
            empty={spendTrend === null}
            value={spendTrend !== null ? `${spendTrend >= 0 ? '+' : ''}${spendTrend}%` : ''}
            sub={spendTrend !== null ? `${fmtMoney(thisMonthSpend)} vs ${fmtMoney(lastMonthSpend)} anterior` : null}
          />
        </Box>
      </Box>

      {/* ── Últimas compras + Equipo ── */}
      <Box {...reveal(5)} sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: members.length > 0 ? 'minmax(0, 7fr) minmax(0, 5fr)' : 'minmax(0, 1fr)' }, alignItems: 'start' }}>

        <Panel>
          <PanelHeader title="Últimas compras">
            {recentPurchases.length > 0 && (
              <>
                {purchSelectMode && selectedPurch.size > 0 && (
                  <Button className="select-in" variant="outlined" startIcon={<Delete sx={{ fontSize: 20 }} />}
                    onClick={() => setPurchDeleteConfirm(true)} sx={{ flexShrink: 0 }}>
                    Eliminar ({selectedPurch.size})
                  </Button>
                )}
                <Tooltip title={purchSelectMode ? 'Cancelar selección' : 'Seleccionar'}>
                  <Button variant={purchSelectMode ? 'outlined' : 'text'} color="inherit"
                    onClick={() => { setPurchSelectMode(m => !m); setSelectedPurch(new Set()) }}
                    sx={{ color: purchSelectMode ? 'text.primary' : 'text.secondary', flexShrink: 0 }}>
                    {purchSelectMode ? 'Cancelar' : 'Seleccionar'}
                  </Button>
                </Tooltip>
              </>
            )}
          </PanelHeader>

          {purchListLoading ? (
            <ListSkeleton rows={4} />
          ) : recentPurchases.length === 0 ? (
            <Box sx={{ px: 3, py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: 'action.hover', color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>Sin compras todavía</Typography>
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Iniciá una compra desde un presupuesto activo</Typography>
              </Box>
              <Button variant={primaryIsBudgets ? 'contained' : 'outlined'} onClick={() => navigate('/budgets')}>
                Ver presupuestos
              </Button>
            </Box>
          ) : (
            <>
              <List disablePadding>
                {recentPurchases.map((p, i) => (
                  <Box key={p.id}>
                    <ListItem
                      sx={{ px: 3, py: 1, minHeight: 64, gap: 2, cursor: purchSelectMode ? 'pointer' : 'default', '&:hover': purchSelectMode ? { bgcolor: 'action.hover' } : {} }}
                      onClick={purchSelectMode ? () => togglePurchSelect(p.id) : undefined}
                    >
                      {purchSelectMode && (
                        <Checkbox className="select-in" checked={selectedPurch.has(p.id)}
                          sx={{ ml: -1 }}
                          onClick={e => { e.stopPropagation(); togglePurchSelect(p.id) }}
                          inputProps={{ 'aria-label': `Seleccionar compra ${p.name}` }} />
                      )}
                      <Box sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'primary.main' }}>
                        <ShoppingCart sx={{ fontSize: 20 }} />
                      </Box>
                      <ListItemText
                        sx={{ my: 0, minWidth: 0 }}
                        primary={<Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{p.name}</Typography>}
                        secondary={
                          <Typography component="span" sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }} noWrap>
                            {p.profiles?.full_name}{p.date ? `  ·  ${fmtDate(p.date)}` : ''}
                          </Typography>
                        }
                        slotProps={{ secondary: { component: 'div', noWrap: true } }}
                      />
                      <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, flexShrink: 0, textAlign: 'right', minWidth: 96 }}>
                        {fmtMoney(p.total_amount || 0)}
                      </Typography>
                    </ListItem>
                    {i < recentPurchases.length - 1 && <Divider sx={{ mx: 3 }} />}
                  </Box>
                ))}
              </List>
              <Box sx={{ px: 3, py: 1, minHeight: 56, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
                  Mostrando {recentPurchases.length} de {purchases.length}
                </Typography>
                {!purchSelectMode && (
                  <Button endIcon={<ArrowForward sx={{ fontSize: 20 }} />} onClick={() => navigate('/purchases')} sx={{ color: 'text.secondary' }}>
                    Ver todas
                  </Button>
                )}
              </Box>
            </>
          )}
        </Panel>

        {/* Equipo — solo si hay miembros */}
        {members.length > 0 && (
          <Panel>
            <PanelHeader title={`Equipo · ${members.length} miembro${members.length > 1 ? 's' : ''}`} />
            <Box sx={{ p: 1 }}>
              {members.map(m => (
                <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, minHeight: 56 }}>
                  <Avatar
                    src={m.profiles?.avatar_url}
                    alt={m.profiles?.full_name || m.profiles?.email || 'Miembro del equipo'}
                    sx={{ width: 40, height: 40, bgcolor: 'action.selected', color: 'primary.main', borderRadius: '8px' }}
                  >
                    {m.profiles?.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: FS.body, fontWeight: 700, lineHeight: 1.4 }}>
                      {m.profiles?.full_name || m.profiles?.email}
                    </Typography>
                    <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', textTransform: 'capitalize' }}>{m.role}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Panel>
        )}
      </Box>

      {/* ── Diálogos: nombran el objeto afectado; cancelar a la izquierda, confirmar a la derecha ── */}
      <Dialog open={purchDeleteConfirm} onClose={() => setPurchDeleteConfirm(false)}>
        <DialogTitle>Eliminar compras</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body }}>¿Eliminar <strong>{selectedPurch.size}</strong> compra{selectedPurch.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.</Typography>
          <NameList names={selectedPurchNames} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchDeleteConfirm(false)} disabled={purchDeleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleBulkDeletePurch} disabled={purchDeleting}
            startIcon={purchDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {purchDeleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={stockConfirm} onClose={() => setStockConfirm(false)}>
        <DialogTitle>Desactivar productos</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body }}>¿Desactivar <strong>{selectedStock.size}</strong> producto{selectedStock.size > 1 ? 's' : ''}? Dejarán de aparecer en el inventario activo.</Typography>
          <NameList names={selectedStockNames} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockConfirm(false)} disabled={stockDeactivating}>Cancelar</Button>
          <Button variant="contained" onClick={handleBulkDeactivateStock} disabled={stockDeactivating}
            startIcon={stockDeactivating ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {stockDeactivating ? 'Desactivando…' : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
