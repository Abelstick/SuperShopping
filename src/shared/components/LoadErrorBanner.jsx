import { Box, Button, Typography, useTheme } from '@mui/material'
import { ErrorOutlined } from '@mui/icons-material'

// Error de carga: causa concreta + Reintentar. Ámbar = advertencia (el rojo es solo para borrado).
export default function LoadErrorBanner({ message, onRetry }) {
  const st = useTheme().palette.stock
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', p: 2,
        border: 1, borderColor: st.riesgo.line, borderRadius: '12px', bgcolor: st.riesgo.tint,
      }}
    >
      <ErrorOutlined sx={{ color: st.riesgo.icon }} />
      <Box sx={{ flexGrow: 1, minWidth: 200 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
          No se pudieron cargar los datos. Revisá tu conexión e intentá de nuevo.
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Detalle: {message}</Typography>
      </Box>
      <Button variant="outlined" onClick={onRetry}>Reintentar</Button>
    </Box>
  )
}
