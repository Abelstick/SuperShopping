import {
  HomeRounded, HomeOutlined, Inventory2Rounded, Inventory2Outlined,
  ReceiptLongRounded, ReceiptLongOutlined, ShoppingBagRounded, ShoppingBagOutlined,
  InsightsRounded, InsightsOutlined, HolidayVillageRounded, HolidayVillageOutlined,
} from '@mui/icons-material'

const DASHBOARD = { label: 'Dashboard', short: 'Inicio', path: '/', Icon: HomeOutlined, IconActive: HomeRounded }
const INVENTORY = { label: 'Inventario', path: '/inventory', Icon: Inventory2Outlined, IconActive: Inventory2Rounded }
const BUDGETS = { label: 'Presupuestos', path: '/budgets', Icon: ReceiptLongOutlined, IconActive: ReceiptLongRounded }
const PURCHASES = { label: 'Compras', path: '/purchases', Icon: ShoppingBagOutlined, IconActive: ShoppingBagRounded }
const ANALYSIS = { label: 'Análisis', path: '/analysis', Icon: InsightsOutlined, IconActive: InsightsRounded }
const WORKSPACES = { label: 'Hogares', path: '/workspaces', Icon: HolidayVillageOutlined, IconActive: HolidayVillageRounded }

// Barra lateral y riel: por intención de uso
export const NAV_GROUPS = [
  { label: 'Planificar', items: [DASHBOARD, INVENTORY, BUDGETS] },
  { label: 'Historial', items: [PURCHASES, ANALYSIS] },
  { label: 'Hogar', items: [WORKSPACES] },
]

// Menú inferior móvil: las dos a cada lado de "Comprar"; el resto vive en "Más"
export const BOTTOM_LEFT = [DASHBOARD, INVENTORY]
export const BOTTOM_RIGHT = [BUDGETS]
export const MORE_ITEMS = [PURCHASES, ANALYSIS, WORKSPACES]
export const MORE_PATHS = ['/purchases', '/analysis', '/workspaces', '/workspace/settings', '/profile']

export const isNavActive = (path, pathname) => (path === '/' ? pathname === '/' : pathname.startsWith(path))
