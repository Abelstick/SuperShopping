import { IconButton, Tooltip } from '@mui/material'
import { DarkMode, LightMode } from '@mui/icons-material'
import { useAppStore } from '@/store/appStore'

// Suscripción propia: al alternar el tema solo se vuelve a renderizar este botón, no el layout.
export default function ThemeToggle() {
  const themeMode = useAppStore((s) => s.themeMode)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const isDark = themeMode === 'dark'

  return (
    <Tooltip title={isDark ? 'Modo claro' : 'Modo oscuro'}>
      <IconButton onClick={toggleTheme} size="small">
        {isDark ? <LightMode sx={{ fontSize: 19 }} /> : <DarkMode sx={{ fontSize: 19 }} />}
      </IconButton>
    </Tooltip>
  )
}
