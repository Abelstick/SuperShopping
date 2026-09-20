import { createTheme } from '@mui/material/styles'

// ── Sistema visual: Material moderno, tonal, semántico ───────────────────────
// Un color = un solo significado:
//   índigo  → marca, acción primaria, foco, estado activo
//   verde   → SOLO flujos positivos (ingresos, abonos, metas)
//   coral   → SOLO salidas de capital, déficit, gastos excedidos (y stock agotado)
//   ámbar   → advertencia, umbral por alcanzar (y stock en riesgo)
//   rojo    → SOLO confirmación de borrado irreversible
// Oscuro: Slate-950 base, Slate-900 barras, Slate-800 tarjetas. Nunca #000.
const FONT = '"Roboto Flex Variable", "Roboto Flex", Roboto, system-ui, -apple-system, sans-serif'

// Escala de 4 tamaños: 48 (dato hero) · 20 (títulos y KPIs) · 15 (texto) · 13 (meta)
const SIZE = { hero: '3rem', title: '1.25rem', body: '0.9375rem', meta: '0.8125rem' }

// Radios fijos: 8 controles · 12 tarjetas · 16 modales
const RADIUS = { control: 8, card: 12, modal: 16 }

const tokens = {
  light: {
    ground: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    bar: '#FFFFFF',
    ink: '#0F172A',
    inkMuted: '#475569',
    inkDisabled: '#64748B',
    line: 'rgba(15,23,42,0.08)',
    lineStrong: 'rgba(15,23,42,0.16)',
    brand: '#4F46E5',
    brandHover: '#4338CA',
    brandText: '#4F46E5',
    brandLight: '#6366F1',
    brandTint: 'rgba(79,70,229,0.10)',
    onBrand: '#FFFFFF',
    greenText: '#047857',
    coralText: '#9F1239',
    coralIcon: '#E11D48',
    coralTint: '#FFF1F2',
    coralLine: 'rgba(244,63,94,0.32)',
    amberText: '#92400E',
    amberIcon: '#B45309',
    amberTint: '#FFFBEB',
    amberLine: 'rgba(245,158,11,0.40)',
    red: '#DC2626',
    redHover: '#B91C1C',
    redText: '#DC2626',
    hover: 'rgba(15,23,42,0.05)',
    cardShadow: '0 1px 2px rgba(15,23,42,0.04)',
    overlayShadow: '0 16px 40px rgba(15,23,42,0.16)',
  },
  dark: {
    ground: '#020617',
    surface: '#1E293B',
    surfaceAlt: '#0F172A',
    bar: '#0F172A',
    ink: '#F1F5F9',
    inkMuted: '#94A3B8',
    inkDisabled: '#7C8AA0',
    line: 'rgba(255,255,255,0.08)',
    lineStrong: 'rgba(255,255,255,0.16)',
    brand: '#4F46E5',
    brandHover: '#4338CA',
    brandText: '#818CF8',
    brandLight: '#A5B4FC',
    brandTint: 'rgba(129,140,248,0.16)',
    onBrand: '#FFFFFF',
    greenText: '#34D399',
    coralText: '#FDA4AF',
    coralIcon: '#FB7185',
    coralTint: 'rgba(244,63,94,0.14)',
    coralLine: 'rgba(244,63,94,0.40)',
    amberText: '#FCD34D',
    amberIcon: '#FBBF24',
    amberTint: 'rgba(245,158,11,0.14)',
    amberLine: 'rgba(245,158,11,0.40)',
    red: '#DC2626',
    redHover: '#B91C1C',
    redText: '#F87171',
    hover: 'rgba(255,255,255,0.06)',
    cardShadow: 'none',
    overlayShadow: '0 16px 40px rgba(0,0,0,0.6)',
  },
}

const typography = {
  fontFamily: FONT,
  h1: { fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, fontSize: SIZE.hero },
  h2: { fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3, fontSize: SIZE.title },
  h3: { fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3, fontSize: SIZE.title },
  h4: { fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3, fontSize: SIZE.title },
  h5: { fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3, fontSize: SIZE.title },
  h6: { fontWeight: 700, letterSpacing: 0, lineHeight: 1.4, fontSize: SIZE.body },
  subtitle1: { fontWeight: 700, lineHeight: 1.4, fontSize: SIZE.body },
  subtitle2: { fontWeight: 700, lineHeight: 1.4, fontSize: SIZE.body },
  body1: { lineHeight: 1.5, fontSize: SIZE.body },
  body2: { lineHeight: 1.5, fontSize: SIZE.body },
  button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: SIZE.body },
  caption: { letterSpacing: 0, fontSize: SIZE.meta, lineHeight: 1.5 },
  overline: { letterSpacing: 0, fontWeight: 600, fontSize: SIZE.meta, textTransform: 'none', lineHeight: 1.5 },
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const t = (props, ms = 140) => props.map(p => `${p} ${ms}ms ${EASE}`).join(', ')
const MOBILE = '@media (max-width:1023.95px)'

const components = (mode, c) => ({
  MuiCssBaseline: {
    styleOverrides: {
      '*': { boxSizing: 'border-box' },
      body: {
        fontFamily: FONT,
        fontVariantNumeric: 'tabular-nums',
        scrollbarWidth: 'thin',
        scrollbarColor: `${c.lineStrong} transparent`,
      },
      ':focus-visible': { outline: `2px solid ${c.brandText}`, outlineOffset: 2 },
    },
  },

  MuiButtonBase: {
    defaultProps: { disableRipple: true },
    styleOverrides: {
      root: { '&.Mui-focusVisible': { outline: `2px solid ${c.brandText}`, outlineOffset: 2 } },
    },
  },

  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: RADIUS.control,
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: 0,
        boxShadow: 'none',
        minHeight: 40,
        transition: t(['background-color', 'border-color', 'color', 'transform'], 140),
        '&:hover': { boxShadow: 'none' },
        '&:active': { transform: 'scale(0.98)' },
        [MOBILE]: { minHeight: 44 },
      },
      // MUI v7+ ya no aplica containedError/Success/Warning: el color sale de ownerState
      contained: ({ ownerState }) => {
        const map = {
          error:   [c.red, c.redHover, '#FFFFFF'],
          success: ['#10B981', '#059669', '#0F172A'],
          warning: ['#F59E0B', '#D97706', '#0F172A'],
        }
        const [bg, hover, fg] = map[ownerState.color] || [c.brand, c.brandHover, c.onBrand]
        return {
          backgroundColor: bg,
          color: fg,
          '&:hover': { backgroundColor: hover },
          '&.Mui-disabled': { backgroundColor: c.line, color: c.inkDisabled },
        }
      },
      outlined: {
        borderWidth: 1,
        borderColor: c.lineStrong,
        color: c.ink,
        '&:hover': { borderWidth: 1, borderColor: c.brandText, backgroundColor: c.brandTint },
      },
      text: { '&:hover': { backgroundColor: c.hover } },
      sizeLarge: { padding: '12px 24px', fontSize: SIZE.body },
      sizeMedium: { padding: '8px 16px' },
      sizeSmall: { padding: '8px 12px', fontSize: SIZE.body },
    },
  },

  MuiCard: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        borderRadius: RADIUS.card,
        border: `1px solid ${c.line}`,
        boxShadow: c.cardShadow,
      },
    },
  },
  MuiCardContent: {
    styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } },
  },

  MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },

  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: 'none',
        backgroundImage: 'none',
        backgroundColor: c.bar,
        color: c.ink,
        borderBottom: `1px solid ${c.line}`,
      },
    },
  },

  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundImage: 'none',
        backgroundColor: c.bar,
        color: c.ink,
        border: 'none',
        borderRight: `1px solid ${c.line}`,
      },
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: RADIUS.control,
        padding: '8px 12px',
        margin: '2px 0',
        minHeight: 44,
        transition: t(['background-color']),
        '&:hover': { backgroundColor: c.hover },
        '&.Mui-selected': {
          backgroundColor: c.brandTint,
          '&:hover': { backgroundColor: c.brandTint },
        },
      },
    },
  },
  MuiListItemIcon: { styleOverrides: { root: { minWidth: 36 } } },

  MuiTextField: {
    defaultProps: { variant: 'outlined', size: 'small' },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: RADIUS.control,
          '& fieldset': { borderColor: c.lineStrong, transition: t(['border-color']) },
          '&:hover fieldset': { borderColor: c.brandText },
          '&.Mui-focused fieldset': { borderColor: c.brandText, borderWidth: 2 },
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: RADIUS.control,
        '& fieldset': { borderColor: c.lineStrong },
        '&:hover fieldset': { borderColor: c.brandText },
        '&.Mui-focused fieldset': { borderColor: c.brandText, borderWidth: 2 },
      },
    },
  },
  MuiSelect: { styleOverrides: { outlined: { borderRadius: RADIUS.control } } },

  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 600, fontSize: SIZE.meta, borderRadius: RADIUS.control, height: 28 },
      sizeSmall: { height: 24, fontSize: SIZE.meta, borderRadius: RADIUS.control },
    },
  },

  MuiAvatar: { styleOverrides: { root: { fontWeight: 700, fontSize: SIZE.body } } },

  MuiDialog: {
    styleOverrides: {
      // Móvil (<640px): el modal es un bottom sheet, salvo que sea fullScreen
      paper: ({ ownerState }) => ({
        borderRadius: RADIUS.modal,
        backgroundImage: 'none',
        border: `1px solid ${c.line}`,
        boxShadow: c.overlayShadow,
        ...(ownerState?.fullScreen ? {} : {
          '@media (max-width:639.95px)': {
            '&&': {
              margin: 0, position: 'fixed', bottom: 0, left: 0, right: 0,
              width: '100%', maxWidth: '100%', maxHeight: '90vh', borderRadius: '16px 16px 0 0',
            },
          },
        }),
      }),
    },
  },
  MuiDialogTitle: {
    styleOverrides: { root: { fontWeight: 700, fontSize: SIZE.title, lineHeight: 1.3, padding: '24px 24px 8px' } },
  },
  MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px' } } },
  MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px 24px', gap: 8 } } },

  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: RADIUS.control,
        fontSize: SIZE.meta,
        fontWeight: 600,
        backgroundColor: mode === 'dark' ? '#F1F5F9' : '#0F172A',
        color: mode === 'dark' ? '#0F172A' : '#F8FAFC',
        padding: '8px 12px',
      },
      arrow: { color: mode === 'dark' ? '#F1F5F9' : '#0F172A' },
    },
  },

  MuiDivider: { styleOverrides: { root: { borderColor: c.line } } },

  MuiLinearProgress: {
    styleOverrides: {
      root: { borderRadius: RADIUS.control, overflow: 'hidden' },
      bar: { borderRadius: RADIUS.control },
    },
  },

  MuiAlert: {
    styleOverrides: { root: { borderRadius: RADIUS.card, fontWeight: 500, fontSize: SIZE.body } },
  },

  MuiTab: {
    styleOverrides: {
      root: {
        fontWeight: 600, textTransform: 'none', fontSize: SIZE.body, minHeight: 44, letterSpacing: 0,
        '&.Mui-selected': { color: c.brandText },
      },
    },
  },
  MuiTabs: {
    styleOverrides: { indicator: { backgroundColor: c.brandText, height: 2, borderRadius: 1 } },
  },

  MuiBottomNavigation: {
    styleOverrides: {
      root: {
        height: 64,
        borderTop: `1px solid ${c.line}`,
        backgroundColor: c.bar,
      },
    },
  },
  MuiBottomNavigationAction: {
    styleOverrides: {
      root: {
        color: c.inkMuted,
        minWidth: 0,
        minHeight: 44,
        padding: '8px 4px',
        '&.Mui-selected': { color: c.brandText },
        '& .MuiBottomNavigationAction-label': { fontSize: SIZE.meta, fontWeight: 600, '&.Mui-selected': { fontSize: SIZE.meta } },
      },
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: RADIUS.control,
        transition: t(['background-color']),
        '&:hover': { backgroundColor: c.hover },
        [MOBILE]: { minWidth: 44, minHeight: 44 },
      },
    },
  },

  MuiCheckbox: { styleOverrides: { root: { [MOBILE]: { padding: 10 } } } },

  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: RADIUS.control,
        margin: '2px 4px',
        fontSize: SIZE.body,
        fontWeight: 500,
        padding: '8px 12px',
        minHeight: 44,
        '&:hover': { backgroundColor: c.hover },
        '&.Mui-selected': { backgroundColor: c.brandTint },
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: RADIUS.card,
        border: `1px solid ${c.line}`,
        boxShadow: c.overlayShadow,
        backgroundImage: 'none',
        minWidth: 200,
      },
      list: { padding: 4 },
    },
  },

  MuiToggleButton: {
    styleOverrides: {
      root: {
        borderRadius: `${RADIUS.control}px !important`,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: SIZE.body,
        minHeight: 44,
        border: `1px solid ${c.lineStrong} !important`,
        '&.Mui-selected': { backgroundColor: c.brandTint, color: c.brandText },
      },
    },
  },
  MuiToggleButtonGroup: { styleOverrides: { root: { gap: 4 } } },

  MuiSkeleton: {
    styleOverrides: { root: { borderRadius: RADIUS.control, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' } },
  },
})

const build = (mode) => {
  const c = tokens[mode]
  return createTheme({
    breakpoints: { values: { xs: 0, sm: 640, md: 1024, lg: 1280, xl: 1536 } },
    palette: {
      mode,
      primary:   { main: c.brandText, light: c.brandLight, dark: c.brandHover, contrastText: mode === 'dark' ? '#0F172A' : '#FFFFFF' },
      secondary: { main: mode === 'dark' ? '#94A3B8' : '#64748B', contrastText: mode === 'dark' ? '#0F172A' : '#FFFFFF' },
      error:     { main: c.red, light: c.redText, dark: c.redHover, contrastText: '#FFFFFF' },
      warning:   { main: c.amberText, light: '#F59E0B', dark: '#78350F', contrastText: '#FFFFFF' },
      success:   { main: c.greenText, light: '#34D399', dark: '#047857', contrastText: '#FFFFFF' },
      info:      { main: c.brandText, contrastText: mode === 'dark' ? '#0F172A' : '#FFFFFF' },
      background: { default: c.ground, paper: c.surface },
      text: { primary: c.ink, secondary: c.inkMuted, disabled: c.inkDisabled },
      divider: c.line,
      action: {
        hover: c.hover,
        selected: c.brandTint,
        disabled: mode === 'dark' ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.38)',
        disabledBackground: c.line,
      },
      // Tokens semánticos del dominio: estado del stock de la despensa.
      // Sin verde: el verde es solo para flujos positivos.
      stock: {
        agotado:   { text: c.coralText, icon: c.coralIcon, tint: c.coralTint, line: c.coralLine },
        riesgo:    { text: c.amberText, icon: c.amberIcon, tint: c.amberTint, line: c.amberLine },
        saludable: { text: c.ink, icon: c.inkMuted, tint: c.surfaceAlt, line: c.line },
      },
      // Tokens de sistema usados por pantallas
      system: { brand: c.brand, brandTint: c.brandTint, lineStrong: c.lineStrong, surfaceAlt: c.surfaceAlt, positive: c.greenText },
    },
    typography,
    shape: { borderRadius: RADIUS.control },
    components: components(mode, c),
  })
}

export const theme = build('light')
export const darkTheme = build('dark')

export const motion = { ease: EASE, fast: 140, base: 240 }
