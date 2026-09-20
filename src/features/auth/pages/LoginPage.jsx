import { useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, TextField, Button, Typography, Link, InputAdornment, Alert, Divider, CircularProgress,
} from '@mui/material'
import { Email } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '../store/authStore'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'
import { validateEmail, validateRequiredPassword } from '../validation'

const FS = { body: 15, meta: 13 }
const isCredentialError = (err) =>
  err.code === 'invalid_credentials' || err.status === 400 || /invalid login credentials/i.test(err.message || '')

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  const validators = { email: validateEmail, password: validateRequiredPassword }
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const handleBlur = (e) => {
    const { name, value } = e.target
    setErrors((prev) => ({ ...prev, [name]: validators[name](value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const next = { email: validateEmail(form.email), password: validateRequiredPassword(form.password) }
    setErrors(next)
    if (next.email) { emailRef.current?.focus(); return }
    if (next.password) { passwordRef.current?.focus(); return }
    setLoading(true)
    const { error: err } = await signIn(form.email, form.password)
    setLoading(false)
    if (err) setError(isCredentialError(err) ? 'Email o contraseña incorrectos.' : err.message)
    else { enqueueSnackbar('Bienvenido de vuelta', { variant: 'success' }); navigate('/') }
  }

  return (
    <AuthShell panel="full" heading="Iniciar sesión" subheading="Ingresa a tu cuenta para continuar">
      {error && <Alert severity="warning" role="alert" onClose={() => setError('')}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <TextField
          fullWidth required autoFocus
          label="Correo electrónico" name="email" type="email"
          value={form.email} onChange={handleChange} onBlur={handleBlur}
          error={Boolean(errors.email)} helperText={errors.email || ' '}
          inputRef={emailRef}
          slotProps={{
            htmlInput: { autoComplete: 'email' },
            input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> },
          }}
        />
        <PasswordField
          label="Contraseña" name="password" autoComplete="current-password"
          value={form.password} onChange={handleChange} onBlur={handleBlur}
          error={errors.password} show={showPassword} onToggle={() => setShowPassword((s) => !s)}
          inputRef={passwordRef}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Link component={RouterLink} to="/auth/forgot-password" sx={{ fontSize: FS.body, fontWeight: 600 }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </Box>

        <Button
          fullWidth variant="contained" type="submit" size="large" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </Box>

      <Divider>
        <Typography component="span" sx={{ fontSize: FS.meta, color: 'text.secondary', px: 1 }}>o</Typography>
      </Divider>

      <Typography sx={{ fontSize: FS.body, color: 'text.secondary', textAlign: 'center' }}>
        ¿No tienes una cuenta?{' '}
        <Link component={RouterLink} to="/auth/register" sx={{ fontWeight: 700 }}>Regístrate gratis</Link>
      </Typography>
    </AuthShell>
  )
}
