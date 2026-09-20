import { Box, Typography } from '@mui/material'
import { ShoppingCart, CheckCircle } from '@mui/icons-material'

// Tamaños de las pantallas de acceso: 48 título (36 en móvil) · 20 titular · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const PANEL = '#0F172A' // Slate-900: la marca es plana, sin degradados
const FEATURES = [
  'Inventario compartido en tiempo real',
  'Compras colaborativas con tu familia',
  'Presupuestos y control de gastos',
  'Historial y reportes inteligentes',
]

export function BrandMark({ size = 40, onDark = false }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: size, height: size, borderRadius: '12px', bgcolor: onDark ? '#6366F1' : 'primary.main', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ShoppingCart sx={{ fontSize: size * 0.5 }} />
      </Box>
      <Typography sx={{ fontSize: FS.title, fontWeight: 800, letterSpacing: '-0.01em', color: onDark ? '#FFFFFF' : 'text.primary' }}>SuperShopping</Typography>
    </Box>
  )
}

// Contenido de marca: se muestra en el panel oscuro (escritorio) y bajo el formulario (móvil)
function BrandContent({ variant, onDark }) {
  const strong = onDark ? '#FFFFFF' : 'text.primary'
  const soft = onDark ? 'rgba(255,255,255,0.72)' : 'text.secondary'
  if (variant === 'brief') {
    return (
      <Typography sx={{ fontSize: FS.body, color: soft, lineHeight: 1.6 }}>
        Tu plataforma de gestión de compras del hogar colaborativa e inteligente.
      </Typography>
    )
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, color: strong }}>
        Gestiona las compras <Box component="span" sx={{ color: onDark ? '#A5B4FC' : 'primary.main' }}>de tu hogar</Box> juntos
      </Typography>
      <Typography sx={{ fontSize: FS.body, color: soft, lineHeight: 1.6 }}>
        Organiza el inventario, planifica presupuestos y compra en equipo con actualizaciones en tiempo real.
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {FEATURES.map((f) => (
          <Box component="li" key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircle sx={{ fontSize: 20, color: onDark ? '#A5B4FC' : 'primary.main' }} />
            <Typography component="span" sx={{ fontSize: FS.body, color: onDark ? 'rgba(255,255,255,0.88)' : 'text.primary', fontWeight: 500 }}>{f}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// Cáscara de las pantallas de acceso. panel: 'full' | 'brief' | 'none'
export default function AuthShell({ panel = 'none', heading, subheading, children }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {panel !== 'none' && (
        <Box
          component="aside"
          sx={{
            display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between',
            width: panel === 'full' ? '45%' : '40%', p: 6, bgcolor: PANEL, color: '#FFFFFF',
          }}
        >
          <Box>
            <BrandMark size={44} onDark />
            {panel === 'full' && (
              <Box sx={{ display: 'inline-block', mt: 2, px: 1.5, py: 0.5, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.12)' }}>
                <Typography component="span" sx={{ fontSize: FS.meta, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Versión 1.0</Typography>
              </Box>
            )}
          </Box>
          <BrandContent variant={panel} onDark />
          <Typography sx={{ fontSize: FS.meta, color: 'rgba(255,255,255,0.6)' }}>
            {panel === 'full' ? `© ${new Date().getFullYear()} SuperShopping · Todos los derechos reservados` : ''}
          </Typography>
        </Box>
      )}

      <Box
        component="main"
        sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 6 }, overflowY: 'auto' }}
      >
        <Box sx={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: panel === 'none' ? 'flex' : { xs: 'flex', md: 'none' }, justifyContent: panel === 'none' ? 'flex-start' : 'center' }}>
            <BrandMark size={40} />
          </Box>

          <Box>
            <Typography component="h1" sx={{ fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', textWrap: 'balance' }}>
              {heading}
            </Typography>
            {subheading && <Typography sx={{ fontSize: FS.body, color: 'text.secondary', mt: 1 }}>{subheading}</Typography>}
          </Box>

          {children}

          {/* Móvil: la misma información de marca, debajo del formulario */}
          {panel !== 'none' && (
            <Box sx={{ display: { xs: 'block', md: 'none' }, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <BrandContent variant={panel} onDark={false} />
              {panel === 'full' && (
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', mt: 2 }}>
                  © {new Date().getFullYear()} SuperShopping · Todos los derechos reservados
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
