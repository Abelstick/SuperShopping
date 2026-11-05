import { CheckCircle, Block } from '@mui/icons-material'
import { StatusPill } from '@/shared/components/ui'

// Borrador y cancelado son neutros; activo y completado usan la marca (completado lleva además icono)
const STATUS = {
  draft: { label: 'Borrador', tone: 'neutral' },
  active: { label: 'Activo', tone: 'brand' },
  completed: { label: 'Completado', tone: 'brand', icon: CheckCircle },
  cancelled: { label: 'Cancelado', tone: 'neutral', icon: Block },
}

export default function BudgetStatusChip({ status }) {
  const { label, tone, icon } = STATUS[status] ?? STATUS.draft
  return <StatusPill tone={tone} icon={icon}>{label}</StatusPill>
}
