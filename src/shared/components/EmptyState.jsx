import { Box, Card, Typography } from '@mui/material'

// Estado vacío: icono + título + qué hacer a continuación
export default function EmptyState({ icon, title, body, action }) {
  return (
    <Card sx={{ px: 3, py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, borderStyle: 'dashed' }}>
      <Box sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: 'action.hover', color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
      <Box>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{title}</Typography>
        {body && <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>{body}</Typography>}
      </Box>
      {action}
    </Card>
  )
}
