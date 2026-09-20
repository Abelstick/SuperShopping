import { Box, Skeleton, Typography } from '@mui/material'
import { ShoppingCart } from '@mui/icons-material'

export default function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <Box role="status" aria-live="polite" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2, bgcolor: 'background.default' }}>
      <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'primary.main', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShoppingCart sx={{ fontSize: 24 }} />
      </Box>
      <Skeleton variant="rounded" width={160} height={8} />
      <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>{message}</Typography>
    </Box>
  )
}
