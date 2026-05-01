import { useEffect } from 'react'
import {
  Drawer, Box, Typography, List, ListItem, Avatar, Divider,
  Chip, CircularProgress,
} from '@mui/material'
import { History } from '@mui/icons-material'
import { useInventoryStore } from '../store/inventoryStore'

const ACTION_LABELS = { created: 'Creado', updated: 'Actualizado', quantity_changed: 'Cantidad modificada', deleted: 'Desactivado' }
const ACTION_COLORS = { created: 'success', updated: 'info', quantity_changed: 'warning', deleted: 'error' }

export default function ProductHistoryDrawer({ open, product, onClose }) {
  const { history, fetchProductHistory } = useInventoryStore()

  useEffect(() => {
    if (open && product) fetchProductHistory(product.id)
  }, [open, product?.id])

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 400 } } } }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <History color="primary" />
          <Typography variant="h6" fontWeight={700}>Historial: {product?.name}</Typography>
        </Box>

        {history.length === 0 ? (
          <Typography color="text.secondary">No hay historial registrado.</Typography>
        ) : (
          <List disablePadding>
            {history.map((h, i) => (
              <Box key={h.id}>
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <Avatar sx={{ mr: 2, width: 36, height: 36, bgcolor: 'primary.light', fontSize: 14 }}>
                    {h.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={600}>{h.profiles?.full_name || 'Desconocido'}</Typography>
                      <Chip size="small" label={ACTION_LABELS[h.action] || h.action} color={ACTION_COLORS[h.action] || 'default'} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">{new Date(h.created_at).toLocaleString()}</Typography>
                    {h.changes && Object.keys(h.changes).length > 0 && (
                      <Box sx={{ mt: 0.5, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {Object.entries(h.changes).map(([k, v]) => (
                          <Typography key={k} variant="caption" display="block" color="text.secondary">{k}: {String(v)}</Typography>
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
