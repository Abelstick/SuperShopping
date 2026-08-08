import { useEffect, useMemo, useState } from 'react'
import {
  Box, Card, Typography, Grid, Skeleton, Chip,
  ToggleButton, ToggleButtonGroup, useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  TrendingUp, Repeat, Category as CategoryIcon, PriceChange,
  ShoppingBasket,
} from '@mui/icons-material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer,
} from 'recharts'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import { ACCENT_KEYS } from '@/shared/constants/accents'

const PERIODS = [
  { key: '3m', label: '3 meses', months: 3 },
  { key: '6m', label: '6 meses', months: 6 },
  { key: '12m', label: '12 meses', months: 12 },
  { key: 'all', label: 'Todo', months: null },
]

function productKey(item) {
  return item.product_id || item.product_name
}

function computeCadence(dates) {
  if (dates.length < 2) return null
  const sorted = [...dates].sort()
  const gaps = []
  for (let i = 1; i < sorted.length; i++) {
    const gap = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000
    if (gap > 0) gaps.push(gap)
  }
  if (!gaps.length) return null
  const avgDays = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const last = new Date(sorted[sorted.length - 1])
  const nextEstimate = Math.round((new Date(last.getTime() + avgDays * 86400000) - new Date()) / 86400000)
  return { avgDays: Math.round(avgDays), nextEstimate }
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatTile({ icon, label, value, sub, accent = 'indigo', loading }) {
  const theme = useTheme()
  const color = theme.palette[ACCENT_KEYS[accent]].main
  if (loading) return <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
  return (
    <Card sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" fontWeight={800} noWrap sx={{ letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Card>
  )
}

function RankBar({ name, value, max, formattedValue, color, sub }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <Box sx={{ mb: 1.75, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" fontWeight={500} noWrap sx={{ minWidth: 0 }}>{name}</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0 }}>{formattedValue}</Typography>
      </Box>
      <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 99, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: '100%', transform: `scaleX(${pct / 100})`, transformOrigin: 'left', bgcolor: color, borderRadius: 99, transition: 'transform 0.4s ease' }} />
      </Box>
      {sub && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{sub}</Typography>}
    </Box>
  )
}

function ChartTooltip({ active, payload, label }) {
  const theme = useTheme()
  if (!active || !payload?.length) return null
  const total = payload.reduce((a, p) => a + (p.value || 0), 0)
  return (
    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5, boxShadow: theme.palette.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)' }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{label}</Typography>
      {payload.filter((p) => p.value > 0).map((p) => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: p.fill, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ flexGrow: 1 }}>{p.dataKey}</Typography>
          <Typography variant="caption" fontWeight={700}>S/{p.value.toFixed(0)}</Typography>
        </Box>
      ))}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5, pt: 0.5, borderTop: 1, borderColor: 'divider' }}>
        Total: S/{total.toFixed(0)}
      </Typography>
    </Box>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ConsumptionAnalysisPage() {
  const theme = useTheme()
  const { currentWorkspace } = useWorkspaceStore()
  const { allItems, fetchAllItems, loading } = usePurchaseStore()
  const [period, setPeriod] = useState(PERIODS[2]) // 12 meses por defecto

  useEffect(() => {
    if (currentWorkspace) fetchAllItems(currentWorkspace.id)
  }, [currentWorkspace?.id])

  const filteredItems = useMemo(() => {
    if (period.months == null) return allItems
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - period.months)
    return allItems.filter((i) => i.purchases?.date && new Date(i.purchases.date) >= cutoff)
  }, [allItems, period])

  // ── Per-product aggregation (frequency, spend, quantity, purchase dates) ──
  const productStats = useMemo(() => {
    const map = new Map()
    filteredItems.forEach((i) => {
      const key = productKey(i)
      if (!map.has(key)) {
        map.set(key, { key, name: i.product_name, unit: i.unit, count: 0, quantity: 0, spend: 0, dates: [], prices: [] })
      }
      const s = map.get(key)
      s.count += 1
      s.quantity += i.quantity || 0
      s.spend += i.total_price || 0
      if (i.purchases?.date) s.dates.push(i.purchases.date)
      if (i.unit_price != null) s.prices.push(Number(i.unit_price))
    })
    return [...map.values()]
  }, [filteredItems])

  const byFrequency = useMemo(() => [...productStats].sort((a, b) => b.count - a.count).slice(0, 6), [productStats])
  const bySpend = useMemo(() => [...productStats].sort((a, b) => b.spend - a.spend).slice(0, 6), [productStats])
  const maxCount = byFrequency[0]?.count || 1
  const maxSpend = bySpend[0]?.spend || 1

  // ── Repurchase cadence ──
  const cadenceList = useMemo(() => {
    return productStats
      .map((p) => ({ ...p, cadence: computeCadence(p.dates) }))
      .filter((p) => p.cadence)
      .sort((a, b) => a.cadence.nextEstimate - b.cadence.nextEstimate)
      .slice(0, 8)
  }, [productStats])

  // ── Price volatility ──
  const priceVolatility = useMemo(() => {
    return productStats
      .filter((p) => p.prices.length >= 2)
      .map((p) => {
        const min = Math.min(...p.prices)
        const max = Math.max(...p.prices)
        const avg = p.prices.reduce((a, b) => a + b, 0) / p.prices.length
        const variation = min > 0 ? ((max - min) / min) * 100 : 0
        return { ...p, min, max, avg, variation }
      })
      .filter((p) => p.variation > 0)
      .sort((a, b) => b.variation - a.variation)
      .slice(0, 8)
  }, [productStats])

  // ── Spend by category (ranking + monthly stacked chart) ──
  const categoryData = useMemo(() => {
    const totals = new Map()
    filteredItems.forEach((i) => {
      const name = i.categories?.name || 'Sin categoría'
      const color = i.categories?.color || theme.palette.text.disabled
      if (!totals.has(name)) totals.set(name, { name, color, total: 0 })
      totals.get(name).total += i.total_price || 0
    })
    const ranked = [...totals.values()].sort((a, b) => b.total - a.total)
    const top = ranked.slice(0, 6)
    const topNames = new Set(top.map((c) => c.name))

    const byMonth = {}
    filteredItems.forEach((i) => {
      const month = i.purchases?.date?.substring(0, 7)
      if (!month) return
      const rawName = i.categories?.name || 'Sin categoría'
      const name = topNames.has(rawName) ? rawName : 'Otras'
      if (!byMonth[month]) byMonth[month] = { month }
      byMonth[month][name] = (byMonth[month][name] || 0) + (i.total_price || 0)
    })
    const months = Object.keys(byMonth).sort().slice(-8)
    const chartCategories = [...top]
    const othersTotal = ranked.slice(6).reduce((a, c) => a + c.total, 0)
    if (othersTotal > 0) chartCategories.push({ name: 'Otras', color: theme.palette.text.disabled, total: othersTotal })

    return { ranked: top, chartData: months.map((m) => byMonth[m]), chartCategories }
  }, [filteredItems, theme])

  const totalSpend = productStats.reduce((a, p) => a + p.spend, 0)
  const distinctProducts = productStats.length
  const topCategory = categoryData.ranked[0]
  const topVolatile = priceVolatility[0]
  const hasData = allItems.length > 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.25 }}>
            Análisis de consumo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Patrones detectados en tu historial de compras
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          value={period.key}
          exclusive
          onChange={(e, key) => key && setPeriod(PERIODS.find((p) => p.key === key))}
        >
          {PERIODS.map((p) => (
            <ToggleButton key={p.key} value={p.key} sx={{ px: 1.5 }}>{p.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {!hasData && !loading ? (
        <Card sx={{ px: 2.5, py: 6, textAlign: 'center' }}>
          <ShoppingBasket sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body1" fontWeight={600} color="text.secondary">Todavía no hay compras registradas</Typography>
          <Typography variant="body2" color="text.disabled">Los patrones de consumo van a aparecer acá una vez que completes algunas compras.</Typography>
        </Card>
      ) : (
        <>
          {/* ── KPI row ── */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatTile
                icon={<TrendingUp sx={{ fontSize: 18 }} />} accent="emerald" loading={loading}
                label="Gastado en el período" value={`S/${totalSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatTile
                icon={<ShoppingBasket sx={{ fontSize: 18 }} />} accent="indigo" loading={loading}
                label="Productos distintos" value={distinctProducts}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatTile
                icon={<CategoryIcon sx={{ fontSize: 18 }} />} accent="cyan" loading={loading}
                label="Categoría con más gasto" value={topCategory ? topCategory.name : '—'}
                sub={topCategory ? `S/${topCategory.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : null}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatTile
                icon={<PriceChange sx={{ fontSize: 18 }} />} accent="amber" loading={loading}
                label="Mayor variación de precio" value={topVolatile ? topVolatile.name : '—'}
                sub={topVolatile ? `+${Math.round(topVolatile.variation)}%` : null}
              />
            </Grid>
          </Grid>

          {/* ── Productos más comprados ── */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>Más frecuentes</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Por cantidad de compras</Typography>
                {byFrequency.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin datos suficientes.</Typography>
                ) : byFrequency.map((p) => (
                  <RankBar
                    key={p.key} name={p.name} value={p.count} max={maxCount}
                    formattedValue={`${p.count} compra${p.count !== 1 ? 's' : ''}`}
                    color={theme.palette.primary.main}
                  />
                ))}
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>Mayor gasto</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Por dinero acumulado</Typography>
                {bySpend.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin datos suficientes.</Typography>
                ) : bySpend.map((p) => (
                  <RankBar
                    key={p.key} name={p.name} value={p.spend} max={maxSpend}
                    formattedValue={`S/${p.spend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                    color={theme.palette.success.main}
                  />
                ))}
              </Card>
            </Grid>
          </Grid>

          {/* ── Frecuencia de recompra ── */}
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ p: 0.75, bgcolor: alpha(theme.palette.info.main, 0.12), borderRadius: '8px', color: theme.palette.info.main, display: 'flex' }}>
                <Repeat sx={{ fontSize: 16 }} />
              </Box>
              <Box>
                <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>Cuándo vas a reponer</Typography>
                <Typography variant="caption" color="text.secondary">Según el intervalo promedio entre tus compras</Typography>
              </Box>
            </Box>
            {cadenceList.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Comprá el mismo producto al menos dos veces para ver su frecuencia.</Typography>
            ) : (
              <Grid container spacing={1.5}>
                {cadenceList.map((p) => {
                  const { avgDays, nextEstimate } = p.cadence
                  const overdue = nextEstimate < 0
                  const dueText = nextEstimate === 0 ? 'Hoy' : nextEstimate === 1 ? 'Mañana'
                    : overdue ? `Hace ${Math.abs(nextEstimate)}d` : `En ${nextEstimate}d`
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={p.key}>
                      <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                          Cada ~{avgDays} días
                        </Typography>
                        <Chip
                          size="small"
                          label={dueText}
                          color={overdue ? 'error' : nextEstimate <= 2 ? 'warning' : 'default'}
                          sx={{ height: 20, fontSize: '0.6875rem' }}
                        />
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>
            )}
          </Card>

          {/* ── Gasto por categoría ── */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>Gasto por categoría</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Últimos {categoryData.chartData.length} meses</Typography>
                {categoryData.chartData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin datos suficientes.</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categoryData.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} tickFormatter={(v) => `S/${v}`} />
                      <RechartTooltip content={<ChartTooltip />} cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} />
                      {categoryData.chartCategories.map((c) => (
                        <Bar key={c.name} dataKey={c.name} stackId="cat" fill={c.color} radius={[0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Ranking de categorías</Typography>
                {categoryData.ranked.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin datos suficientes.</Typography>
                ) : categoryData.ranked.map((c) => (
                  <RankBar
                    key={c.name} name={c.name} value={c.total} max={categoryData.ranked[0].total}
                    formattedValue={`S/${c.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                    color={c.color}
                  />
                ))}
              </Card>
            </Grid>
          </Grid>

          {/* ── Variación de precios ── */}
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ p: 0.75, bgcolor: alpha(theme.palette.warning.main, 0.12), borderRadius: '8px', color: theme.palette.warning.main, display: 'flex' }}>
                <PriceChange sx={{ fontSize: 16 }} />
              </Box>
              <Box>
                <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>Variación de precios</Typography>
                <Typography variant="caption" color="text.secondary">Productos cuyo precio cambió más entre compras</Typography>
              </Box>
            </Box>
            {priceVolatility.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin variaciones de precio detectadas todavía.</Typography>
            ) : (
              <Grid container spacing={1.5}>
                {priceVolatility.map((p) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={p.key}>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        S/{p.min.toFixed(2)} – S/{p.max.toFixed(2)}
                      </Typography>
                      <Chip
                        size="small"
                        label={`+${Math.round(p.variation)}%`}
                        color={p.variation > 40 ? 'error' : p.variation > 15 ? 'warning' : 'default'}
                        sx={{ height: 20, fontSize: '0.6875rem' }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Card>
        </>
      )}
    </Box>
  )
}
