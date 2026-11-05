import { useState } from 'react'
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
import { Close, ShoppingCartRounded } from '@mui/icons-material'
import { FS } from '@/theme/tokens'

const KEY = 'shopping.dismissedSessions'

const readDismissed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY)) || []) } catch { return new Set() }
}

// Recuerda que hay una compra sin finalizar. Se puede ocultar: una sesión abandonada no debe quedar como aviso eterno.
export default function ActiveShoppingBanner({ sessions, onResume }) {
  const [dismissed, setDismissed] = useState(readDismissed)
  const session = sessions.find((s) => !dismissed.has(s.id))
  if (!session) return null

  const dismiss = () => {
    const next = new Set(dismissed).add(session.id)
    setDismissed(next)
    try { localStorage.setItem(KEY, JSON.stringify([...next].slice(-20))) } catch { /* sin almacenamiento */ }
  }

  return (
    <Box
      role="status"
      className="reveal"
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, pl: 1.5, pr: 0.5, py: 0.25, mb: { xs: 1.5, sm: 3 }, minHeight: 52,
        borderRadius: '12px', bgcolor: 'action.selected', color: 'primary.main',
      }}
    >
      <ShoppingCartRounded sx={{ fontSize: 22, flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: FS.body, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }} noWrap>Compra en curso</Typography>
        <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.3 }} noWrap>{session.budgets?.name}</Typography>
      </Box>
      <Button variant="contained" onClick={() => onResume(session.id)} sx={{ flexShrink: 0 }}>Retomar</Button>
      <Tooltip title="Ocultar aviso">
        <IconButton aria-label="Ocultar aviso" onClick={dismiss} sx={{ color: 'text.secondary', flexShrink: 0 }}>
          <Close fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
