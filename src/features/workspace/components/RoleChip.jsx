import { Box, Typography } from '@mui/material'
import { Shield, Edit, Visibility } from '@mui/icons-material'
import { ROLE_LABELS } from '../constants'

// Propietario = índigo (marca). Editor y Lector = neutro, con icono distinto: el rol no usa verde ni rojo.
export default function RoleChip({ role }) {
  const owner = role === 'owner'
  const Icon = owner ? Shield : role === 'editor' ? Edit : Visibility
  return (
    <Box
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: '8px',
        bgcolor: owner ? 'action.selected' : 'action.hover',
        color: owner ? 'primary.main' : 'text.primary',
      }}
    >
      <Icon sx={{ fontSize: 16, color: owner ? 'primary.main' : 'text.secondary' }} />
      <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>
        {ROLE_LABELS[role] ?? role}
      </Typography>
    </Box>
  )
}
