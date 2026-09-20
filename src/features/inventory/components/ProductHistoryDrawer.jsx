import { useEffect, useState } from 'react'
import { Drawer, Box, Typography, List, ListItem, Avatar, Divider, Skeleton, IconButton, Button, useTheme } from '@mui/material'
import { History, Close } from '@mui/icons-material'
import { useInventoryStore } from '../store/inventoryStore'

// Tamaños: 20 título · 15 texto · 13 meta
const FS = { title: 20, body: 15, meta: 13 }
const ACTION_LABELS = { created: 'Creado', updated: 'Actualizado', quantity_changed: 'Cantidad modificada', deleted: 'Desactivado' }

// Fecha dd/mm/aaaa hh:mm
const fmtDateTime = (d) => new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

export default function ProductHistoryDrawer({ open, product, onClose }) {
  const theme = useTheme()
  const st = theme.palette.stock
  const { history, fetchProductHistory } = useInventoryStore()
  // Qué producto ya cargó (y con qué error): evita mostrar el historial de otro producto
  const [result, setResult] = useState({ id: null, error: null })
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (!open || !product) return
    let cancelled = false
    fetchProductHistory(product.id)
      .then((r) => { if (!cancelled) setResult({ id: product.id, error: r?.error || null }) })
      .catch((e) => { if (!cancelled) setResult({ id: product.id, error: e || {} }) })
    return () => { cancelled = true }
  }, [open, product?.id, retryTick])

  const loading = Boolean(open && product) && result.id !== product?.id
  const handleClose = () => { setResult({ id: null, error: null }); onClose() }

  // Un color = un significado: ámbar para cambios de cantidad, índigo para creación, neutro el resto
  const chipStyle = (action) => {
    if (action === 'quantity_changed') return { bgcolor: st.riesgo.tint, color: st.riesgo.text, borderColor: st.riesgo.line }
    if (action === 'created') return { bgcolor: 'action.selected', color: 'primary.main', borderColor: 'transparent' }
    return { bgcolor: 'action.hover', color: 'text.primary', borderColor: 'transparent' }
  }

  return (
    <Drawer anchor="right" open={open} onClose={handleClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 400 } } } }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <History color="primary" />
          <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, flexGrow: 1, lineHeight: 1.3 }}>Historial: {product?.name}</Typography>
          <IconButton aria-label="Cerrar" onClick={handleClose}><Close fontSize="small" /></IconButton>
        </Box>

        {loading ? (
          <Box>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, py: 2 }}>
                <Skeleton variant="rectangular" width={40} height={40} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton variant="text" width="60%" sx={{ fontSize: FS.body }} />
                  <Skeleton variant="text" width="40%" sx={{ fontSize: FS.meta }} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : result.error ? (
          <Box role="alert" sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
            <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>No se pudieron cargar los datos. Revisá tu conexión e intentá de nuevo.</Typography>
            <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Detalle: {result.error.message || 'Sin detalle del servidor'}</Typography>
            <Button variant="outlined" onClick={() => { setResult({ id: null, error: null }); setRetryTick((t) => t + 1) }}>Reintentar</Button>
          </Box>
        ) : history.length === 0 ? (
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>No hay historial registrado.</Typography>
        ) : (
          <List disablePadding>
            {history.map((h, i) => (
              <Box key={h.id}>
                <ListItem alignItems="flex-start" sx={{ px: 0, py: 2, gap: 2 }}>
                  <Avatar sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main' }}>
                    {h.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>{h.profiles?.full_name || 'Desconocido'}</Typography>
                      <Box sx={{ px: 1, py: 0.5, borderRadius: '8px', border: 1, ...chipStyle(h.action) }}>
                        <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>{ACTION_LABELS[h.action] || h.action}</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(h.created_at)}</Typography>
                    {h.changes && Object.keys(h.changes).length > 0 && (
                      <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: '8px' }}>
                        {Object.entries(h.changes).map(([k, v]) => (
                          <Typography key={k} sx={{ fontSize: FS.meta, color: 'text.secondary', display: 'block' }}>{k}: {String(v)}</Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </ListItem>
                {i < history.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  )
}
