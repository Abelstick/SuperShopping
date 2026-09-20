import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  BottomNavigation, BottomNavigationAction, Avatar, Menu,
  MenuItem, Divider, Tooltip, useMediaQuery, useTheme,
} from '@mui/material'
import {
  Menu as MenuIcon, Dashboard, Inventory2, Receipt, ShoppingCart,
  Home, Logout, Person, ChevronLeft, DarkMode, LightMode,
  MoreHoriz, Settings, ShoppingCartCheckout, Insights,
} from '@mui/icons-material'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useAppStore } from '@/store/appStore'

const DRAWER_WIDTH = 252

const NAV_MAIN = [
  { label: 'Dashboard', icon: <Dashboard sx={{ fontSize: 19 }} />, path: '/' },
  { label: 'Inventario', icon: <Inventory2 sx={{ fontSize: 19 }} />, path: '/inventory' },
  { label: 'Presupuestos', icon: <Receipt sx={{ fontSize: 19 }} />, path: '/budgets' },
  { label: 'Compras', icon: <ShoppingCart sx={{ fontSize: 19 }} />, path: '/purchases' },
  { label: 'Análisis', icon: <Insights sx={{ fontSize: 19 }} />, path: '/analysis' },
]

const NAV_SECONDARY = [
  { label: 'Hogares', icon: <Home sx={{ fontSize: 19 }} />, path: '/workspaces' },
]

const BOTTOM_NAV = [
  { label: 'Inicio', icon: <Dashboard />, path: '/' },
  { label: 'Inventario', icon: <Inventory2 />, path: '/inventory' },
  { label: 'Presupuestos', icon: <Receipt />, path: '/budgets' },
  { label: 'Compras', icon: <ShoppingCart />, path: '/purchases' },
  { label: 'Más', icon: <Settings />, path: '/workspaces' },
]

function NavItem({ item, location, onClick }) {
  const isActive = item.path === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.path)

  return (
    <Box sx={{ position: 'relative', mb: 0.25 }}>
      <ListItemButton
        onClick={onClick}
        selected={isActive}
        aria-current={isActive ? 'page' : undefined}
        sx={{
          pl: 1.5,
          '& .MuiListItemIcon-root': { color: isActive ? 'primary.main' : 'text.secondary', minWidth: 36 },
          '& .MuiListItemText-primary': {
            fontWeight: isActive ? 700 : 500,
            fontSize: '0.9375rem',
            color: isActive ? 'primary.main' : 'text.primary',
          },
        }}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        <ListItemText primary={item.label} />
      </ListItemButton>
    </Box>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))
  const { user, profile, signOut } = useAuthStore()
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore()

  useEffect(() => {
    if (user) fetchWorkspaces(user.id)
  }, [user?.id])

  const { sidebarOpen, toggleSidebar, themeMode, toggleTheme } = useAppStore()
  const [userMenuAnchor, setUserMenuAnchor] = useState(null)

  const activeBottomNav = BOTTOM_NAV.findIndex(
    (n) => n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path)
  )

  const handleSignOut = async () => {
    setUserMenuAnchor(null)
    await signOut()
    navigate('/auth/login')
  }

  const handleNav = (path) => {
    navigate(path)
    if (isMobile) toggleSidebar()
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box
        sx={{
          height: 60,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShoppingCartCheckout sx={{ color: 'primary.contrastText', fontSize: 20 }} />
          </Box>
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ letterSpacing: '-0.025em', lineHeight: 1 }}
          >
            SuperShopping
          </Typography>
        </Box>
        {!isMobile && (
          <Tooltip title="Colapsar" placement="right">
            <IconButton size="small" onClick={toggleSidebar} aria-label="Colapsar" sx={{ color: 'text.secondary' }}>
              <ChevronLeft fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Workspace chip */}
      {currentWorkspace && (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Box
            role="button"
            tabIndex={0}
            onClick={() => handleNav('/workspaces')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav('/workspaces') } }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              minHeight: 44,
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'background-color 120ms, border-color 120ms',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            <Home sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ flexGrow: 1, fontSize: '0.9375rem' }}
            >
              {currentWorkspace.name}
            </Typography>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                flexShrink: 0,
              }}
            />
          </Box>
        </Box>
      )}

      <Divider />

      {/* Main navigation */}
      <List disablePadding sx={{ px: 1.5, pt: 1, flexGrow: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 1.5, mb: 0.5, display: 'block' }}
        >
          Menú
        </Typography>
        {NAV_MAIN.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            location={location}
            onClick={() => handleNav(item.path)}
          />
        ))}
      </List>

      <Divider sx={{ mx: 1.5 }} />

      {/* Secondary navigation */}
      <List disablePadding sx={{ px: 1.5, py: 1 }}>
        {NAV_SECONDARY.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            location={location}
            onClick={() => handleNav(item.path)}
          />
        ))}
      </List>

      <Divider />

      {/* User section */}
      <Box sx={{ p: 1.5 }}>
        <Box
          role="button"
          tabIndex={0}
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setUserMenuAnchor(e.currentTarget) } }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 120ms',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            src={profile?.avatar_url}
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {profile?.full_name?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ fontSize: '0.9375rem', lineHeight: 1.4 }}
            >
              {profile?.full_name || 'Usuario'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: 'block', fontSize: '0.8125rem' }}
            >
              {user?.email}
            </Typography>
          </Box>
          <MoreHoriz sx={{ color: 'text.disabled', fontSize: 18, flexShrink: 0 }} />
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { md: sidebarOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: 'width 0.2s ease, margin-left 0.2s ease',
        }}
      >
        <Toolbar sx={{ minHeight: '52px !important', px: { xs: 2, sm: 2.5 } }}>
          {/* Hamburger */}
          <IconButton
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 1, display: { xs: 'flex', md: sidebarOpen ? 'none' : 'flex' } }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mr: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingCartCheckout sx={{ color: 'primary.contrastText', fontSize: 16 }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              SuperShopping
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title={themeMode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <IconButton onClick={toggleTheme} size="small">
              {themeMode === 'dark'
                ? <LightMode sx={{ fontSize: 19 }} />
                : <DarkMode sx={{ fontSize: 19 }} />
              }
            </IconButton>
          </Tooltip>

          <IconButton
            size="small"
            role="button"
          tabIndex={0}
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setUserMenuAnchor(e.currentTarget) } }}
            sx={{ ml: 0.5 }}
          >
            <Avatar
              src={profile?.avatar_url}
              sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 13 }}
            >
              {profile?.full_name?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar – desktop */}
      {!isMobile && (
        <Drawer
          variant="persistent"
          open={sidebarOpen}
          sx={{
            width: sidebarOpen ? DRAWER_WIDTH : 0,
            flexShrink: 0,
            transition: 'width 0.2s ease',
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              transition: 'transform 0.2s ease',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Sidebar – mobile */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={toggleSidebar}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          ModalProps={{ keepMounted: true }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
        }}
      >
        <Toolbar sx={{ minHeight: '52px !important' }} />
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            pb: { xs: 10, md: 4 },
            maxWidth: 1440,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>

        {/* Mobile bottom nav */}
        {isMobile && (
          <BottomNavigation
            value={activeBottomNav}
            onChange={(_, v) => navigate(BOTTOM_NAV[v].path)}
            sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }}
          >
            {BOTTOM_NAV.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        )}
      </Box>

      {/* User menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="body2" fontWeight={700}>{profile?.full_name}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/profile') }}>
          <Person sx={{ fontSize: 17, mr: 1.25, color: 'text.secondary' }} />
          Perfil
        </MenuItem>
        <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/workspace/settings') }}>
          <Settings sx={{ fontSize: 17, mr: 1.25, color: 'text.secondary' }} />
          Configuración del hogar
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
          <Logout sx={{ fontSize: 17, mr: 1.25 }} />
          Cerrar sesión
        </MenuItem>
      </Menu>
    </Box>
  )
}
