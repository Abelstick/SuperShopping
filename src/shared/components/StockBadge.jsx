import { Box, Typography, useTheme } from '@mui/material'
import { Warning } from '@mui/icons-material'

// Stock bajo = tono coral + icono + texto (nunca solo color)
export default function StockBadge({ children }) {
  const st = useTheme().palette.stock.agotado
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: '8px', bgcolor: st.tint, border: 1, borderColor: st.line, color: st.text }}>
      <Warning sx={{ fontSize: 16, color: st.icon }} />
      <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>{children}</Typography>
    </Box>
  )
}
