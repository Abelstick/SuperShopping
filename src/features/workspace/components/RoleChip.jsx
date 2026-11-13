import { Shield, AdminPanelSettings, Edit, Visibility } from '@mui/icons-material'
import { StatusPill } from '@/shared/components/ui'
import { ROLE_LABELS } from '../constants'

const ICONS = { owner: Shield, admin: AdminPanelSettings, editor: Edit, viewer: Visibility }

// Propietario y Administrador = marca. Editor y Lector = neutro, con icono distinto.
export default function RoleChip({ role }) {
  const tone = role === 'owner' || role === 'admin' ? 'brand' : 'neutral'
  return <StatusPill tone={tone} icon={ICONS[role] ?? Visibility}>{ROLE_LABELS[role] ?? role}</StatusPill>
}
