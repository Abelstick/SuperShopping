import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Skeleton, Button,
  ToggleButton, ToggleButtonGroup, useTheme,
} from '@mui/material'
import {
  TrendingUp, Repeat, Category as CategoryIcon, PriceChange,
  ShoppingBasket, Warning, Schedule, EventBusy,
} from '@mui/icons-material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer,
} from 'recharts'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import { fmtMoney, fmtMonth } from '@/shared/utils/format'
import { ChartTooltip, PageHeader, Panel, RankBar, StatGrid, StatusPill } from '@/shared/components/ui'
import { FS, NUM, reveal } from '@/theme/tokens'


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

const PANEL_BODY = { px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 1 }
const RANK_LIST = { ...PANEL_BODY, display: 'flex', flexDirection: 'column', gap: 2 }
const TILE_GRID = { ...PANEL_BODY, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }

// Fila compacta: un producto y su dato clave
function InsightTile({ name, meta, pill }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: '12px', border: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.35 }} noWrap>{name}</Typography>
        <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>{meta}</Typography>
      </Box>
      {pill}
    </Box>
  )
}

const TONE_TO_PILL = { agotado: 'over', riesgo: 'warn', brand: 'brand', neutral: 'neutral' }

function StackTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((a, p) => a + (p.value || 0), 0)
  return (
    <ChartTooltip title={fmtMonth(label)}>
      {payload.filter((p) => p.value > 0).map((p) => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.fill, flexShrink: 0 }} />
          <Typography sx={{ fontSize: FS.meta, flexGrow: 1 }}>{p.dataKey}</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.meta, fontWeight: 700 }}>{fmtMoney(p.value)}</Typography>
        </Box>
      ))}
      <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, mt: 0.5, pt: 0.5, borderTop: 1, borderColor: 'divider' }}>
        Total: {fmtMoney(total)}
      </Typography>
    </ChartTooltip>
  )
}

const NO_DATA = <Typography sx={{ ...PANEL_BODY, fontSize: FS.body, color: 'text.secondary' }}>Sin datos suficientes.</Typography>

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ConsumptionAnalysisPage() {
  const theme = useTheme()
  const { currentWorkspace } = useWorkspaceStore()
  const { allItems, fetchAllItems, loading } = usePurchaseStore()
  const [period, setPeriod] = useState(PERIODS[2]) // 12 meses por defecto
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)

  // Misma carga de siempre; ahora se recoge el `{ error }` que ya devuelve
  useEffect(() => {
    if (!currentWorkspace) return
    let cancelled = false
    fetchAllItems(currentWorkspace.id)
      .then((r) => { if (!cancelled) setLoadError(r?.error ? { message: r.error.message || 'Sin detalle del servidor' } : null) })
      .catch((e) => { if (!cancelled) setLoadError({ message: e?.message || 'Sin detalle del servidor' }) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, retryTick])

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
      const color = i.categories?.color || theme.vars.palette.text.disabled
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
    if (othersTotal > 0) chartCategories.push({ name: 'Otras', color: theme.vars.palette.text.disabled, total: othersTotal })

    return { ranked: top, chartData: months.map((m) => byMonth[m]), chartCategories }
  }, [filteredItems, theme])

  const totalSpend = productStats.reduce((a, p) => a + p.spend, 0)
  const distinctProducts = productStats.length
  const topCategory = categoryData.ranked[0]
  const topVolatile = priceVolatility[0]
  const hasData = allItems.length > 0
  const showSkeleton = loading && !hasData
  const failedWithoutData = Boolean(loadError) && !hasData
  const emptyForPeriod = hasData && !loading && filteredItems.length === 0

  // Un aumento de precio pesa más como gasto: coral sobre 40 %, ámbar sobre 15 %
  const variationTone = (v) => (v > 40 ? 'agotado' : v > 15 ? 'riesgo' : 'neutral')

  const chartSummary = categoryData.chartData.length
    ? `Gasto por categoría: ${categoryData.chartData.map((d) => `${fmtMonth(d.month)} ${fmtMoney(Object.entries(d).filter(([k]) => k !== 'month').reduce((a, [, v]) => a + v, 0))}`).join(', ')}`
    : ''

  const kpis = [
    { icon: <ShoppingBasket sx={{ fontSize: 17 }} />, label: 'Productos distintos', value: distinctProducts },
    { icon: <CategoryIcon sx={{ fontSize: 17 }} />, label: 'Categoría con más gasto', value: topCategory ? topCategory.name : '—', sub: topCategory ? fmtMoney(topCategory.total) : null },
    {
      icon: <PriceChange sx={{ fontSize: 17 }} />,
      label: 'Mayor variación de precio',
      value: topVolatile ? topVolatile.name : '—',
      sub: topVolatile ? `+${Math.round(topVolatile.variation)}%` : null,
      subTone: topVolatile && variationTone(topVolatile.variation) !== 'neutral' ? variationTone(topVolatile.variation) : undefined,
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 } }}>
      {/* Pantalla de lectura: sin acción primaria, el control principal es el período */}
      <PageHeader
        {...reveal(0)}
        title="Análisis de consumo"
        subtitle="Patrones detectados en tu historial de compras"
        actions={(
          <ToggleButtonGroup
            aria-label="Período"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
            value={period.key}
            exclusive
            onChange={(e, key) => key && setPeriod(PERIODS.find((p) => p.key === key))}
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.key} value={p.key} sx={{ px: { xs: 1, sm: 2 }, flex: { xs: 1, sm: 'none' }, whiteSpace: 'nowrap' }}>{p.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      />

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      {showSkeleton ? (
        <>
          <Skeleton variant="rectangular" height={84} sx={{ borderRadius: '16px' }} />
          <Skeleton variant="rectangular" height={110} sx={{ borderRadius: '16px' }} />
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' } }}>
            <Skeleton variant="rectangular" height={260} sx={{ borderRadius: '16px' }} />
            <Skeleton variant="rectangular" height={260} sx={{ borderRadius: '16px' }} />
          </Box>
        </>
      ) : failedWithoutData ? null : !hasData ? (
        <EmptyState
          icon={<ShoppingBasket sx={{ fontSize: 28 }} />}
          title="Todavía no hay compras registradas"
          body="Los patrones de consumo aparecerán aquí cuando completes algunas compras."
        />
      ) : emptyForPeriod ? (
        <EmptyState
          icon={<EventBusy sx={{ fontSize: 28 }} />}
          title="Sin compras en este período"
          body="Prueba con un período más amplio."
          action={<Button variant="outlined" onClick={() => setPeriod(PERIODS[3])}>Ver todo</Button>}
        />
      ) : (
        <>
          {/* ── Lo gastado y lo que más pesa ── */}
          <Box {...reveal(1)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
              <TrendingUp sx={{ fontSize: 18 }} />
              <Typography component="h2" sx={{ fontSize: FS.meta, fontWeight: 600, color: 'inherit' }}>Gastado en el período</Typography>
            </Box>
            <Typography sx={{ ...NUM, fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em' }}>
              {fmtMoney(totalSpend)}
            </Typography>
          </Box>
          <Box {...reveal(2)}><StatGrid items={kpis} columns={{ xs: 1, sm: 3 }} /></Box>

          {/* ── Gasto por categoría ── */}
          <Box {...reveal(3)} sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 7fr) minmax(0, 5fr)' } }}>
            <Panel title="Gasto por categoría" caption={`Últimos ${categoryData.chartData.length} meses`}>
              {categoryData.chartData.length === 0 ? NO_DATA : (
                <Box sx={{ ...PANEL_BODY, px: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box role="img" aria-label={chartSummary}>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={categoryData.chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke={theme.vars.palette.divider} vertical={false} />
                        <XAxis dataKey="month" tickMargin={8} tickFormatter={fmtMonth} tick={{ fontSize: FS.meta, fill: theme.vars.palette.text.secondary }} tickLine={false} axisLine={false} minTickGap={16} />
                        <YAxis width={56} tick={{ fontSize: FS.meta, fill: theme.vars.palette.text.secondary }} tickLine={false} axisLine={false} tickFormatter={(v) => `S/ ${Number(v).toLocaleString('en-US')}`} />
                        <RechartTooltip content={<StackTooltip />} cursor={{ fill: theme.alpha(theme.vars.palette.text.primary, 0.04) }} />
                        {categoryData.chartCategories.map((c) => (
                          <Bar key={c.name} dataKey={c.name} stackId="cat" fill={c.color} radius={[0, 0, 0, 0]} isAnimationActive={false} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  {/* Leyenda visible: el color no es el único portador de la categoría */}
                  <Box component="ul" sx={{ m: 0, px: 1, listStyle: 'none', display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.75 }}>
                    {categoryData.chartCategories.map((c) => (
                      <Box component="li" key={c.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: c.color, flexShrink: 0 }} />
                        <Typography component="span" sx={{ fontSize: FS.meta }}>{c.name}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Panel>
            <Panel title="Ranking de categorías">
              {categoryData.ranked.length === 0 ? NO_DATA : (
                <Box sx={RANK_LIST}>
                  {categoryData.ranked.map((c) => (
                    <RankBar key={c.name} name={c.name} value={c.total} max={categoryData.ranked[0].total} formattedValue={fmtMoney(c.total)} color={c.color} />
                  ))}
                </Box>
              )}
            </Panel>
          </Box>

          {/* ── Productos más comprados ── */}
          <Box {...reveal(4)} sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' } }}>
            <Panel title="Más frecuentes" caption="Por cantidad de compras">
              {byFrequency.length === 0 ? NO_DATA : (
                <Box sx={RANK_LIST}>
                  {byFrequency.map((p) => (
                    <RankBar key={p.key} name={p.name} value={p.count} max={maxCount} formattedValue={`${p.count} compra${p.count !== 1 ? 's' : ''}`} />
                  ))}
                </Box>
              )}
            </Panel>
            <Panel title="Mayor gasto" caption="Por dinero acumulado">
              {bySpend.length === 0 ? NO_DATA : (
                <Box sx={RANK_LIST}>
                  {bySpend.map((p) => (
                    <RankBar key={p.key} name={p.name} value={p.spend} max={maxSpend} formattedValue={fmtMoney(p.spend)} />
                  ))}
                </Box>
              )}
            </Panel>
          </Box>

          {/* ── Frecuencia de recompra ── */}
          <Box {...reveal(5)}>
            <Panel title="Cuándo vas a reponer" caption="Según el intervalo promedio entre tus compras" icon={<Repeat sx={{ fontSize: 20 }} />}>
              {cadenceList.length === 0 ? (
                <Typography sx={{ ...PANEL_BODY, fontSize: FS.body, color: 'text.secondary' }}>Compra el mismo producto al menos dos veces para ver su frecuencia.</Typography>
              ) : (
                <Box sx={TILE_GRID}>
                  {cadenceList.map((p) => {
                    const { avgDays, nextEstimate } = p.cadence
                    const overdue = nextEstimate < 0
                    const dueText = nextEstimate === 0 ? 'Hoy' : nextEstimate === 1 ? 'Mañana'
                      : overdue ? `Hace ${Math.abs(nextEstimate)}d` : `En ${nextEstimate}d`
                    const tone = overdue ? 'riesgo' : nextEstimate <= 2 ? 'brand' : 'neutral'
                    return (
                      <InsightTile
                        key={p.key}
                        name={p.name}
                        meta={`Cada ~${avgDays} días`}
                        pill={<StatusPill tone={TONE_TO_PILL[tone]} icon={overdue ? Warning : Schedule}>{dueText}</StatusPill>}
                      />
                    )
                  })}
                </Box>
              )}
            </Panel>
          </Box>

          {/* ── Variación de precios ── */}
          <Box {...reveal(6)}>
            <Panel title="Variación de precios" caption="Productos cuyo precio cambió más entre compras" icon={<PriceChange sx={{ fontSize: 20 }} />}>
              {priceVolatility.length === 0 ? (
                <Typography sx={{ ...PANEL_BODY, fontSize: FS.body, color: 'text.secondary' }}>Sin variaciones de precio detectadas todavía.</Typography>
              ) : (
                <Box sx={TILE_GRID}>
                  {priceVolatility.map((p) => (
                    <InsightTile
                      key={p.key}
                      name={p.name}
                      meta={`${fmtMoney(p.min)} – ${fmtMoney(p.max)}`}
                      pill={<StatusPill tone={TONE_TO_PILL[variationTone(p.variation)]} icon={TrendingUp}>+{Math.round(p.variation)}%</StatusPill>}
                    />
                  ))}
                </Box>
              )}
            </Panel>
          </Box>
        </>
      )}
    </Box>
  )
}
