import { createTheme } from '@mui/material/styles'
import { FS } from './tokens'

// ── Sistema visual "Cuenta clara" ────────────────────────────────────────────
// Un color = un solo significado:
//   pino    → marca, acción primaria, foco, selección, dentro del límite
//   ámbar   → advertencia: cerca del límite, stock en riesgo, pendiente
//   tomate  → excedido, déficit, stock por reponer
//   rojo    → SOLO confirmación de borrado irreversible
// Neutros con un leve matiz verde. Todo par de texto cumple 4.5:1 (WCAG AA) en ambos esquemas.
const FONT = '"Roboto Flex Variable", "Roboto Flex", Roboto, system-ui, -apple-system, sans-serif'

const SIZE = { body: `${FS.body / 16}rem`, meta: `${FS.meta / 16}rem`, title: `${FS.title / 16}rem`, dialog: `${FS.dialog / 16}rem`, hero: `${FS.hero / 16}rem` }

// Radios fijos: 10 controles · 16 tarjetas · 24 hojas y modales · 999 píldoras
const RADIUS = { control: 10, card: 16, modal: 24, pill: 999 }

const tokens = {
  light: {
    ground: '#F3F5F1',
    surface: '#FFFFFF',
    surfaceAlt: '#E9EDE6',
    bar: '#FFFFFF',
    ink: '#16211B',
    inkMuted: '#526057',
    inkDisabled: '#66736A',
    line: 'rgba(22,33,27,0.10)',
    lineStrong: 'rgba(22,33,27,0.20)',
    brand: '#0A6B4E',
    brandHover: '#08573F',
    brandText: '#0A6B4E',
    brandLight: '#2C9A75',
    brandTint: 'rgba(10,107,78,0.10)',
    onBrand: '#FFFFFF',
    greenText: '#0A6B4E',
    coralText: '#A92B12',
    coralIcon: '#D4431F',
    coralTint: '#FDEEE8',
    coralLine: 'rgba(212,67,31,0.30)',
    amberText: '#7A4E00',
    amberIcon: '#B8740A',
    amberTint: '#FCF3DF',
    amberLine: 'rgba(184,116,10,0.36)',
    red: '#C4231C',
    redHover: '#A31C16',
    redText: '#C4231C',
    hover: 'rgba(22,33,27,0.05)',
    cardShadow: 'none',
    floatShadow: '0 6px 16px rgba(10,60,44,0.24)',
    barShadow: '0 -6px 20px rgba(22,33,27,0.06)',
    overlayShadow: '0 16px 40px rgba(16,40,30,0.18)',
    tooltipBg: '#16211B',
    tooltipInk: '#F3F5F1',
  },
  dark: {
    ground: '#0E1411',
    surface: '#18211C',
    surfaceAlt: '#121A16',
    bar: '#141C18',
    ink: '#E9EFEA',
    inkMuted: '#9FADA4',
    inkDisabled: '#84928A',
    line: 'rgba(233,239,234,0.10)',
    lineStrong: 'rgba(233,239,234,0.20)',
    brand: '#0D7A59',
    brandHover: '#0A6B4E',
    brandText: '#5CD6A9',
    brandLight: '#8CE3C3',
    brandTint: 'rgba(92,214,169,0.14)',
    onBrand: '#FFFFFF',
    greenText: '#5CD6A9',
    coralText: '#FF9F85',
    coralIcon: '#FF8262',
    coralTint: 'rgba(255,130,98,0.14)',
    coralLine: 'rgba(255,130,98,0.36)',
    amberText: '#F3C463',
    amberIcon: '#E8AE3E',
    amberTint: 'rgba(232,174,62,0.14)',
    amberLine: 'rgba(232,174,62,0.36)',
    red: '#D9342B',
    redHover: '#BF2A22',
    redText: '#FF8B80',
    hover: 'rgba(233,239,234,0.06)',
    cardShadow: 'none',
    floatShadow: '0 6px 16px rgba(0,0,0,0.5)',
    barShadow: '0 -6px 20px rgba(0,0,0,0.3)',
    overlayShadow: '0 16px 40px rgba(0,0,0,0.6)',
    tooltipBg: '#E9EFEA',
    tooltipInk: '#16211B',
  },
}

const typography = {
  fontFamily: FONT,
  h1: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, fontSize: SIZE.hero },
  h2: { fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.3, fontSize: SIZE.title },
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
// Pantallas táctiles: controles de 44 px y campos de 16 px (iOS amplía la vista con menos de 16 px)
const TOUCH = '@media (max-width:1023.95px)'
const SHEET = '@media (max-width:639.95px)'

// `c` son referencias `var(--…)` a palette.system: el CSS se genera una sola vez y el
// esquema activo cambia solo el valor de las variables, sin recalcular estilos en JS.
const components = (c) => ({
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
      // Avisos: un solo tono sobrio; el estado lo cuenta el icono y el texto
      '.notistack-MuiContent': {
        borderRadius: RADIUS.control,
        fontFamily: FONT,
        fontSize: SIZE.body,
        fontWeight: 500,
        boxShadow: c.overlayShadow,
        backgroundColor: c.tooltipBg,
        color: c.tooltipInk,
      },
      '.notistack-MuiContent-error': { backgroundColor: c.red, color: '#FFFFFF' },
      '.notistack-MuiContent-warning': { backgroundColor: c.amberIcon, color: '#16211B' },
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
        [TOUCH]: { minHeight: 44 },
      },
      // MUI v7+ ya no aplica containedError/Success/Warning: el color sale de ownerState
      contained: ({ ownerState }) => {
        const map = {
          error:   [c.red, c.redHover, '#FFFFFF'],
          success: [c.brand, c.brandHover, c.onBrand],
          warning: [c.amberIcon, c.amberText, '#16211B'],
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

  MuiFab: {
    styleOverrides: {
      root: {
        boxShadow: c.floatShadow,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: SIZE.body,
        backgroundColor: c.brand,
        color: c.onBrand,
        '&:hover': { backgroundColor: c.brandHover },
        '&:active': { boxShadow: c.floatShadow },
      },
      extended: { borderRadius: RADIUS.card, height: 52, padding: '0 20px', gap: 8 },
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
  MuiInputBase: {
    styleOverrides: {
      root: { [TOUCH]: { fontSize: '1rem' } },
    },
  },
  MuiInputLabel: {
    styleOverrides: { root: { [TOUCH]: { fontSize: '1rem' } } },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: RADIUS.control,
        backgroundColor: c.surface,
        '& fieldset': { borderColor: c.lineStrong },
        '&:hover fieldset': { borderColor: c.brandText },
        '&.Mui-focused fieldset': { borderColor: c.brandText, borderWidth: 2 },
      },
      inputSizeSmall: { [TOUCH]: { paddingTop: 11, paddingBottom: 11 } },
    },
  },
  MuiSelect: { styleOverrides: { outlined: { borderRadius: RADIUS.control } } },

  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 600, fontSize: SIZE.meta, borderRadius: RADIUS.pill, height: 32 },
      sizeSmall: { height: 24, fontSize: SIZE.meta, borderRadius: RADIUS.pill },
    },
  },

  MuiAvatar: { styleOverrides: { root: { fontWeight: 700, fontSize: SIZE.body } } },

  MuiDialog: {
    styleOverrides: {
      // Móvil (<640px): el modal es una hoja inferior, salvo que sea fullScreen o pida quedarse arriba
      paper: ({ ownerState }) => ({
        borderRadius: RADIUS.modal,
        backgroundImage: 'none',
        border: `1px solid ${c.line}`,
        boxShadow: c.overlayShadow,
        ...(ownerState?.fullScreen ? {} : {
          [SHEET]: {
            '&&': {
              margin: 0, position: 'fixed', bottom: 0, left: 0, right: 0,
              width: '100%', maxWidth: '100%', maxHeight: '92dvh',
              borderRadius: `${RADIUS.modal}px ${RADIUS.modal}px 0 0`,
              borderBottom: 0,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              animation: `sheet-up 240ms ${EASE} both`,
            },
            '&::before': {
              content: '""', display: 'block', flexShrink: 0, alignSelf: 'center',
              width: 40, height: 4, marginTop: 10, borderRadius: RADIUS.pill, backgroundColor: c.lineStrong,
            },
          },
        }),
      }),
    },
  },
  MuiDialogTitle: {
    styleOverrides: { root: { fontWeight: 700, fontSize: SIZE.dialog, lineHeight: 1.3, letterSpacing: '-0.01em', padding: '20px 24px 8px' } },
  },
  MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px' } } },
  MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px 24px', gap: 8, [SHEET]: { padding: '12px 16px 16px', '& > .MuiButton-root': { flex: 1 } } } } },

  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: RADIUS.control,
        fontSize: SIZE.meta,
        fontWeight: 600,
        backgroundColor: c.tooltipBg,
        color: c.tooltipInk,
        padding: '8px 12px',
      },
      arrow: { color: c.tooltipBg },
    },
  },

  MuiDivider: { styleOverrides: { root: { borderColor: c.line } } },

  MuiLinearProgress: {
    styleOverrides: {
      root: { borderRadius: RADIUS.pill, overflow: 'hidden' },
      bar: { borderRadius: RADIUS.pill },
    },
  },

  MuiAlert: {
    styleOverrides: { root: { borderRadius: RADIUS.control, fontWeight: 500, fontSize: SIZE.body } },
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
    styleOverrides: { root: { minHeight: 44 }, indicator: { backgroundColor: c.brandText, height: 2, borderRadius: 1 } },
  },

  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: RADIUS.control,
        transition: t(['background-color']),
        '&:hover': { backgroundColor: c.hover },
        [TOUCH]: { minWidth: 44, minHeight: 44 },
      },
    },
  },

  MuiCheckbox: { styleOverrides: { root: { [TOUCH]: { padding: 10 } } } },

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
        minWidth: 44,
        border: `1px solid ${c.lineStrong} !important`,
        '&.Mui-selected': { backgroundColor: c.brandTint, color: c.brandText },
      },
    },
  },
  MuiToggleButtonGroup: { styleOverrides: { root: { gap: 4 } } },

  MuiSkeleton: {
    styleOverrides: { root: { borderRadius: RADIUS.control, backgroundColor: c.line } },
  },
})

const palette = (mode) => {
  const c = tokens[mode]
  const dark = mode === 'dark'
  return {
    primary:   { main: c.brandText, light: c.brandLight, dark: c.brandHover, contrastText: dark ? c.ground : '#FFFFFF' },
    secondary: { main: c.inkMuted, contrastText: dark ? c.ground : '#FFFFFF' },
    error:     { main: c.red, light: c.redText, dark: c.redHover, contrastText: '#FFFFFF' },
    warning:   { main: c.amberText, light: c.amberIcon, dark: '#5C3B00', contrastText: dark ? c.ground : '#FFFFFF' },
    success:   { main: c.greenText, light: c.brandLight, dark: c.brandHover, contrastText: dark ? c.ground : '#FFFFFF' },
    info:      { main: c.brandText, contrastText: dark ? c.ground : '#FFFFFF' },
    background: { default: c.ground, paper: c.surface },
    text: { primary: c.ink, secondary: c.inkMuted, disabled: c.inkDisabled },
    divider: c.line,
    // Con variables CSS MUI aplica estos valores por esquema (más específicos que styleOverrides)
    AppBar: { defaultBg: c.bar, darkBg: c.bar, darkColor: c.ink },
    action: {
      hover: c.hover,
      selected: c.brandTint,
      disabled: dark ? 'rgba(233,239,234,0.38)' : 'rgba(22,33,27,0.38)',
      disabledBackground: c.line,
    },
    // Tokens semánticos del dominio. Las claves históricas se conservan:
    // agotado = tomate (excedido), riesgo = ámbar (advertencia), saludable = neutro.
    stock: {
      agotado:   { text: c.coralText, icon: c.coralIcon, tint: c.coralTint, line: c.coralLine },
      riesgo:    { text: c.amberText, icon: c.amberIcon, tint: c.amberTint, line: c.amberLine },
      saludable: { text: c.ink, icon: c.inkMuted, tint: c.surfaceAlt, line: c.line },
    },
    // Tokens de sistema: todo el tema los referencia como variables CSS (ver `components`)
    system: { ...c, positive: c.greenText },
  }
}

// Un único tema con dos esquemas. Con `cssVariables`, MUI emite cada esquema como variables CSS
// (`:root` para el claro, `[data-theme="dark"]` para el oscuro) y el objeto del tema no cambia al
// alternar: cambiar de modo es cambiar un atributo en <html>, sin volver a generar estilos.
// Los colores en JS deben leerse de `theme.vars.palette` (referencias `var(--…)`), no de `theme.palette`.
const options = {
  cssVariables: { colorSchemeSelector: 'data-theme' },
  breakpoints: { values: { xs: 0, sm: 640, md: 1024, lg: 1280, xl: 1536 } },
  colorSchemes: {
    light: { palette: palette('light') },
    dark: { palette: palette('dark') },
  },
  typography,
  shape: { borderRadius: RADIUS.control },
}

// Primera pasada solo para obtener `vars` (las referencias var(--…)) con las que se escriben los overrides
const { vars } = createTheme(options)

export const theme = createTheme({ ...options, components: components(vars.palette.system) })

export const motion = { ease: EASE, fast: 140, base: 240 }
