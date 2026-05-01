import { Box, CircularProgress, Typography } from '@mui/material'
import { ShoppingCart } from '@mui/icons-material'

export default function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
      <ShoppingCart sx={{ fontSize: 48, color: 'primary.main', animation: 'pulse 1.5s infinite' }} />
      <CircularProgress color="primary" />
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Box>
  )
}
