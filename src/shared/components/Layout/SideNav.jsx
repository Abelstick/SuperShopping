import {
  Avatar, Box, Button, ButtonBase, IconButton, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography,
} from '@mui/material'
import { ChevronLeft, ChevronRight, HolidayVillageOutlined, MoreHoriz, ShoppingCartRounded } from '@mui/icons-material'
import { FS, CHROME } from '@/theme/tokens'
import ThemeToggle from '@/shared/components/ThemeToggle'
import BrandMark from './BrandMark'
import { NAV_GROUPS, isNavActive } from './navigation'

// Elemento del riel: icono con etiqueta debajo
function RailItem({ item, active, onClick }) {
  const Icon = active ? item.IconActive : item.Icon
  return (
    <ButtonBase
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      sx={{
        width: '100%', minHeight: 56, py: 0.75, borderRadius: '12px', flexDirection: 'column', gap: 0.25,
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: active ? 'action.selected' : 'action.hover' },
      }}
    >
      <Icon sx={{ fontSize: 24 }} />
      <Typography component="span" sx={{ fontSize: 12, fontWeight: active ? 700 : 500, lineHeight: 1.2 }}>{item.short ?? item.label}</Typography>
    </ButtonBase>
  )
}

// Navegación permanente de tablet y escritorio. `collapsed` la reduce al riel.
export default function SideNav({ collapsed, canCollapse, onToggle, pathname, onNavigate, onShop, workspace, user, profile, onUserMenu }) {
  const width = collapsed ? CHROME.rail : CHROME.sidebar
  const initial = profile?.full_name?.[0]?.toUpperCase()

  return (
    <Box
      component="nav"
      aria-label="Navegación principal"
      sx={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5, overflowY: 'auto', overflowX: 'hidden',
        bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider',
        transition: 'width 200ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Marca */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 1, minHeight: 44, px: collapsed ? 0 : 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <BrandMark />
          {!collapsed && <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }} noWrap>SuperShopping</Typography>}
        </Box>
        {canCollapse && !collapsed && (
          <Tooltip title="Colapsar" placement="right">
            <IconButton size="small" onClick={onToggle} aria-label="Colapsar" sx={{ color: 'text.secondary' }}>
              <ChevronLeft fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {canCollapse && collapsed && (
        <Tooltip title="Expandir" placement="right">
          <IconButton onClick={onToggle} aria-label="Expandir" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
            <ChevronRight fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Hogar activo */}
      {workspace && !collapsed && (
        <ButtonBase
          onClick={() => onNavigate('/workspaces')}
          sx={{ justifyContent: 'flex-start', gap: 1, px: 1.25, py: 1, minHeight: 44, borderRadius: '10px', border: 1, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
        >
          <HolidayVillageOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: FS.body, fontWeight: 600, flexGrow: 1, textAlign: 'left' }} noWrap>{workspace.name}</Typography>
        </ButtonBase>
      )}

      {/* Acción principal */}
      {collapsed ? (
        <ButtonBase
          onClick={onShop}
          sx={{ minHeight: 56, borderRadius: '12px', flexDirection: 'column', gap: 0.25, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark', color: '#FFFFFF' } }}
        >
          <ShoppingCartRounded sx={{ fontSize: 22 }} />
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>Comprar</Typography>
        </ButtonBase>
      ) : (
        <Button variant="contained" size="large" startIcon={<ShoppingCartRounded />} onClick={onShop} fullWidth>Comprar</Button>
      )}

      {/* Secciones */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: collapsed ? 0.5 : 1.5, flexGrow: 1 }}>
        {NAV_GROUPS.map((group) => (
          <Box key={group.label} sx={{ display: 'flex', flexDirection: 'column', gap: collapsed ? 0.5 : 0 }}>
            {!collapsed && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', px: 1.5, pb: 0.5 }}>{group.label}</Typography>}
            {group.items.map((item) => {
              const active = isNavActive(item.path, pathname)
              if (collapsed) return <RailItem key={item.path} item={item} active={active} onClick={() => onNavigate(item.path)} />
              const Icon = active ? item.IconActive : item.Icon
              return (
                <ListItemButton
                  key={item.path}
                  selected={active}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onNavigate(item.path)}
                  sx={{ color: active ? 'primary.main' : 'text.primary' }}
                >
                  <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.secondary' }}><Icon sx={{ fontSize: 21 }} /></ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: FS.body, fontWeight: active ? 700 : 500 } } }} />
                </ListItemButton>
              )
            })}
          </Box>
        ))}
      </Box>

      {/* Tema y usuario */}
      {collapsed ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <ThemeToggle />
          <IconButton onClick={onUserMenu} aria-label="Menú de usuario" sx={{ p: 0.5 }}>
            <Avatar src={profile?.avatar_url} alt={profile?.full_name ?? ''} sx={{ width: 34, height: 34, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: FS.meta }}>{initial}</Avatar>
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderTop: 1, borderColor: 'divider', pt: 1 }}>
          <ButtonBase
            onClick={onUserMenu}
            aria-label="Menú de usuario"
            sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1.25, p: 0.75, borderRadius: '10px', textAlign: 'left', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Avatar src={profile?.avatar_url} alt={profile?.full_name ?? ''} sx={{ width: 34, height: 34, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: FS.meta, flexShrink: 0 }}>{initial}</Avatar>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.3 }} noWrap>{profile?.full_name || 'Usuario'}</Typography>
              <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.3 }} noWrap>{user?.email}</Typography>
            </Box>
            <MoreHoriz sx={{ color: 'text.secondary', fontSize: 18, flexShrink: 0 }} />
          </ButtonBase>
          <ThemeToggle />
        </Box>
      )}
    </Box>
  )
}
