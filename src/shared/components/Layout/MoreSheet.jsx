import { Avatar, Box, Dialog, Divider, ListItemButton, ListItemIcon, ListItemText, Switch, Typography } from '@mui/material'
import { DarkModeOutlined, Logout, PersonOutlined, SettingsOutlined } from '@mui/icons-material'
import { FS } from '@/theme/tokens'
import { useAppStore } from '@/store/appStore'
import { MORE_ITEMS, isNavActive } from './navigation'

function Row({ Icon, label, active, onClick, color, trailing }) {
  return (
    <ListItemButton selected={active} aria-current={active ? 'page' : undefined} onClick={onClick} sx={{ minHeight: 52, color: color ?? (active ? 'primary.main' : 'text.primary') }}>
      <ListItemIcon sx={{ color: color ?? (active ? 'primary.main' : 'text.secondary') }}><Icon /></ListItemIcon>
      <ListItemText primary={label} slotProps={{ primary: { sx: { fontSize: FS.body, fontWeight: active ? 700 : 500 } } }} />
      {trailing}
    </ListItemButton>
  )
}

// Hoja "Más" del menú inferior: el resto de secciones y las opciones de cuenta
export default function MoreSheet({ open, onClose, pathname, onNavigate, onSignOut, user, profile }) {
  const themeMode = useAppStore((s) => s.themeMode)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const go = (path) => { onClose(); onNavigate(path) }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-label="Más opciones">
      <Box sx={{ px: 1.5, pt: 1, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.5 }}>
          <Avatar src={profile?.avatar_url} alt={profile?.full_name ?? ''} sx={{ width: 44, height: 44, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            {profile?.full_name?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }} noWrap>{profile?.full_name || 'Usuario'}</Typography>
            <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>{user?.email}</Typography>
          </Box>
        </Box>
        <Divider sx={{ mx: 1.5, mb: 0.5 }} />
        {MORE_ITEMS.map((item) => {
          const active = isNavActive(item.path, pathname)
          return <Row key={item.path} Icon={active ? item.IconActive : item.Icon} label={item.label} active={active} onClick={() => go(item.path)} />
        })}
        <Row Icon={SettingsOutlined} label="Configuración del hogar" active={pathname.startsWith('/workspace/settings')} onClick={() => go('/workspace/settings')} />
        <Row Icon={PersonOutlined} label="Perfil" active={pathname.startsWith('/profile')} onClick={() => go('/profile')} />
        <Divider sx={{ mx: 1.5, my: 0.5 }} />
        <Row
          Icon={DarkModeOutlined}
          label="Modo oscuro"
          onClick={toggleTheme}
          trailing={<Switch edge="end" checked={themeMode === 'dark'} tabIndex={-1} slotProps={{ input: { 'aria-label': 'Modo oscuro' } }} />}
        />
        <Row Icon={Logout} label="Cerrar sesión" color="error.main" onClick={() => { onClose(); onSignOut() }} />
      </Box>
    </Dialog>
  )
}
