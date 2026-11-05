import { Box, ButtonBase, Typography } from '@mui/material'
import { MoreHorizRounded, ShoppingCartRounded } from '@mui/icons-material'
import { CHROME } from '@/theme/tokens'
import { BOTTOM_LEFT, BOTTOM_RIGHT, MORE_PATHS, isNavActive } from './navigation'

function Item({ label, Icon, active, onClick, ...rest }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      {...rest}
      sx={{ flex: '1 1 auto', height: CHROME.bottomNav, px: 0.25, flexDirection: 'column', gap: 0.25, color: active ? 'primary.main' : 'text.secondary' }}
    >
      <Icon sx={{ fontSize: 24 }} />
      <Typography component="span" sx={{ fontSize: 12, fontWeight: active ? 700 : 500, lineHeight: 1.2, whiteSpace: 'nowrap', color: 'inherit' }}>{label}</Typography>
    </ButtonBase>
  )
}

// Menú inferior móvil. "Comprar" va al centro y destaca: es la acción más frecuente.
export default function BottomNav({ pathname, onNavigate, onShop, onMore, moreOpen }) {
  const navItem = (item) => {
    const active = isNavActive(item.path, pathname)
    return (
      <Item
        key={item.path}
        label={item.short ?? item.label}
        Icon={active ? item.IconActive : item.Icon}
        active={active}
        onClick={() => onNavigate(item.path)}
      />
    )
  }

  return (
    <Box
      component="nav"
      aria-label="Navegación principal"
      sx={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, display: 'flex', alignItems: 'stretch',
        bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {BOTTOM_LEFT.map(navItem)}

      <ButtonBase
        onClick={onShop}
        sx={{ flex: '1 1 auto', height: CHROME.bottomNav, flexDirection: 'column', justifyContent: 'flex-end', pb: 0.75, gap: 0.25, color: 'primary.main' }}
      >
        <Box sx={{ width: 52, height: 40, borderRadius: '14px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 140ms', '.MuiButtonBase-root:active > &': { transform: 'scale(0.94)' } }}>
          <ShoppingCartRounded sx={{ fontSize: 24 }} />
        </Box>
        <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: 'inherit' }}>Comprar</Typography>
      </ButtonBase>

      {BOTTOM_RIGHT.map(navItem)}

      <Item
        label="Más"
        Icon={MoreHorizRounded}
        active={moreOpen || MORE_PATHS.some((p) => pathname.startsWith(p))}
        onClick={onMore}
        aria-haspopup="dialog"
      />
    </Box>
  )
}
