// Piezas de interfaz compartidas por todos los módulos. No conocen stores ni datos de negocio:
// reciben valores ya calculados y solo deciden cómo se ven.
import { createElement } from 'react'
import {
  Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Fab, IconButton, Portal, Skeleton, Typography, useTheme,
} from '@mui/material'
import { ArrowBack, ErrorOutlined, Warning } from '@mui/icons-material'
import { FS, NUM, CHROME } from '@/theme/tokens'
import { budgetStatus } from '@/shared/utils/budget'
import { categoryIconOf } from '@/shared/constants/categoryIcons'
import { fmtMoney } from '@/shared/utils/format'

// ── Estructura de página ─────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, onBack, backLabel, actions, children, ...rest }) {
  return (
    <Box {...rest} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap', minHeight: 44 }}>
      {onBack && (
        <IconButton aria-label={backLabel} onClick={onBack} sx={{ ml: -1, flexShrink: 0 }}>
          <ArrowBack fontSize="small" />
        </IconButton>
      )}
      <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
        <Typography component="h1" sx={{ fontSize: { xs: FS.pageXs, md: FS.page }, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>
          {title}
        </Typography>
        {subtitle && <Box sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary', mt: 0.5 }}>{subtitle}</Box>}
        {children}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>{actions}</Box>}
    </Box>
  )
}

// Sección sin caja: la estructura la dan el título y el espacio
export function Section({ title, count, caption, actions, children, gap = 1.5, sx }) {
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap, minWidth: 0, ...sx }}>
      {(title || actions) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', minHeight: 32 }}>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{title}</Typography>
              {count != null && <Typography component="span" sx={{ ...NUM, fontSize: FS.body, color: 'text.secondary' }}>{count}</Typography>}
            </Box>
            {caption && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{caption}</Typography>}
          </Box>
          {actions && <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</Box>}
        </Box>
      )}
      {children}
    </Box>
  )
}

// Caja con título, para contenido que necesita un fondo propio (listas, gráficos)
export function Panel({ title, caption, icon, actions, children, sx, ...rest }) {
  return (
    <Card component="section" {...rest} sx={{ minWidth: 0, overflow: 'hidden', ...sx }}>
      {(title || actions) && (
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minHeight: 44 }}>
          {icon && <Box sx={{ display: 'flex', color: 'text.secondary' }}>{icon}</Box>}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{title}</Typography>
            {caption && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{caption}</Typography>}
          </Box>
          {actions}
        </Box>
      )}
      {children}
    </Card>
  )
}

// Separador interno de las listas: arranca alineado con el texto
export function RowDivider({ inset = 2 }) {
  return <Box aria-hidden sx={{ height: '1px', bgcolor: 'divider', mx: { xs: inset, sm: inset + 0.5 } }} />
}

// ── Cifras ───────────────────────────────────────────────────────────────────

// Varias cifras en una sola caja, separadas por líneas finas, en lugar de una tarjeta por dato
export function StatGrid({ items, columns = { xs: 2, md: 4 } }) {
  const gridTemplateColumns = Object.fromEntries(
    Object.entries(columns).map(([bp, n]) => [bp, `repeat(${n}, minmax(0, 1fr))`])
  )
  return (
    <Card sx={{ display: 'grid', gridTemplateColumns, gap: '1px', bgcolor: 'divider', overflow: 'hidden' }}>
      {items.map((it) => <Stat key={it.label} {...it} />)}
    </Card>
  )
}

function Stat({ icon, label, value, sub, valueColor, subTone, loading, empty }) {
  const st = useTheme().vars.palette.stock
  const subColor = subTone ? st[subTone].text : 'text.secondary'
  return (
    <Box sx={{ bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', minWidth: 0 }}>
        {icon}
        <Typography component="span" sx={{ fontSize: FS.meta, color: 'inherit', lineHeight: 1.35 }}>{label}</Typography>
      </Box>
      {loading ? (
        <>
          <Skeleton variant="text" width="55%" sx={{ fontSize: 20 }} />
          <Skeleton variant="text" width="75%" sx={{ fontSize: FS.meta }} />
        </>
      ) : empty ? (
        <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Sin datos</Typography>
      ) : (
        <>
          <Typography sx={{ ...NUM, fontSize: 20, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em', color: valueColor || 'text.primary', overflowWrap: 'anywhere' }}>{value}</Typography>
          {sub && <Typography sx={{ ...NUM, fontSize: FS.meta, color: subColor, fontWeight: subTone ? 600 : 400, lineHeight: 1.35 }}>{sub}</Typography>}
        </>
      )}
    </Box>
  )
}

// Medidor de presupuesto: el mismo en toda la app. Estado = color + textura + texto.
export function BudgetMeter({ spent, limit, labels = true, height = 8, spentLabel }) {
  const st = useTheme().vars.palette.stock
  const { over, near, ratio, pct } = budgetStatus(spent, limit)
  const fill = over ? st.agotado.icon : near ? st.riesgo.icon : 'primary.main'
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
      <Box
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(pct, 100)}
        aria-label={`${pct} % del presupuesto${over ? ', excedido' : near ? ', cerca del límite' : ''}`}
        sx={{ height, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden', flexShrink: 0 }}
      >
        <Box
          sx={{
            height: '100%', width: '100%', borderRadius: 99, bgcolor: fill,
            transform: `scaleX(${Math.min(ratio, 1)})`, transformOrigin: 'left',
            transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), background-color 140ms',
            // Excedido se distingue también por la textura, no solo por el color
            backgroundImage: over ? 'repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,255,255,0.28) 6px 12px)' : 'none',
          }}
        />
      </Box>
      {labels && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>
            {spentLabel ?? `${fmtMoney(spent)} de ${fmtMoney(limit)}`}
          </Typography>
          {over ? <StatusPill tone="over" icon={ErrorOutlined}>Excedido</StatusPill>
            : near ? <StatusPill tone="warn" icon={Warning}>Cerca del límite</StatusPill>
              : <Typography component="span" sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }}>{pct} %</Typography>}
        </Box>
      )}
    </Box>
  )
}

// Barra de progreso de un ranking (nombre + valor + proporción)
export function RankBar({ name, value, max, formattedValue, color }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Typography sx={{ fontSize: FS.body, minWidth: 0 }} noWrap>{name}</Typography>
        <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 700, flexShrink: 0, textAlign: 'right' }}>{formattedValue}</Typography>
      </Box>
      <Box aria-hidden sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 99, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: '100%', transform: `scaleX(${pct})`, transformOrigin: 'left', bgcolor: color || 'primary.main', borderRadius: 99, transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </Box>
    </Box>
  )
}

export function ChartTooltip({ title, children }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '10px', p: 1.5, boxShadow: 3 }}>
      <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', mb: 0.25 }}>{title}</Typography>
      {children}
    </Box>
  )
}

// ── Estados ──────────────────────────────────────────────────────────────────

// Píldora de estado: tono + icono + texto (nunca solo color)
export function StatusPill({ tone = 'neutral', icon: Icon, children, sx, ...rest }) {
  const theme = useTheme()
  const st = theme.vars.palette.stock
  const skin = {
    over: { bg: st.agotado.tint, fg: st.agotado.text, ic: st.agotado.icon },
    warn: { bg: st.riesgo.tint, fg: st.riesgo.text, ic: st.riesgo.icon },
    brand: { bg: theme.vars.palette.action.selected, fg: theme.vars.palette.primary.main, ic: theme.vars.palette.primary.main },
    neutral: { bg: theme.vars.palette.action.hover, fg: theme.vars.palette.text.primary, ic: theme.vars.palette.text.secondary },
  }[tone]
  return (
    <Box {...rest} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: 99, bgcolor: skin.bg, color: skin.fg, flexShrink: 0, maxWidth: '100%', ...sx }}>
      {Icon && <Icon sx={{ fontSize: 15, color: skin.ic }} />}
      <Typography component="span" noWrap sx={{ ...NUM, fontSize: FS.meta, fontWeight: 600, color: 'inherit', lineHeight: 1.5 }}>{children}</Typography>
    </Box>
  )
}

// Identidad de una categoría: icono sobre su color. Sin categoría, un icono neutro.
export function CategoryIcon({ category, size = 36 }) {
  const theme = useTheme()
  const color = category?.color || theme.vars.palette.text.disabled
  return (
    <Box
      aria-hidden
      sx={{
        width: size, height: size, borderRadius: size > 28 ? '10px' : '8px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: `color-mix(in srgb, ${color} 16%, transparent)`,
        color: `color-mix(in srgb, ${color} 72%, ${theme.vars.palette.text.primary})`,
      }}
    >
      {createElement(categoryIconOf(category?.icon), { sx: { fontSize: Math.round(size * 0.58) } })}
    </Box>
  )
}

// ── Acciones ─────────────────────────────────────────────────────────────────

// Acción principal de una pantalla: botón flotante al alcance del pulgar en móvil, botón en la cabecera desde tablet
export function PrimaryAction({ icon, label, onClick, variant = 'contained' }) {
  return (
    <>
      <Button variant={variant} startIcon={icon} onClick={onClick} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>{label}</Button>
      <Portal>
        <Fab
          variant="extended"
          onClick={onClick}
          sx={{
            display: { xs: 'inline-flex', sm: 'none' }, position: 'fixed', zIndex: 12,
            right: 16, bottom: `calc(${CHROME.bottomNav + 16}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          {icon}
          {label}
        </Fab>
      </Portal>
    </>
  )
}

// Barra de acciones fija sobre el menú inferior, solo en móvil
export function MobileActionBar({ children }) {
  return (
    <Portal>
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' }, gap: 1, position: 'fixed', zIndex: 12, left: 0, right: 0,
          bottom: `calc(${CHROME.bottomNav}px + env(safe-area-inset-bottom, 0px))`,
          px: 2, py: 1.25, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider',
        }}
      >
        {children}
      </Box>
    </Portal>
  )
}

// Fila de chips con desplazamiento propio: la página nunca se desplaza en horizontal
export function ChipRow({ children, label }) {
  return (
    <Box
      role="group"
      aria-label={label}
      data-hscroll
      sx={{
        display: 'flex', gap: 1, overflowX: 'auto', mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 }, py: 0.25,
        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, flexWrap: { xs: 'nowrap', md: 'wrap' },
      }}
    >
      {children}
    </Box>
  )
}

export function FilterChip({ selected, label, icon, onClick, ...rest }) {
  return (
    <Chip
      clickable
      label={label}
      icon={icon}
      aria-pressed={selected}
      onClick={onClick}
      {...rest}
      sx={{
        flexShrink: 0, height: { xs: 40, md: 34 }, px: 0.5,
        bgcolor: selected ? 'action.selected' : 'background.paper',
        color: selected ? 'primary.main' : 'text.primary',
        border: 1, borderColor: selected ? 'primary.main' : 'divider',
        '&&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
        '&.Mui-focusVisible': { bgcolor: selected ? 'action.selected' : 'background.paper' },
      }}
    />
  )
}

// ── Diálogos ─────────────────────────────────────────────────────────────────

export function NameList({ names }) {
  const shown = names.slice(0, 5)
  const rest = names.length - shown.length
  return (
    <Box component="ul" sx={{ m: 0, mt: 2, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {shown.map((n, i) => <li key={`${n}-${i}`}><Typography component="span" sx={{ fontSize: FS.body, fontWeight: 600 }}>{n}</Typography></li>)}
      {rest > 0 && <li><Typography component="span" sx={{ fontSize: FS.body, color: 'text.secondary' }}>+{rest} más</Typography></li>}
    </Box>
  )
}

// Confirmación: nombra lo afectado; cancelar a la izquierda, confirmar a la derecha.
// `danger` es exclusivo de borrados irreversibles: es el único uso del rojo.
export function ConfirmDialog({ open, title, subtitle, icon, danger = true, confirmLabel, loadingLabel, loading, onCancel, onConfirm, children }) {
  const iconSkin = danger
    ? { bgcolor: 'error.main', color: 'error.contrastText' }
    : { bgcolor: 'action.selected', color: 'primary.main' }
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {icon && <Box sx={{ p: 1, borderRadius: '10px', display: 'flex', flexShrink: 0, ...iconSkin }}>{icon}</Box>}
          <Box sx={{ minWidth: 0 }}>
            <Box component="span" sx={{ display: 'block' }}>{title}</Box>
            {subtitle && <Typography component="span" sx={{ display: 'block', fontSize: FS.body, fontWeight: 400, color: 'text.secondary', letterSpacing: 0 }}>{subtitle}</Typography>}
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained" color={danger ? 'error' : 'primary'} onClick={onConfirm} disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading && loadingLabel ? loadingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
