import { Warning } from '@mui/icons-material'
import { StatusPill } from './ui'

// Stock bajo = tono tomate + icono + texto (nunca solo color)
export default function StockBadge({ children }) {
  return <StatusPill tone="over" icon={Warning}>{children}</StatusPill>
}
