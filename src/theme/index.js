import { createTheme, responsiveFontSizes } from '@mui/material/styles'

const typography = {
  fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
  h1: { fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 },
  h2: { fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 },
  h3: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
  h4: { fontWeight: 700, letterSpacing: '-0.018em', lineHeight: 1.25 },
  h5: { fontWeight: 600, letterSpacing: '-0.01em' },
  h6: { fontWeight: 600, letterSpacing: '-0.005em' },
  subtitle1: { fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontWeight: 600, lineHeight: 1.5, fontSize: '0.875rem' },
  body1: { lineHeight: 1.65, fontSize: '0.9375rem' },
  body2: { lineHeight: 1.6, fontSize: '0.875rem' },
  button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em', fontSize: '0.875rem' },
  caption: { letterSpacing: '0.01em', fontSize: '0.75rem' },
  overline: { letterSpacing: '0.08em', fontWeight: 700, fontSize: '0.6875rem' },
}

const shape = { borderRadius: 10 }

const components = (mode) => {
  const isDark = mode === 'dark'
  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? '#3f3f46 transparent' : '#d4d4d8 transparent',
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: isDark ? '#3f3f46' : '#d4d4d8',
            borderRadius: 10,
          },
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: '0.01em',
          boxShadow: 'none',
          transition: 'all 0.15s ease',
          '&:hover': { boxShadow: 'none', transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0)' },
        },
        contained: {
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
            boxShadow: '0 4px 14px rgba(99,102,241,0.45)',
          },
          '&.Mui-disabled': {
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
          },
        },
        containedSuccess: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.45)' },
        },
        containedError: {
          background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)', boxShadow: '0 4px 14px rgba(244,63,94,0.4)' },
        },
        outlined: {
          borderWidth: '1.5px',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)',
          '&:hover': {
            borderWidth: '1.5px',
            borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          },
        },
        text: {
          '&:hover': { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
        },
        sizeLarge: { padding: '11px 28px', fontSize: '0.9375rem', borderRadius: 10 },
        sizeMedium: { padding: '8px 20px' },
        sizeSmall: { padding: '5px 14px', fontSize: '0.8125rem', borderRadius: 7 },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 14,
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
          boxShadow: isDark
            ? '0 1px 4px rgba(0,0,0,0.4)'
            : '0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: '20px', '&:last-child': { paddingBottom: 20 } },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backgroundImage: 'none',
          backgroundColor: isDark ? '#111113' : '#ffffff',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: isDark ? '#111113' : '#fafafa',
          border: 'none',
          borderRight: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '7px 10px',
          margin: '1px 0',
          transition: 'background 0.12s ease',
          '&:hover': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
          '&.Mui-selected': {
            background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
            '&:hover': { background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)' },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 34 } },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 9,
            '& fieldset': {
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
              transition: 'border-color 0.15s',
            },
            '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)' },
            '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: '1.5px' },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' },
          '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)' },
          '&.Mui-focused fieldset': { borderColor: '#6366f1' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: { outlined: { borderRadius: 9 } },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.75rem', borderRadius: 7, height: 26 },
        sizeSmall: { height: 22, fontSize: '0.6875rem', borderRadius: 5 },
      },
    },

    MuiAvatar: {
      styleOverrides: { root: { fontWeight: 700, fontSize: '0.875rem' } },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          backgroundImage: 'none',
          boxShadow: isDark
            ? '0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)'
            : '0 24px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 7,
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: isDark ? '#27272a' : '#18181b',
          padding: '5px 10px',
        },
        arrow: { color: isDark ? '#27272a' : '#18181b' },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: { borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, overflow: 'hidden' },
        bar: { borderRadius: 99 },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontWeight: 500, fontSize: '0.875rem' },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.875rem',
          minHeight: 44,
          letterSpacing: '0',
          '&.Mui-selected': { color: '#6366f1' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#6366f1', height: 2, borderRadius: 1 },
      },
    },

    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 62,
          borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
          backgroundColor: isDark ? '#111113' : '#ffffff',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: isDark ? '#71717a' : '#a1a1aa',
          minWidth: 0,
          padding: '6px 4px',
          '&.Mui-selected': { color: '#6366f1' },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.6875rem', fontWeight: 600 },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          transition: 'background 0.12s',
          '&:hover': { background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' },
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          margin: '2px 4px',
          fontSize: '0.875rem',
          fontWeight: 500,
          padding: '7px 10px',
          '&:hover': { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
          '&.Mui-selected': { background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
          backgroundImage: 'none',
          minWidth: 180,
        },
        list: { padding: '4px' },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px !important',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
          border: isDark ? '1px solid rgba(255,255,255,0.1) !important' : '1px solid rgba(0,0,0,0.1) !important',
          '&.Mui-selected': {
            background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
            color: isDark ? '#818cf8' : '#4f46e5',
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: { root: { gap: 4 } },
    },

    MuiSkeleton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  }
}

export const theme = responsiveFontSizes(
  createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#fff' },
      secondary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2', contrastText: '#fff' },
      error:   { main: '#f43f5e', light: '#fb7185', dark: '#e11d48', contrastText: '#fff' },
      warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706', contrastText: '#fff' },
      success: { main: '#10b981', light: '#34d399', dark: '#059669', contrastText: '#fff' },
      info:    { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#fff' },
      background: { default: '#f4f4f5', paper: '#ffffff' },
      text: { primary: '#09090b', secondary: '#71717a', disabled: '#a1a1aa' },
      divider: 'rgba(0,0,0,0.07)',
      action: { hover: 'rgba(0,0,0,0.04)', selected: 'rgba(99,102,241,0.1)', disabled: 'rgba(0,0,0,0.28)' },
    },
    typography,
    shape,
    components: components('light'),
  })
)

export const darkTheme = responsiveFontSizes(
  createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#fff' },
      secondary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2', contrastText: '#fff' },
      error:   { main: '#f43f5e', light: '#fb7185', dark: '#e11d48', contrastText: '#fff' },
      warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706', contrastText: '#fff' },
      success: { main: '#10b981', light: '#34d399', dark: '#059669', contrastText: '#fff' },
      info:    { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#fff' },
      background: { default: '#09090b', paper: '#18181b' },
      text: { primary: '#fafafa', secondary: '#a1a1aa', disabled: '#52525b' },
      divider: 'rgba(255,255,255,0.07)',
      action: {
        hover: 'rgba(255,255,255,0.05)',
        selected: 'rgba(99,102,241,0.15)',
        disabled: 'rgba(255,255,255,0.28)',
        disabledBackground: 'rgba(255,255,255,0.08)',
      },
    },
    typography,
    shape,
    components: components('dark'),
  })
)
