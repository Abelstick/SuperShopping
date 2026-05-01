import { useEffect, useMemo, useState } from 'react'
import {
  Box, Grid, Card, Typography, Avatar, Chip, Skeleton, Divider, Stack,
  List, ListItem, ListItemText, useTheme, Button,
  Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
} from '@mui/material'
import {
  Inventory2, Receipt, ShoppingCart, AttachMoney, Warning,
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

const ACCENTS = {
  indigo:  { bg: 'rgba(99,102,241,0.12)',  color: '#6366f1' },
  cyan:    { bg: 'rgba(6,182,212,0.12)',   color: '#06b6d4' },
  violet:  { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  emerald: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  amber:   { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  rose:    { bg: 'rgba(244,63,94,0.12)',  color: '#f43f5e' },
}
const USER_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent = 'indigo', sub, loading }) {
  const c = ACCENTS[accent]
  if (loading) return <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 2 }} />
  return (
    <Card sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', lineHeight: 1, mb: 0.25 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3, fontSize: '0.8125rem' }}>
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: sub.positive ? '#10b981' : sub.negative ? '#f43f5e' : 'text.disabled' }}>
            {sub.text}
          </Typography>
        )}
      </Box>
    </Card>
  )
}

function ChartTooltip({ active, payload, label }) {
  const theme = useTheme()
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5, boxShadow: theme.palette.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)' }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="subtitle2" fontWeight={700}>
        ${Number(payload[0].value).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
      </Typography>
    </Box>
  )
}

function UserBar({ name, amount, max, color }) {
  const pct = max > 0 ? Math.min((amount / max) * 100, 100) : 0
  return (
    <Box sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="body2" fontWeight={500}>{name}</Typography>
        <Typography variant="body2" fontWeight={700}>${amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</Typography>
      </Box>
      <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 99, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </Box>
    </Box>
  )
}

function PredictionCard({ icon, title, value, sub, accent = 'amber', loading, empty }) {
  const c = ACCENTS[accent]
  if (loading) return <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
  return (
    <Card sx={{ p: 2, borderLeft: `3px solid ${c.color}44`, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -16, right: -16, width: 64, height: 64, borderRadius: '50%', bgcolor: c.bg, pointerEvents: 'none' }} />
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Box sx={{ p: 0.75, bgcolor: c.bg, borderRadius: '7px', color: c.color, display: 'flex', flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.625rem', mb: 0.25 }}>
            {title}
          </Typography>
          {empty ? (
            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>Sin datos</Typography>
          ) : (
            <>
              <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.02em', color: c.color, lineHeight: 1.1 }}>
                {value}
              </Typography>
              {sub && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.35, fontSize: '0.6875rem' }}>{sub}</Typography>
              )}
            </>
          )}
        </Box>
      </Box>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { profile } = useAuthStore()
  const { currentWorkspace, members, fetchMembers } = useWorkspaceStore()
  const { products, fetchProducts, fetchCategories, deactivateProducts, loading: invLoading } = useInventoryStore()
  const { budgets, fetchBudgets, loading: budgLoading } = useBudgetStore()
  const { purchases, fetchPurchases, deletePurchases, getSpendingByUser, getMonthlySpending, loading: purchLoading } = usePurchaseStore()

  // ── Selection state
  const [purchSelectMode, setPurchSelectMode]       = useState(false)
  const [selectedPurch, setSelectedPurch]           = useState(new Set())
  const [purchDeleteConfirm, setPurchDeleteConfirm] = useState(false)
  const [purchDeleting, setPurchDeleting]           = useState(false)
  const [stockSelectMode, setStockSelectMode]       = useState(false)
  const [selectedStock, setSelectedStock]           = useState(new Set())
  const [stockConfirm, setStockConfirm]             = useState(false)
  const [stockDeactivating, setStockDeactivating]   = useState(false)

  useEffect(() => {
    if (currentWorkspace) {
      fetchProducts(currentWorkspace.id)
      fetchCategories(currentWorkspace.id)
      fetchBudgets(currentWorkspace.id)
      fetchPurchases(currentWorkspace.id)
      fetchMembers(currentWorkspace.id)
    }
  }, [currentWorkspace?.id])

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

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  }, [])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Header ── */}
      <Box>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.25 }}>
          {greeting},{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>
            {profile?.full_name?.split(' ')[0] || 'bienvenido'}
          </Box>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
          {currentWorkspace?.name && `${currentWorkspace.name}  ·  `}
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      {/* ── Stat cards — always 4 ── */}
      <Grid container spacing={2}>
        {[
          {
            label: 'Productos activos', value: activeProducts,
            icon: <Inventory2 sx={{ fontSize: 18 }} />, accent: 'indigo',
            sub: products.length > activeProducts ? { text: `${products.length - activeProducts} inactivo${products.length - activeProducts > 1 ? 's' : ''}`, positive: false, negative: false } : null,
          },
          {
            label: 'Presupuestos activos', value: activeBudgets,
            icon: <Receipt sx={{ fontSize: 18 }} />, accent: 'cyan',
            sub: budgets.length > activeBudgets ? { text: `${budgets.length} en total`, positive: false, negative: false } : null,
          },
          {
            label: 'Compras este mes', value: thisMonthCount,
            icon: <ShoppingCart sx={{ fontSize: 18 }} />, accent: 'violet',
            sub: spendTrend !== null
              ? { text: `${spendTrend >= 0 ? '+' : ''}${spendTrend}% vs mes anterior`, positive: spendTrend < 0, negative: spendTrend > 25 }
              : purchases.length > 0 ? { text: `${purchases.length} en total`, positive: false, negative: false } : null,
          },
          {
            label: 'Total gastado', value: `$${totalSpent.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
            icon: <AttachMoney sx={{ fontSize: 18 }} />, accent: 'emerald',
            sub: thisMonthSpend > 0 ? { text: `$${thisMonthSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })} este mes`, positive: false, negative: false } : null,
          },
        ].map(s => (
          <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
            <StatCard {...s} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* ── Charts — only when purchase data exists ── */}
      {(hasChartData || hasUserData) && (
        <Grid container spacing={2}>
          {hasChartData && (
            <Grid size={{ xs: 12, md: hasUserData ? 8 : 12 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6875rem' }}>GASTO MENSUAL</Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Últimos {monthlyData.length} meses</Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={primaryColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <RechartTooltip content={<ChartTooltip />} cursor={{ stroke: primaryColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="total" stroke={primaryColor} strokeWidth={2} fill="url(#spendGrad)" dot={false}
                      activeDot={{ r: 4, fill: primaryColor, stroke: theme.palette.background.paper, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
          )}
          {hasUserData && (
            <Grid size={{ xs: 12, md: hasChartData ? 4 : 12 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6875rem' }}>GASTO POR MIEMBRO</Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2.5 }}>Distribución del equipo</Typography>
                {[...spendingByUser].sort((a, b) => b.total - a.total).map((u, i) => (
                  <UserBar key={u.name} name={u.name} amount={u.total} max={maxUserSpent} color={USER_COLORS[i % USER_COLORS.length]} />
                ))}
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Predictions — always 4 cards ── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{ p: 0.5, bgcolor: 'rgba(245,158,11,0.12)', borderRadius: '6px', color: '#f59e0b', display: 'flex' }}>
            <AutoAwesome sx={{ fontSize: 14 }} />
          </Box>
          <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
            PREDICCIONES E INSIGHTS
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <PredictionCard
              icon={<CalendarToday sx={{ fontSize: 15 }} />}
              title="Próxima compra"
              accent="indigo"
              loading={purchLoading}
              empty={nextPurchaseDays === null}
              value={nextPurchaseDays === 0 ? 'Hoy' : nextPurchaseDays === 1 ? 'Mañana' : nextPurchaseDays < 0 ? `Hace ${Math.abs(nextPurchaseDays)}d` : `En ${nextPurchaseDays}d`}
              sub={avgDaysBetween ? `Ciclo: ${avgDaysBetween} días` : null}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <PredictionCard
              icon={<AttachMoney sx={{ fontSize: 15 }} />}
              title="Presupuesto sugerido"
              accent="emerald"
              loading={purchLoading}
              empty={avgMonthly === 0}
              value={`$${Math.round(avgMonthly * 1.1).toLocaleString('es-AR')}`}
              sub="Promedio + 10% buffer"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <PredictionCard
              icon={spendTrend !== null && spendTrend < 0 ? <TrendingDown sx={{ fontSize: 15 }} /> : <TrendingUp sx={{ fontSize: 15 }} />}
              title="Tendencia de gasto"
              accent={spendTrend === null ? 'amber' : spendTrend <= 0 ? 'emerald' : spendTrend <= 15 ? 'amber' : 'rose'}
              loading={purchLoading}
              empty={spendTrend === null}
              value={spendTrend !== null ? `${spendTrend >= 0 ? '+' : ''}${spendTrend}%` : ''}
              sub={spendTrend !== null ? `$${thisMonthSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })} vs $${lastMonthSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })} anterior` : null}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <PredictionCard
              icon={<Warning sx={{ fontSize: 15 }} />}
              title="Items en riesgo"
              accent={stockAlerts.length === 0 ? 'emerald' : lowStock.length > 0 ? 'rose' : 'amber'}
              loading={invLoading}
              empty={false}
              value={stockAlerts.length === 0 ? 'Sin alertas' : `${stockAlerts.length} producto${stockAlerts.length > 1 ? 's' : ''}`}
              sub={stockAlerts.length === 0 ? 'Stock saludable' : `${lowStock.length} agotado${lowStock.length !== 1 ? 's' : ''} · ${atRisk.length} en riesgo`}
            />
          </Grid>
        </Grid>
      </Box>

      {/* ── Main content: 2 permanent columns ── */}
      <Grid container spacing={2} alignItems="flex-start">

        {/* LEFT col — Últimas compras */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            {/* Header */}
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6875rem' }}>ACTIVIDAD RECIENTE</Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>Últimas compras</Typography>
              </Box>
              {recentPurchases.length > 0 && (
                <>
                  {purchSelectMode && selectedPurch.size > 0 && (
                    <Button size="small" color="error" variant="contained" startIcon={<Delete sx={{ fontSize: 14 }} />}
                      onClick={() => setPurchDeleteConfirm(true)} sx={{ height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                      Eliminar ({selectedPurch.size})
                    </Button>
                  )}
                  <Tooltip title={purchSelectMode ? 'Cancelar selección' : 'Seleccionar'}>
                    <Button size="small" variant={purchSelectMode ? 'outlined' : 'text'} color={purchSelectMode ? 'error' : 'inherit'}
                      onClick={() => { setPurchSelectMode(m => !m); setSelectedPurch(new Set()) }}
                      sx={{ height: 28, color: purchSelectMode ? undefined : 'text.secondary', fontSize: '0.7rem', px: 1.5, flexShrink: 0 }}>
                      {purchSelectMode ? 'Cancelar' : 'Seleccionar'}
                    </Button>
                  </Tooltip>
                  {!purchSelectMode && (
                    <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 13 }} />} onClick={() => navigate('/purchases')}
                      sx={{ color: 'text.secondary', height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                      Ver todas
                    </Button>
                  )}
                </>
              )}
            </Box>

            {recentPurchases.length === 0 ? (
              <Box sx={{ px: 2.5, py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.75, bgcolor: 'action.hover', borderRadius: '12px', color: 'text.disabled', display: 'flex' }}>
                  <ShoppingCart sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">Sin compras todavía</Typography>
                  <Typography variant="caption" color="text.disabled">Iniciá una compra desde un presupuesto activo</Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={() => navigate('/budgets')}>
                  Ver presupuestos
                </Button>
              </Box>
            ) : (
              <List disablePadding>
                {recentPurchases.map((p, i) => (
                  <Box key={p.id}>
                    <ListItem
                      sx={{ px: 2.5, py: 1.25, gap: 1.5, cursor: purchSelectMode ? 'pointer' : 'default', '&:hover': purchSelectMode ? { bgcolor: 'action.hover' } : {} }}
                      onClick={purchSelectMode ? () => togglePurchSelect(p.id) : undefined}
                    >
                      {purchSelectMode && (
                        <Checkbox size="small" checked={selectedPurch.has(p.id)} sx={{ p: 0.25 }}
                          onClick={e => { e.stopPropagation(); togglePurchSelect(p.id) }} />
                      )}
                      <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ShoppingCart sx={{ fontSize: 15, color: 'primary.main' }} />
                      </Box>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>}
                        secondary={
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {p.profiles?.full_name}{p.date ? `  ·  ${new Date(p.date).toLocaleDateString('es-AR')}` : ''}
                          </Typography>
                        }
                      />
                      <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ flexShrink: 0 }}>
                        ${(p.total_amount || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </Typography>
                    </ListItem>
                    {i < recentPurchases.length - 1 && <Divider sx={{ mx: 2.5 }} />}
                  </Box>
                ))}
              </List>
            )}
          </Card>
        </Grid>

        {/* RIGHT col — Stock + Team stacked, always visible */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>

            {/* Stock alerts — always shown */}
            <Card>
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6875rem' }}>
                    {stockAlerts.length > 0 ? 'ALERTAS DE STOCK' : 'INVENTARIO'}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    {lowStock.length > 0 ? 'Stock bajo' : atRisk.length > 0 ? 'Productos en riesgo' : 'Todo en orden'}
                  </Typography>
                </Box>
                {stockAlerts.length > 0 && (
                  <Chip
                    label={stockAlerts.length}
                    size="small"
                    sx={{ bgcolor: lowStock.length > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)', color: lowStock.length > 0 ? '#f43f5e' : '#f59e0b', fontWeight: 700, border: `1px solid ${lowStock.length > 0 ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`, height: 22, flexShrink: 0 }}
                  />
                )}
                {stockAlerts.length > 0 && stockSelectMode && selectedStock.size > 0 && (
                  <Button size="small" color="warning" variant="contained" startIcon={<Delete sx={{ fontSize: 14 }} />}
                    onClick={() => setStockConfirm(true)} sx={{ height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                    Desactivar ({selectedStock.size})
                  </Button>
                )}
                {stockAlerts.length > 0 && (
                  <Tooltip title={stockSelectMode ? 'Cancelar' : 'Seleccionar'}>
                    <Button size="small" variant={stockSelectMode ? 'outlined' : 'text'} color={stockSelectMode ? 'error' : 'inherit'}
                      onClick={() => { setStockSelectMode(m => !m); setSelectedStock(new Set()) }}
                      sx={{ height: 28, color: stockSelectMode ? undefined : 'text.secondary', fontSize: '0.7rem', px: 1, flexShrink: 0 }}>
                      {stockSelectMode ? 'Cancelar' : 'Seleccionar'}
                    </Button>
                  </Tooltip>
                )}
              </Box>

              {stockAlerts.length === 0 ? (
                <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 1, bgcolor: 'rgba(16,185,129,0.1)', borderRadius: '10px', color: '#10b981', display: 'flex' }}>
                    <CheckCircle sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Stock saludable</Typography>
                    <Typography variant="caption" color="text.disabled">Todos los productos con stock suficiente</Typography>
                  </Box>
                </Box>
              ) : (
                <List disablePadding>
                  {stockAlerts.slice(0, 7).map((p, i) => (
                    <Box key={p.id}>
                      <ListItem
                        sx={{ px: 2.5, py: 1, gap: 1.25, cursor: stockSelectMode ? 'pointer' : 'default', '&:hover': stockSelectMode ? { bgcolor: 'action.hover' } : {} }}
                        onClick={stockSelectMode ? () => toggleStockSelect(p.id) : undefined}
                      >
                        {stockSelectMode && (
                          <Checkbox size="small" checked={selectedStock.has(p.id)} sx={{ p: 0.25 }}
                            onClick={e => { e.stopPropagation(); toggleStockSelect(p.id) }} />
                        )}
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.categories?.color || '#a1a1aa', flexShrink: 0 }} />
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">{p.current_quantity} {p.unit} · mín {p.min_quantity}</Typography>}
                        />
                        <Box sx={{ fontSize: 13, flexShrink: 0 }}>
                          {p._sev === 'critical'
                            ? <Warning sx={{ fontSize: 15, color: '#f43f5e' }} />
                            : <Warning sx={{ fontSize: 15, color: '#f59e0b' }} />
                          }
                        </Box>
                      </ListItem>
                      {i < Math.min(stockAlerts.length, 7) - 1 && <Divider sx={{ mx: 2.5 }} />}
                    </Box>
                  ))}
                </List>
              )}

              <Box sx={{ px: 2.5, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
                <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 13 }} />} onClick={() => navigate('/inventory')}
                  sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  Ir al inventario
                </Button>
              </Box>
            </Card>

            {/* Team members — always rendered if members exist */}
            {members.length > 0 && (
              <Card sx={{ p: 2.5 }}>
                <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6875rem', display: 'block', mb: 0.25 }}>EQUIPO</Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, lineHeight: 1.2 }}>{members.length} miembro{members.length > 1 ? 's' : ''}</Typography>
                <Stack spacing={1.5}>
                  {members.map((m, i) => (
                    <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Avatar
                        src={m.profiles?.avatar_url}
                        sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: USER_COLORS[i % USER_COLORS.length] + '30', color: USER_COLORS[i % USER_COLORS.length], border: '2px solid', borderColor: USER_COLORS[i % USER_COLORS.length] + '40' }}
                      >
                        {m.profiles?.full_name?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8125rem', lineHeight: 1.2 }}>
                          {m.profiles?.full_name || m.profiles?.email}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'capitalize' }}>{m.role}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* ── Dialogs ── */}
      <Dialog open={purchDeleteConfirm} onClose={() => setPurchDeleteConfirm(false)}>
        <DialogTitle>Eliminar compras</DialogTitle>
        <DialogContent>
          <Typography>¿Eliminar <strong>{selectedPurch.size}</strong> compra{selectedPurch.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchDeleteConfirm(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleBulkDeletePurch} disabled={purchDeleting}>
            {purchDeleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={stockConfirm} onClose={() => setStockConfirm(false)}>
        <DialogTitle>Desactivar productos</DialogTitle>
        <DialogContent>
          <Typography>¿Desactivar <strong>{selectedStock.size}</strong> producto{selectedStock.size > 1 ? 's' : ''}? Dejarán de aparecer en el inventario activo.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockConfirm(false)}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={handleBulkDeactivateStock} disabled={stockDeactivating}>
            {stockDeactivating ? 'Desactivando…' : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
