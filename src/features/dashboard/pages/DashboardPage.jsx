import { useEffect, useMemo, useState } from 'react'
import {
  Box, Card, Typography, Avatar, Skeleton, Button, ButtonBase,
  Checkbox, Tooltip, useMediaQuery, useTheme,
} from '@mui/material'
import {
  Inventory2Outlined, ReceiptLongOutlined, ShoppingBagOutlined, PaymentsOutlined, Warning, ErrorOutlined,
  ArrowForward, TrendingUp, TrendingDown, Delete, CalendarToday, CheckCircle, ShoppingCartRounded,
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
import { useShoppingStore } from '@/features/shopping/store/shoppingStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import { BudgetMeter, CategoryIcon, ChartTooltip, ConfirmDialog, NameList, PageHeader, Panel, RankBar, RowDivider, Section, StatGrid, StatusPill } from '@/shared/components/ui'
import { LOCALE, fmtMoney, fmtDate, fmtMonth } from '@/shared/utils/format'
import { FS, NUM, reveal } from '@/theme/tokens'

// ── Sub-components ────────────────────────────────────────────────────────────

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <ChartTooltip title={fmtMonth(label)}>
      <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700 }}>{fmtMoney(payload[0].value)}</Typography>
    </ChartTooltip>
  )
}

// Las dos respuestas que abren la pantalla: qué falta y cuánto queda para gastar
function SummaryTile({ loading, Icon, iconColor, label, value, valueColor, unit, sub, onClick }) {
  return (
    <Card sx={{ minWidth: 0, display: 'flex' }}>
      <ButtonBase onClick={onClick} sx={{ flexGrow: 1, minWidth: 0, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 0.5, p: { xs: 2, sm: 2.5 }, textAlign: 'left', '&:hover': { bgcolor: 'action.hover' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', maxWidth: '100%' }}>
          <Icon sx={{ fontSize: 18, color: iconColor, flexShrink: 0 }} />
          <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 600, color: 'inherit' }} noWrap>{label}</Typography>
        </Box>
        {loading ? (
          <>
            <Skeleton variant="text" width={90} sx={{ fontSize: 32 }} />
            <Skeleton variant="text" width={110} sx={{ fontSize: FS.meta }} />
          </>
        ) : (
          <>
            <Typography sx={{ ...NUM, fontSize: { xs: 26, sm: 34 }, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.025em', color: valueColor, overflowWrap: 'anywhere' }}>
              {value}
              {unit && <Box component="span" sx={{ fontSize: FS.body, fontWeight: 600, letterSpacing: 0, ml: 0.75 }}>{unit}</Box>}
            </Typography>
            <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }}>{sub}</Typography>
          </>
        )}
      </ButtonBase>
    </Card>
  )
}

function ListSkeleton({ rows = 3 }) {
  return (
    <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 56 }}>
          <Skeleton variant="rectangular" width={36} height={36} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="55%" sx={{ fontSize: FS.body }} />
            <Skeleton variant="text" width="35%" sx={{ fontSize: FS.meta }} />
          </Box>
          <Skeleton variant="text" width={64} sx={{ fontSize: FS.body }} />
        </Box>
      ))}
    </Box>
  )
}

function SelectToggle({ active, onToggle }) {
  return (
    <Tooltip title={active ? 'Cancelar selección' : 'Seleccionar'}>
      <Button color="inherit" onClick={onToggle} sx={{ color: active ? 'text.primary' : 'text.secondary', flexShrink: 0, px: 1 }}>
        {active ? 'Cancelar' : 'Seleccionar'}
      </Button>
    </Tooltip>
  )
}

// Fila de lista con selección opcional: seleccionar tiene prioridad sobre abrir
function SelectableRow({ selectMode, selected, onToggle, onOpen, selectLabel, children }) {
  const interactive = selectMode || Boolean(onOpen)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      {selectMode && (
        <Checkbox
          className="select-in"
          checked={selected}
          sx={{ ml: { xs: 0.5, sm: 1 }, mr: -1 }}
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          slotProps={{ input: { 'aria-label': selectLabel } }}
        />
      )}
      <ButtonBase
        component="div"
        disabled={!interactive}
        tabIndex={interactive && !selectMode ? 0 : -1}
        role={interactive && !selectMode ? 'link' : undefined}
        onClick={selectMode ? onToggle : onOpen}
        onKeyDown={(e) => { if (!selectMode && onOpen && e.key === 'Enter') onOpen() }}
        sx={{
          flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1.5, px: { xs: 2, sm: 2.5 }, py: 1, minHeight: 60, textAlign: 'left',
          '&:hover': interactive ? { bgcolor: 'action.hover' } : {},
          '&.Mui-disabled': { pointerEvents: 'none', opacity: 1 },
        }}
      >
        {children}
      </ButtonBase>
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const theme = useTheme()
  const st = theme.vars.palette.stock
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })
  const { profile } = useAuthStore()
  const { currentWorkspace, members, fetchMembers } = useWorkspaceStore()
  const { products, fetchProducts, fetchCategories, deactivateProducts, loading: invLoading } = useInventoryStore()
  const { budgets, fetchBudgets, loading: budgLoading } = useBudgetStore()
  const { purchases, fetchPurchases, deletePurchases, getSpendingByUser, getMonthlySpending, loading: purchLoading } = usePurchaseStore()
  const activeSessions = useShoppingStore((s) => s.activeSessions)
  const refreshSignal = useAppStore((s) => s.refreshSignal)

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
  const activeBudgets  = useMemo(() => budgets.filter(b => b.status === 'active'), [budgets])
  const activeProducts = useMemo(() => products.filter(p => p.is_active).length, [products])
  const lowStock       = useMemo(() => products.filter(p => p.is_active && p.min_quantity > 0 && p.current_quantity <= p.min_quantity), [products])
  const atRisk         = useMemo(() => products.filter(p => p.is_active && p.min_quantity > 0 && p.current_quantity > p.min_quantity && p.current_quantity <= p.min_quantity * 2), [products])
  const stockAlerts    = useMemo(() => [
    ...lowStock.map(p => ({ ...p, _sev: 'critical' })),
    ...atRisk.map(p => ({ ...p, _sev: 'warning' })),
  ], [lowStock, atRisk])
  const purchasesShown = isPhone ? 4 : 8
  const recentPurchases = useMemo(() => purchases.slice(0, purchasesShown), [purchases, purchasesShown])

  // Lo gastado por presupuesto y lo que queda en los activos con límite
  const spentByBudgetId = useMemo(() => {
    const map = {}
    purchases.forEach(p => { if (p.budget_id) map[p.budget_id] = (map[p.budget_id] || 0) + (p.total_amount || 0) })
    return map
  }, [purchases])
  const limitedActive = useMemo(() => activeBudgets.filter(b => b.target_amount > 0), [activeBudgets])
  const availableTotal = useMemo(
    () => limitedActive.reduce((a, b) => a + b.target_amount - (spentByBudgetId[b.id] || 0), 0),
    [limitedActive, spentByBudgetId]
  )
  // Próximas compras: las de fecha más cercana primero; sin fecha, al final
  const upcomingBudgets = useMemo(() => [...activeBudgets].sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  }).slice(0, 3), [activeBudgets])
  const sessionByBudget = useMemo(() => new Map(activeSessions.map(s => [s.budget_id, s])), [activeSessions])

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
  const primaryColor = theme.vars.palette.primary.main
  const loading      = invLoading || budgLoading || purchLoading
  const isEditor     = ['owner', 'editor'].includes(currentWorkspace?.my_role)

  // Estado por dato (skeleton solo mientras no hay nada que mostrar en listas y gráficos)
  const purchListLoading = purchLoading && recentPurchases.length === 0
  const stockListLoading = invLoading && stockAlerts.length === 0
  const chartsLoading    = purchLoading && !hasChartData && !hasUserData

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  }, [])

  // Tendencia: bajar el gasto es neutro; subir hasta 15% avisa (ámbar); más de 15% es exceso (tomate)
  const trendColor = spendTrend === null || spendTrend <= 0 ? theme.vars.palette.text.primary
    : spendTrend <= 15 ? st.riesgo.text : st.agotado.text
  const TrendIcon = spendTrend !== null && spendTrend < 0 ? TrendingDown : TrendingUp

  const kpis = [
    {
      label: 'Productos activos', value: activeProducts, loading,
      icon: <Inventory2Outlined sx={{ fontSize: 17 }} />,
      sub: products.length > activeProducts ? `${products.length - activeProducts} inactivo${products.length - activeProducts > 1 ? 's' : ''}` : null,
    },
    {
      label: 'Presupuestos activos', value: activeBudgets.length, loading,
      icon: <ReceiptLongOutlined sx={{ fontSize: 17 }} />,
      sub: budgets.length > activeBudgets.length ? `${budgets.length} en total` : null,
    },
    {
      label: 'Compras este mes', value: thisMonthCount, loading,
      icon: <ShoppingBagOutlined sx={{ fontSize: 17 }} />,
      sub: spendTrend !== null
        ? `${spendTrend >= 0 ? '+' : ''}${spendTrend}% vs mes anterior`
        : purchases.length > 0 ? `${purchases.length} en total` : null,
      subTone: spendTrend !== null && spendTrend > 25 ? 'agotado' : undefined,
    },
    {
      label: 'Total gastado', value: fmtMoney(totalSpent), loading,
      icon: <PaymentsOutlined sx={{ fontSize: 17 }} />,
      sub: thisMonthSpend > 0 ? `${fmtMoney(thisMonthSpend)} este mes` : null,
    },
  ]

  const insights = [
    {
      label: 'Próxima compra', loading: purchLoading, empty: nextPurchaseDays === null,
      icon: <CalendarToday sx={{ fontSize: 17 }} />,
      value: nextPurchaseDays === 0 ? 'Hoy' : nextPurchaseDays === 1 ? 'Mañana' : nextPurchaseDays < 0 ? `Hace ${Math.abs(nextPurchaseDays)}d` : `En ${nextPurchaseDays}d`,
      sub: avgDaysBetween ? `Ciclo: ${avgDaysBetween} días` : null,
    },
    {
      label: 'Presupuesto sugerido', loading: purchLoading, empty: avgMonthly === 0,
      icon: <PaymentsOutlined sx={{ fontSize: 17 }} />,
      value: fmtMoney(Math.round(avgMonthly * 1.1)),
      sub: 'Promedio + 10% buffer',
    },
    {
      label: 'Tendencia de gasto', loading: purchLoading, empty: spendTrend === null,
      icon: <TrendIcon sx={{ fontSize: 17 }} />,
      valueColor: trendColor,
      value: spendTrend !== null ? `${spendTrend >= 0 ? '+' : ''}${spendTrend}%` : '',
      sub: spendTrend !== null ? `${fmtMoney(thisMonthSpend)} vs ${fmtMoney(lastMonthSpend)} anterior` : null,
    },
  ]

  const chartSummary = hasChartData
    ? `Gasto mensual, últimos ${monthlyData.length} meses: ${monthlyData.map(d => `${fmtMonth(d.month)} ${fmtMoney(d.total)}`).join(', ')}`
    : ''

  const selectedPurchNames = recentPurchases.filter(p => selectedPurch.has(p.id)).map(p => p.name)
  const selectedStockNames = stockAlerts.filter(p => selectedStock.has(p.id)).map(p => p.name)
  const alertsShown = Math.min(stockAlerts.length, isPhone ? 5 : 7)
  const alertCount = stockAlerts.length
  const stockTone = lowStock.length > 0 ? st.agotado : st.riesgo
  const productsLoading = invLoading && products.length === 0
  const stockUnknown = Boolean(loadError) && products.length === 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 } }}>

      <PageHeader
        {...reveal(0)}
        title={`${greeting}, ${profile?.full_name?.split(' ')[0] || 'bienvenido'}`}
        subtitle={<>{currentWorkspace?.name && `${currentWorkspace.name}  ·  `}{new Date().toLocaleDateString(LOCALE, { weekday: 'long' })} {fmtDate(new Date())}</>}
      />

      {loadError && <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick(t => t + 1) }} />}

      {/* ── Lo primero: qué falta en casa y cuánto queda para gastar ── */}
      <Box {...reveal(1)} sx={{ display: 'grid', gap: { xs: 1.5, md: 3 }, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <SummaryTile
          loading={productsLoading}
          Icon={alertCount === 0 ? CheckCircle : lowStock.length > 0 ? ErrorOutlined : Warning}
          iconColor={alertCount === 0 ? 'text.secondary' : stockTone.icon}
          label="Items en riesgo"
          value={stockUnknown || alertCount === 0 ? 'Sin alertas' : alertCount}
          valueColor={alertCount === 0 ? 'text.primary' : stockTone.text}
          unit={alertCount > 0 ? (alertCount > 1 ? 'productos' : 'producto') : null}
          sub={alertCount === 0 ? 'Stock saludable' : `${lowStock.length} por reponer · ${atRisk.length} en riesgo`}
          onClick={() => navigate('/inventory')}
        />
        <SummaryTile
          loading={budgLoading && budgets.length === 0}
          Icon={ReceiptLongOutlined}
          iconColor="text.secondary"
          label={availableTotal < 0 ? 'Excedido' : 'Disponible'}
          value={limitedActive.length > 0 ? fmtMoney(availableTotal) : '—'}
          valueColor={availableTotal < 0 ? st.agotado.text : 'text.primary'}
          sub={limitedActive.length > 0
            ? `En ${limitedActive.length} presupuesto${limitedActive.length !== 1 ? 's' : ''} activo${limitedActive.length !== 1 ? 's' : ''}`
            : 'Sin límites definidos'}
          onClick={() => navigate('/budgets')}
        />
      </Box>

      {/* ── Próximas compras + stock ── */}
      <Box {...reveal(2)} sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' } }}>
        <Section title="Próximas compras" count={activeBudgets.length > 0 ? activeBudgets.length : null}>
          {budgLoading && budgets.length === 0 ? (
            <Skeleton variant="rectangular" height={148} sx={{ borderRadius: '16px' }} />
          ) : upcomingBudgets.length === 0 ? (
            <Card sx={{ p: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>Sin presupuestos activos</Typography>
                <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Crea un presupuesto para organizar tu próxima compra</Typography>
              </Box>
              <Button variant="contained" onClick={() => navigate('/budgets')}>Ver presupuestos</Button>
            </Card>
          ) : upcomingBudgets.map((b) => {
            const session = sessionByBudget.get(b.id)
            const meta = [b.store, b.date ? fmtDate(b.date) : null].filter(Boolean).join(' · ')
            return (
              <Card key={b.id} sx={{ overflow: 'hidden' }}>
                <ButtonBase component="div" role="link" tabIndex={0} onClick={() => navigate(`/budgets/${b.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/budgets/${b.id}`) }}
                  sx={{ display: 'block', width: '100%', px: { xs: 2, sm: 2.5 }, pt: 2, pb: isEditor ? 1 : 2, textAlign: 'left', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }} noWrap>{b.name}</Typography>
                      {meta && <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }} noWrap>{meta}</Typography>}
                    </Box>
                    {session && <StatusPill tone="brand" icon={ShoppingCartRounded}>En curso</StatusPill>}
                  </Box>
                  {b.target_amount > 0 && <Box sx={{ mt: 1.25 }}><BudgetMeter spent={spentByBudgetId[b.id] || 0} limit={b.target_amount} /></Box>}
                </ButtonBase>
                {isEditor && (
                  <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2, pt: 0.5 }}>
                    <Button fullWidth variant={upcomingBudgets[0].id === b.id ? 'contained' : 'outlined'} startIcon={<ShoppingCartRounded />}
                      onClick={() => navigate(session ? `/shopping/${session.id}` : `/shopping/new?budgetId=${b.id}`)}>
                      {session ? 'Retomar compra' : 'Iniciar compra'}
                    </Button>
                  </Box>
                )}
              </Card>
            )
          })}
        </Section>

        <Panel
          aria-label="Stock"
          title={stockListLoading ? 'Stock' : lowStock.length > 0 ? 'Stock bajo' : atRisk.length > 0 ? 'Productos en riesgo' : 'Todo en orden'}
          actions={alertCount > 0 && (
            <>
              {stockSelectMode && selectedStock.size > 0 && (
                <Button className="select-in" variant="outlined" startIcon={<Delete sx={{ fontSize: 20 }} />} onClick={() => setStockConfirm(true)} sx={{ flexShrink: 0 }}>
                  Desactivar ({selectedStock.size})
                </Button>
              )}
              <SelectToggle active={stockSelectMode} onToggle={() => { setStockSelectMode(m => !m); setSelectedStock(new Set()) }} />
            </>
          )}
        >
          {stockListLoading ? (
            <ListSkeleton rows={3} />
          ) : alertCount === 0 ? (
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircle sx={{ fontSize: 28, color: 'text.secondary' }} />
              <Box>
                <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>Stock saludable</Typography>
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Todos los productos con stock suficiente</Typography>
              </Box>
            </Box>
          ) : (
            <>
              {stockAlerts.slice(0, alertsShown).map((p, i) => (
                <Box key={p.id}>
                  <SelectableRow
                    selectMode={stockSelectMode}
                    selected={selectedStock.has(p.id)}
                    onToggle={() => toggleStockSelect(p.id)}
                    selectLabel={`Seleccionar producto ${p.name}`}
                  >
                    <CategoryIcon category={p.categories} size={36} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.35 }} noWrap>{p.name}</Typography>
                      <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>{p.current_quantity} {p.unit} (mín {p.min_quantity})</Typography>
                    </Box>
                    {p._sev === 'critical'
                      ? <StatusPill tone="over" icon={ErrorOutlined}>Reponer</StatusPill>
                      : <StatusPill tone="warn" icon={Warning}>Bajo</StatusPill>}
                  </SelectableRow>
                  {i < alertsShown - 1 && <RowDivider />}
                </Box>
              ))}
              <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 0.75, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>Mostrando {alertsShown} de {alertCount}</Typography>
                <Button endIcon={<ArrowForward sx={{ fontSize: 18 }} />} onClick={() => navigate('/inventory')} sx={{ px: 1 }}>Ir al inventario</Button>
              </Box>
            </>
          )}
        </Panel>
      </Box>

      {/* ── Este mes en cifras ── */}
      <Box {...reveal(3)}><StatGrid items={kpis} columns={{ xs: 2, md: 4 }} /></Box>

      {/* ── Gráficos: solo cuando hay datos de compras ── */}
      {(hasChartData || hasUserData || chartsLoading) && (
        <Box {...reveal(4)} sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: hasChartData && hasUserData ? 'minmax(0, 2fr) minmax(0, 1fr)' : 'minmax(0, 1fr)' } }}>
          {(hasChartData || chartsLoading) && (
            <Panel title="Gasto mensual" caption={hasChartData ? `Últimos ${monthlyData.length} meses` : undefined}>
              <Box sx={{ px: { xs: 1, sm: 2 }, pb: 2, pt: 1 }}>
                {chartsLoading ? (
                  <Skeleton variant="rectangular" height={200} />
                ) : (
                  <Box role="img" aria-label={chartSummary}>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={primaryColor} stopOpacity={0.22} />
                            <stop offset="95%" stopColor={primaryColor} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke={theme.vars.palette.divider} vertical={false} />
                        <XAxis dataKey="month" tickMargin={8} tickFormatter={fmtMonth} tick={{ fontSize: FS.meta, fill: theme.vars.palette.text.secondary }} tickLine={false} axisLine={false} minTickGap={16} />
                        <YAxis width={56} tick={{ fontSize: FS.meta, fill: theme.vars.palette.text.secondary }} tickLine={false} axisLine={false} tickFormatter={v => `S/ ${Number(v).toLocaleString('en-US')}`} />
                        <RechartTooltip content={<MoneyTooltip />} cursor={{ stroke: primaryColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="total" stroke={primaryColor} strokeWidth={2} fill="url(#spendGrad)" dot={false}
                          isAnimationActive={!reduceMotion} animationDuration={240}
                          activeDot={{ r: 5, fill: primaryColor, stroke: theme.vars.palette.background.paper, strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Box>
            </Panel>
          )}
          {hasUserData && (
            <Panel title="Gasto por miembro" caption="Distribución del equipo">
              <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[...spendingByUser].sort((a, b) => b.total - a.total).map(u => (
                  <RankBar key={u.name} name={u.name} value={u.total} max={maxUserSpent} formattedValue={fmtMoney(u.total)} />
                ))}
              </Box>
            </Panel>
          )}
        </Box>
      )}

      {/* ── Predicciones e insights ── */}
      <Box {...reveal(5)}>
        <Section title="Predicciones e insights">
          <StatGrid items={insights} columns={{ xs: 1, sm: 3 }} />
        </Section>
      </Box>

      {/* ── Últimas compras + Equipo ── */}
      <Box {...reveal(6)} sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: members.length > 0 ? 'minmax(0, 7fr) minmax(0, 5fr)' : 'minmax(0, 1fr)' }, alignItems: 'start' }}>
        <Panel
          title="Últimas compras"
          actions={recentPurchases.length > 0 && (
            <>
              {purchSelectMode && selectedPurch.size > 0 && (
                <Button className="select-in" variant="outlined" startIcon={<Delete sx={{ fontSize: 20 }} />} onClick={() => setPurchDeleteConfirm(true)} sx={{ flexShrink: 0 }}>
                  Eliminar ({selectedPurch.size})
                </Button>
              )}
              <SelectToggle active={purchSelectMode} onToggle={() => { setPurchSelectMode(m => !m); setSelectedPurch(new Set()) }} />
            </>
          )}
        >
          {purchListLoading ? (
            <ListSkeleton rows={4} />
          ) : recentPurchases.length === 0 ? (
            <Box sx={{ px: 3, pb: 4, pt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>Sin compras todavía</Typography>
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Inicia una compra desde un presupuesto activo</Typography>
              </Box>
              <Button variant="outlined" onClick={() => navigate('/budgets')}>Ver presupuestos</Button>
            </Box>
          ) : (
            <>
              {recentPurchases.map((p, i) => (
                <Box key={p.id}>
                  <SelectableRow
                    selectMode={purchSelectMode}
                    selected={selectedPurch.has(p.id)}
                    onToggle={() => togglePurchSelect(p.id)}
                    onOpen={() => navigate(`/purchases/${p.id}`)}
                    selectLabel={`Seleccionar compra ${p.name}`}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.35 }} noWrap>{p.name}</Typography>
                      <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>
                        {p.profiles?.full_name}{p.date ? `  ·  ${fmtDate(p.date)}` : ''}
                      </Typography>
                    </Box>
                    <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, flexShrink: 0, textAlign: 'right' }}>
                      {fmtMoney(p.total_amount || 0)}
                    </Typography>
                  </SelectableRow>
                  {i < recentPurchases.length - 1 && <RowDivider />}
                </Box>
              ))}
              <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 0.75, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
                  Mostrando {recentPurchases.length} de {purchases.length}
                </Typography>
                {!purchSelectMode && (
                  <Button endIcon={<ArrowForward sx={{ fontSize: 18 }} />} onClick={() => navigate('/purchases')} sx={{ px: 1 }}>Ver todas</Button>
                )}
              </Box>
            </>
          )}
        </Panel>

        {/* Equipo — solo si hay miembros */}
        {members.length > 0 && (
          <Panel title={`Equipo · ${members.length} miembro${members.length > 1 ? 's' : ''}`}>
            <Box sx={{ pb: 1 }}>
              {members.map(m => (
                <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 2, sm: 2.5 }, py: 0.75, minHeight: 52 }}>
                  <Avatar
                    src={m.profiles?.avatar_url}
                    alt={m.profiles?.full_name || m.profiles?.email || 'Miembro del equipo'}
                    sx={{ width: 36, height: 36, bgcolor: 'action.selected', color: 'primary.main' }}
                  >
                    {m.profiles?.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.35 }}>
                      {m.profiles?.full_name || m.profiles?.email}
                    </Typography>
                    <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', textTransform: 'capitalize', lineHeight: 1.35 }}>{m.role}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Panel>
        )}
      </Box>

      <ConfirmDialog
        open={purchDeleteConfirm}
        title="Eliminar compras"
        confirmLabel="Eliminar"
        loadingLabel="Eliminando…"
        loading={purchDeleting}
        onCancel={() => setPurchDeleteConfirm(false)}
        onConfirm={handleBulkDeletePurch}
      >
        <Typography sx={{ fontSize: FS.body }}>¿Eliminar <strong>{selectedPurch.size}</strong> compra{selectedPurch.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.</Typography>
        <NameList names={selectedPurchNames} />
      </ConfirmDialog>

      <ConfirmDialog
        open={stockConfirm}
        title="Desactivar productos"
        danger={false}
        confirmLabel="Desactivar"
        loadingLabel="Desactivando…"
        loading={stockDeactivating}
        onCancel={() => setStockConfirm(false)}
        onConfirm={handleBulkDeactivateStock}
      >
        <Typography sx={{ fontSize: FS.body }}>¿Desactivar <strong>{selectedStock.size}</strong> producto{selectedStock.size > 1 ? 's' : ''}? Dejarán de aparecer en el inventario activo.</Typography>
        <NameList names={selectedStockNames} />
      </ConfirmDialog>

    </Box>
  )
}
