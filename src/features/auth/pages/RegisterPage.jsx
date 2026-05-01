import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, TextField, Button, Typography, Link,
  InputAdornment, IconButton, Alert, Stack, Divider,
} from '@mui/material'
import { Visibility, VisibilityOff, ShoppingCart, Email, Lock, Person } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp } = useAuthStore()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden.')
    if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    setLoading(true)
    const { error: err } = await signUp(form.email, form.password, form.fullName)
    setLoading(false)
    if (err) setError(err.message || 'Error al crear la cuenta.')
    else {
      enqueueSnackbar('Cuenta creada. Verifica tu email si es necesario.', { variant: 'success' })
      navigate('/auth/login')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left branding panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '40%',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 60%, #0f2d4a 100%)',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
          gap: 3,
        }}
      >
        <Box sx={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', pointerEvents: 'none' }} />

        <Box sx={{ textAlign: 'center', zIndex: 1 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <ShoppingCart sx={{ color: '#fff', fontSize: 36 }} />
          </Box>
          <Typography variant="h4" fontWeight={800} color="#ffffff" sx={{ mb: 1 }}>
            SuperShopping
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', maxWidth: 260, mx: 'auto', lineHeight: 1.7 }}>
            Tu plataforma de gestión de compras del hogar colaborativa e inteligente.
          </Typography>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
          bgcolor: 'background.default',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary">SuperShopping</Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} gutterBottom>Crear cuenta</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Empieza gratis, sin tarjeta de crédito.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth label="Nombre completo" name="fullName" value={form.fullName}
                onChange={handleChange} required size="medium"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
              />
              <TextField
                fullWidth label="Correo electrónico" name="email" type="email"
                value={form.email} onChange={handleChange} required size="medium"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
              />
              <TextField
                fullWidth label="Contraseña" name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={handleChange} required size="medium"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>, endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ) } }}
              />
              <TextField
                fullWidth label="Confirmar contraseña" name="confirm"
                type={showPassword ? 'text' : 'password'}
                value={form.confirm} onChange={handleChange} required size="medium"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
              />
              <Button fullWidth variant="contained" type="submit" disabled={loading} size="large" sx={{ py: 1.5, fontSize: '1rem' }}>
                {loading ? 'Creando cuenta…' : 'Crear cuenta gratuita'}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>o</Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              ¿Ya tienes cuenta?{' '}
              <Link component={RouterLink} to="/auth/login" fontWeight={700} sx={{ color: 'primary.main' }}>
                Iniciar sesión
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
