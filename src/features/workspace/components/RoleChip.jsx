import { Shield, Edit, Visibility } from '@mui/icons-material'
import { StatusPill } from '@/shared/components/ui'
import { ROLE_LABELS } from '../constants'

// Propietario = marca. Editor y Lector = neutro, con icono distinto.
export default function RoleChip({ role }) {
  const Icon = role === 'owner' ? Shield : role === 'editor' ? Edit : Visibility
  return <StatusPill tone={role === 'owner' ? 'brand' : 'neutral'} icon={Icon}>{ROLE_LABELS[role] ?? role}</StatusPill>
}
