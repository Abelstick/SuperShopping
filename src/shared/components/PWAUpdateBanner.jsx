import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useSnackbar } from 'notistack'
import { Button } from '@mui/material'

export default function PWAUpdateBanner() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (offlineReady) {
      const key = enqueueSnackbar('App lista para usar sin conexión', {
        variant: 'success',
        onClose: () => setOfflineReady(false),
      })
      return () => closeSnackbar(key)
    }
  }, [offlineReady])

  useEffect(() => {
    if (needRefresh) {
      const key = enqueueSnackbar('Nueva versión disponible', {
        variant: 'info',
        persist: true,
        action: () => (
          <>
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                closeSnackbar(key)
                updateServiceWorker(true)
              }}
            >
              Actualizar
            </Button>
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                closeSnackbar(key)
                setNeedRefresh(false)
              }}
            >
              Ignorar
            </Button>
          </>
        ),
      })
      return () => closeSnackbar(key)
    }
  }, [needRefresh])

  return null
}
