import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Card, TextField, Button, Typography, Link,
  InputAdornment, IconButton, Alert, Divider, Stack, Chip,
} from '@mui/material'
import {
  Visibility, VisibilityOff, ShoppingCart, CheckCircle,
  Email, Lock,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '../store/authStore'

const FEATURES = [
  'Inventario compartido en tiempo real',
  'Compras colaborativas con tu familia',
  'Presupuestos y control de gastos',
  'Historial y reportes inteligentes',
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(form.email, form.password)
    setLoading(false)
    if (err) setError('Email o contraseña incorrectos.')
    else { enqueueSnackbar('Bienvenido de vuelta', { variant: 'success' }); navigate('/') }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* ── Left panel (branding) ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '45%',
          p: 6,
          background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #0f2d4a 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: 60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#fff' }}>
              SuperShopping
            </Typography>
          </Box>
          <Chip label="Versión 1.0" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 11, height: 22, borderRadius: 4 }} />
        </Box>

        {/* Hero text */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, lineHeight: 1.2 , color: '#fff' }}>
            Gestiona las compras<br />
            <Box component="span" sx={{ color: '#60a5fa' }}>de tu hogar</Box>
            {' '}juntos
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4, lineHeight: 1.7 }}>
            Organiza el inventario, planifica presupuestos y compra en equipo con actualizaciones en tiempo real.
          </Typography>

          <Stack spacing={1.5}>
            {FEATURES.map((f) => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircle sx={{ color: '#34d399', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  {f}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Footer */}
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} SuperShopping · Todos los derechos reservados
        </Typography>
      </Box>

      {/* ── Right panel (form) ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary">SuperShopping</Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: 'text.primary' }}>
            Iniciar sesión
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Ingresa a tu cuenta para continuar
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Correo electrónico"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                size="medium"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
              />
              <TextField
                fullWidth
                label="Contraseña"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                required
                size="medium"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>, endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ) } }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link component={RouterLink} to="/auth/forgot-password" variant="body2" sx={{ fontWeight: 600 }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>

              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                size="large"
                sx={{ py: 1.5, fontSize: '1rem' }}
              >
                {loading ? 'Ingresando…' : 'Iniciar sesión'}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>o</Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              ¿No tienes una cuenta?{' '}
              <Link component={RouterLink} to="/auth/register" fontWeight={700} sx={{ color: 'primary.main' }}>
                Regístrate gratis
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
