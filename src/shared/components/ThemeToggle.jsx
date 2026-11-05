import { IconButton, Tooltip } from '@mui/material'
import { DarkMode, LightMode } from '@mui/icons-material'
import { useAppStore } from '@/store/appStore'

// Suscripción propia: al alternar el tema solo se vuelve a renderizar este botón, no el layout.
export default function ThemeToggle() {
  const themeMode = useAppStore((s) => s.themeMode)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const isDark = themeMode === 'dark'
  const label = isDark ? 'Modo claro' : 'Modo oscuro'

  return (
    <Tooltip title={label}>
      <IconButton onClick={toggleTheme} aria-label={label} sx={{ color: 'text.secondary', flexShrink: 0 }}>
        {isDark ? <LightMode sx={{ fontSize: 20 }} /> : <DarkMode sx={{ fontSize: 20 }} />}
      </IconButton>
    </Tooltip>
  )
}
