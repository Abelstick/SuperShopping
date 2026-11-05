import { Box } from '@mui/material'
import { ShoppingCartCheckout } from '@mui/icons-material'

export default function BrandMark({ size = 32 }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size, height: size, borderRadius: `${Math.round(size * 0.3)}px`, flexShrink: 0,
        bgcolor: 'primary.main', color: 'primary.contrastText',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <ShoppingCartCheckout sx={{ fontSize: Math.round(size * 0.6) }} />
    </Box>
  )
}
