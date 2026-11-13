import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Card, Skeleton, Typography } from '@mui/material'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import { PageHeader } from '@/shared/components/ui'
import { FS, reveal } from '@/theme/tokens'
import ReceivedInvitations from '../components/ReceivedInvitations'

// Destino del enlace de invitación (/invite/:token). Solo funciona con la cuenta del email invitado.
export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { myInvitations, fetchMyInvitations } = useWorkspaceStore()
  const [state, setState] = useState({ status: 'loading', error: null })
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchMyInvitations().then(({ error }) => {
      if (!cancelled) setState({ status: error ? 'error' : 'ready', error })
    })
    return () => { cancelled = true }
  }, [fetchMyInvitations, retryTick])

  const invitation = myInvitations.find((i) => i.token === token)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 720 }}>
      <PageHeader {...reveal(0)} title="Invitación a un hogar" />

      {state.status === 'loading' && <Skeleton variant="rectangular" height={88} sx={{ borderRadius: '16px' }} />}

      {state.status === 'error' && (
        <LoadErrorBanner
          message={state.error?.message || 'Sin detalle del servidor'}
          onRetry={() => { setState({ status: 'loading', error: null }); setRetryTick((t) => t + 1) }}
        />
      )}

      {state.status === 'ready' && invitation && (
        <ReceivedInvitations invitations={[invitation]} onAccepted={() => navigate('/', { replace: true })} />
      )}

      {state.status === 'ready' && !invitation && (
        <Card sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>Esta invitación no está disponible</Typography>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
            Puede que haya expirado, que ya se haya usado o cancelado, o que sea para otro email.
            Estás conectado como <strong>{user?.email}</strong>.
          </Typography>
          <Box><Button variant="contained" onClick={() => navigate('/workspaces')}>Ir a Mis hogares</Button></Box>
        </Card>
      )}
    </Box>
  )
}
