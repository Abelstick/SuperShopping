import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { SnackbarProvider } from 'notistack'
import { router } from './routes'
import { theme } from './theme'
import { useAuthStore } from './features/auth/store/authStore'
import { useAppStore } from './store/appStore'
import PWAUpdateBanner from './shared/components/PWAUpdateBanner'

export default function App() {
  const { initialize, refreshSession } = useAuthStore()
  const bumpRefreshSignal = useAppStore((s) => s.bumpRefreshSignal)

  useEffect(() => {
    let unsub = null
    let cancelled = false
    initialize().then((fn) => {
      if (cancelled) fn?.()
      else unsub = fn
    })
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        await refreshSession()
        bumpRefreshSignal()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  return (
    // El modo lo gobierna appStore + bindThemeModeToDocument: MUI no guarda ni escribe el esquema
    <ThemeProvider theme={theme} colorSchemeNode={null} storageManager={null} noSsr>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={3000}
      >
        <PWAUpdateBanner />
        <RouterProvider router={router} />
      </SnackbarProvider>
    </ThemeProvider>
  )
}
