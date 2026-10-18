import { Box, Typography, useTheme } from '@mui/material'
import { CheckCircle, Block } from '@mui/icons-material'

// Un color = un significado: borrador neutro · activo índigo (marca) · completado verde (meta cumplida) · cancelado neutro
const STATUS_LABELS = { draft: 'Borrador', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado' }

export default function BudgetStatusChip({ status }) {
  const theme = useTheme()
  const known = STATUS_LABELS[status] ? status : 'draft'
  const skin = {
    draft:     { bg: theme.vars.palette.action.hover, fg: theme.vars.palette.text.secondary, Icon: null },
    active:    { bg: theme.vars.palette.action.selected, fg: theme.vars.palette.primary.main, Icon: null },
    completed: { bg: theme.alpha(theme.vars.palette.success.main, 0.14), fg: theme.vars.palette.success.main, Icon: CheckCircle },
    cancelled: { bg: theme.vars.palette.action.hover, fg: theme.vars.palette.text.secondary, Icon: Block },
  }[known]

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: '8px', bgcolor: skin.bg, color: skin.fg }}>
      {skin.Icon && <skin.Icon sx={{ fontSize: 16 }} />}
      <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>{STATUS_LABELS[known]}</Typography>
    </Box>
  )
}
