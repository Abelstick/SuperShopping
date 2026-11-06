import { useEffect, useRef } from 'react'
import { Box, Button, ButtonBase, Card, CircularProgress, Collapse, IconButton, Tooltip, Typography, useTheme } from '@mui/material'
import { Add, Done, ErrorOutlined, ExpandLess, ExpandMore, Warning } from '@mui/icons-material'
import { FS, NUM } from '@/theme/tokens'
import { fmtMoney } from '@/shared/utils/format'
import { budgetStatus } from '@/shared/utils/budget'
import { BudgetMeter } from '@/shared/components/ui'

function Figure({ label, value, color }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>{label}</Typography>
      <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, lineHeight: 1.4, color }} noWrap>{value}</Typography>
    </Box>
  )
}

// Lo que queda: con objetivo, disponible o excedido; es lo primero que hay que saber en caja
function useBalance(totalSpent, budget) {
  const st = useTheme().vars.palette.stock
  const { hasLimit, over, near, remaining } = budgetStatus(totalSpent, budget)
  return {
    hasLimit,
    label: over ? 'Excedido' : 'Disponible',
    value: fmtMoney(over ? -Math.abs(remaining) : remaining),
    color: over ? st.agotado.text : near ? st.riesgo.text : 'text.primary',
    iconColor: over ? st.agotado.icon : st.riesgo.icon,
    over,
    near,
  }
}

function BalanceIcon({ bal }) {
  if (bal.over) return <ErrorOutlined sx={{ fontSize: 15, color: bal.iconColor, flexShrink: 0 }} />
  if (bal.near) return <Warning sx={{ fontSize: 15, color: bal.iconColor, flexShrink: 0 }} />
  return null
}

// ── Móvil y tablet: ticket fijo al alcance del pulgar ────────────────────────
// Informa su altura real (cambia al ampliarse) para que la lista reserve ese espacio y nunca quede tapada.
export function SpendDock({ totalSpent, budget, itemCount, expanded, onToggleExpanded, onAdd, onFinish, completing, onHeightChange }) {
  const bal = useBalance(totalSpent, budget)
  const toggleLabel = expanded ? 'Reducir resumen del gasto' : 'Ampliar resumen del gasto'
  const dockRef = useRef(null)

  useEffect(() => {
    const dock = dockRef.current
    if (!dock || !onHeightChange) return undefined
    const observer = new ResizeObserver(() => onHeightChange(dock.getBoundingClientRect().height))
    observer.observe(dock)
    return () => observer.disconnect()
  }, [onHeightChange])

  return (
    <Box
      ref={dockRef}
      component="aside"
      aria-label="Resumen del gasto"
      sx={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 15,
        bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider',
        boxShadow: (t) => t.vars.palette.system.barShadow,
        px: 2, pt: 1.25, pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Box sx={{ maxWidth: 720, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {bal.hasLimit && <BudgetMeter spent={totalSpent} limit={budget} labels={false} />}

        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ display: 'grid', gridTemplateColumns: bal.hasLimit ? 'repeat(3, minmax(0, 1fr))' : 'minmax(0, 1fr)', gap: 1.5, pt: 0.25, pb: 0.5 }}>
            {bal.hasLimit && <Figure label="Presupuesto" value={fmtMoney(budget)} />}
            {bal.hasLimit && <Figure label={bal.label} value={bal.value} color={bal.color} />}
            <Figure label="Items" value={itemCount} />
          </Box>
        </Collapse>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Agregar producto">
            <IconButton
              aria-label="Agregar producto"
              onClick={onAdd}
              sx={{ width: 52, height: 52, flexShrink: 0, border: 1.5, borderColor: 'primary.main', color: 'primary.main', borderRadius: '12px', '&:hover': { bgcolor: 'action.selected' } }}
            >
              <Add />
            </IconButton>
          </Tooltip>

          <ButtonBase
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            aria-label={toggleLabel}
            sx={{ flexGrow: 1, minWidth: 0, minHeight: 52, justifyContent: 'flex-start', gap: 0.25, px: 0.5, borderRadius: '10px', textAlign: 'left' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ ...NUM, fontSize: 22, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }} noWrap>{fmtMoney(totalSpent)}</Typography>
              {bal.hasLimit ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: bal.color, minWidth: 0 }}>
                  <BalanceIcon bal={bal} />
                  <Typography sx={{ ...NUM, fontSize: FS.meta, fontWeight: 600, color: 'inherit', lineHeight: 1.35 }} noWrap>
                    {bal.label} {bal.value}
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>Gastado · {itemCount} en carrito</Typography>
              )}
            </Box>
            {expanded ? <ExpandMore sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} /> : <ExpandLess sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />}
          </ButtonBase>

          <Button
            variant="contained"
            aria-label="Finalizar compra"
            onClick={onFinish}
            disabled={completing || itemCount === 0}
            startIcon={completing ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ minHeight: 52, flexShrink: 0, borderRadius: '12px', px: 2.25 }}
          >
            {completing ? 'Finalizando…' : 'Finalizar'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

// ── Escritorio: ticket lateral ───────────────────────────────────────────────
export function SpendTicket({ totalSpent, budget, itemCount, onAdd, onFinish, completing }) {
  const bal = useBalance(totalSpent, budget)
  return (
    <Card component="section" aria-label="Resumen del gasto" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Gastado · {itemCount} en carrito</Typography>
        <Typography sx={{ ...NUM, fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em' }}>{fmtMoney(totalSpent)}</Typography>
      </Box>
      {bal.hasLimit && (
        <>
          <BudgetMeter spent={totalSpent} limit={budget} labels={false} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Figure label="Presupuesto" value={fmtMoney(budget)} />
            <Box sx={{ minWidth: 0, textAlign: 'right' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                <BalanceIcon bal={bal} />
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{bal.label}</Typography>
              </Box>
              <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, lineHeight: 1.4, color: bal.color }}>{bal.value}</Typography>
            </Box>
          </Box>
        </>
      )}
      <Button
        fullWidth variant="contained" size="large"
        startIcon={completing ? <CircularProgress size={16} color="inherit" /> : <Done />}
        onClick={onFinish}
        disabled={completing || itemCount === 0}
      >
        {completing ? 'Finalizando…' : 'Finalizar compra'}
      </Button>
      <Button fullWidth variant="outlined" startIcon={<Add />} onClick={onAdd}>Agregar producto</Button>
    </Card>
  )
}
