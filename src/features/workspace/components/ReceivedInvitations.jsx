import { useState } from 'react'
import { Box, Button, Card, CircularProgress, Typography } from '@mui/material'
import { Home } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { RowDivider } from '@/shared/components/ui'
import { fmtDate } from '@/shared/utils/format'
import { FS } from '@/theme/tokens'
import RoleChip from './RoleChip'

// Invitaciones a hogares dirigidas al email de la sesión, con Aceptar / Rechazar
export default function ReceivedInvitations({ invitations, onAccepted }) {
  const { user } = useAuthStore()
  const { acceptInvitation, declineInvitation } = useWorkspaceStore()
  const { enqueueSnackbar } = useSnackbar()
  // { token, action: 'accept' | 'decline' } de la invitación en curso
  const [pending, setPending] = useState(null)

  const handle = async (inv, action) => {
    setPending({ token: inv.token, action })
    const { data, error } = action === 'accept'
      ? await acceptInvitation(inv.token, user.id)
      : await declineInvitation(inv.token)
    setPending(null)
    if (error) { enqueueSnackbar(error.message || 'No se pudo completar la acción', { variant: 'error' }); return }
    if (action === 'accept') {
      enqueueSnackbar(`Te uniste a "${inv.workspace_name}"`, { variant: 'success' })
      onAccepted?.(data)
    } else {
      enqueueSnackbar('Invitación rechazada', { variant: 'info' })
    }
  }

  if (!invitations.length) return null

  return (
    <Card>
      {invitations.map((inv, i) => {
        const busy = pending?.token === inv.token
        return (
          <Box key={inv.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 2, sm: 2.5 }, py: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'action.selected', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Home />
              </Box>
              <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>{inv.workspace_name}</Typography>
                  <RoleChip role={inv.role} />
                </Box>
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>
                  {inv.invited_by_name ? `Te invitó ${inv.invited_by_name}` : 'Invitación'} · Expira {fmtDate(inv.expires_at)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, ml: 'auto' }}>
                <Button onClick={() => handle(inv, 'decline')} disabled={Boolean(pending)} sx={{ color: 'text.secondary' }}>
                  {busy && pending.action === 'decline' ? <CircularProgress size={16} color="inherit" /> : 'Rechazar'}
                </Button>
                <Button variant="contained" onClick={() => handle(inv, 'accept')} disabled={Boolean(pending)}
                  startIcon={busy && pending.action === 'accept' ? <CircularProgress size={16} color="inherit" /> : undefined}>
                  Aceptar
                </Button>
              </Box>
            </Box>
            {i < invitations.length - 1 && <RowDivider />}
          </Box>
        )
      })}
    </Card>
  )
}
