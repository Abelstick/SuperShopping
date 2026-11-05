import { Box, Typography } from '@mui/material'
import { FS } from '@/theme/tokens'

// Estado vacío: icono + título + qué hacer a continuación. Sin caja: es un aviso, no un objeto.
export default function EmptyState({ icon, title, body, action }) {
  return (
    <Box sx={{ px: 3, py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
      <Box sx={{ width: 64, height: 64, borderRadius: '20px', bgcolor: 'action.selected', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
      <Box sx={{ maxWidth: 360 }}>
        <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, textWrap: 'balance' }}>{title}</Typography>
        {body && <Typography sx={{ fontSize: FS.body, color: 'text.secondary', mt: 0.5, textWrap: 'balance' }}>{body}</Typography>}
      </Box>
      {action}
    </Box>
  )
}
