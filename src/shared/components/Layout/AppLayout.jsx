import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Avatar, Box, ButtonBase, Divider, IconButton, Menu, MenuItem, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import { Logout, Person, Settings } from '@mui/icons-material'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore'
import { useShoppingStore } from '@/features/shopping/store/shoppingStore'
import { useAppStore } from '@/store/appStore'
import { CHROME, FS } from '@/theme/tokens'
import ActiveShoppingBanner from './ActiveShoppingBanner'
import BottomNav from './BottomNav'
import BrandMark from './BrandMark'
import MoreSheet from './MoreSheet'
import ShopSheet from './ShopSheet'
import SideNav from './SideNav'

// Tres formas de navegar según el ancho:
//   < 640 px  menú inferior y barra superior mínima
//   640–1023  riel fijo
//   ≥ 1024    barra lateral (plegable al riel)
// Modo Compra es inmersivo: sin navegación en ningún tamaño.
export default function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true })
  const { user, profile, signOut } = useAuthStore()
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore()
  const activeSessions = useShoppingStore((s) => s.activeSessions)
  const fetchActiveSessions = useShoppingStore((s) => s.fetchActiveSessions)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const refreshSignal = useAppStore((s) => s.refreshSignal)

  const [userMenuAnchor, setUserMenuAnchor] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)

  const immersive = pathname.startsWith('/shopping/')
  const workspaceId = currentWorkspace?.id

  useEffect(() => {
    if (user) fetchWorkspaces(user.id)
  }, [user?.id])

  // Se revisa al cambiar de pantalla: así el aviso desaparece al finalizar una compra
  useEffect(() => {
    fetchActiveSessions(workspaceId)
  }, [workspaceId, pathname, refreshSignal, fetchActiveSessions])

  const handleSignOut = async () => {
    setUserMenuAnchor(null)
    await signOut()
    navigate('/auth/login')
  }

  if (immersive) {
    return <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}><Outlet /></Box>
  }

  const collapsed = !isDesktop || !sidebarOpen
  const navWidth = isPhone ? 0 : collapsed ? CHROME.rail : CHROME.sidebar

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      {isPhone ? (
        <BottomNav
          pathname={pathname}
          onNavigate={navigate}
          onShop={() => setShopOpen(true)}
          onMore={() => setMoreOpen(true)}
          moreOpen={moreOpen}
        />
      ) : (
        <SideNav
          collapsed={collapsed}
          canCollapse={isDesktop}
          onToggle={toggleSidebar}
          pathname={pathname}
          onNavigate={navigate}
          onShop={() => setShopOpen(true)}
          workspace={currentWorkspace}
          user={user}
          profile={profile}
          onUserMenu={(e) => setUserMenuAnchor(e.currentTarget)}
        />
      )}

      <Box
        component="main"
        sx={{
          ml: `${navWidth}px`, minWidth: 0, minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          transition: 'margin-left 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Barra superior solo en móvil: el hogar activo y la cuenta */}
        {isPhone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: CHROME.topBar, px: 2, pt: 'env(safe-area-inset-top, 0px)', boxSizing: 'content-box' }}>
            <ButtonBase onClick={() => navigate('/workspaces')} sx={{ gap: 1, minHeight: 44, minWidth: 0, borderRadius: '10px', justifyContent: 'flex-start', flexGrow: 1 }}>
              <BrandMark size={30} />
              <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{currentWorkspace?.name ?? 'SuperShopping'}</Typography>
            </ButtonBase>
            <IconButton aria-label="Abrir menú de cuenta" onClick={() => setMoreOpen(true)} sx={{ mr: -0.75, p: 0.5 }}>
              <Avatar src={profile?.avatar_url} alt={profile?.full_name ?? ''} sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: FS.meta }}>
                {profile?.full_name?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        )}

        <Box
          sx={{
            flexGrow: 1, width: '100%', maxWidth: 1320, mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 0.5, sm: 3, md: 4 },
            // En móvil se reserva el menú inferior y el botón flotante
            pb: { xs: `calc(${CHROME.bottomNav + 88}px + env(safe-area-inset-bottom, 0px))`, sm: 4, md: 6 },
          }}
        >
          {/* En el Dashboard, "Próximas compras" ya ofrece retomarla */}
          {pathname !== '/' && <ActiveShoppingBanner sessions={activeSessions} onResume={(id) => navigate(`/shopping/${id}`)} />}
          <Outlet />
        </Box>
      </Box>

      <ShopSheet open={shopOpen} onClose={() => setShopOpen(false)} workspace={currentWorkspace} activeSessions={activeSessions} onNavigate={navigate} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} pathname={pathname} onNavigate={navigate} onSignOut={handleSignOut} user={user} profile={profile} />

      {/* Menú de cuenta de tablet y escritorio */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>{profile?.full_name}</Typography>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{user?.email}</Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/profile') }}>
          <Person sx={{ fontSize: 18, mr: 1.25, color: 'text.secondary' }} />
          Perfil
        </MenuItem>
        <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/workspace/settings') }}>
          <Settings sx={{ fontSize: 18, mr: 1.25, color: 'text.secondary' }} />
          Configuración del hogar
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
          <Logout sx={{ fontSize: 18, mr: 1.25 }} />
          Cerrar sesión
        </MenuItem>
      </Menu>
    </Box>
  )
}
