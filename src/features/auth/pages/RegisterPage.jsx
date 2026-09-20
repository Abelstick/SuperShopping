import { useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, TextField, Button, Typography, Link, InputAdornment, Alert, Divider, CircularProgress,
} from '@mui/material'
import { Email, Person } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '../store/authStore'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'
import { validateEmail, validateFullName, validateNewPassword, validateConfirm } from '../validation'

const FS = { body: 15, meta: 13 }

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp } = useAuthStore()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fullNameRef = useRef(null)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)

  // Un solo control de mostrar/ocultar gobierna las dos contraseñas
  const validate = (name, value, all = form) => {
    if (name === 'fullName') return validateFullName(value)
    if (name === 'email') return validateEmail(value)
    if (name === 'password') return validateNewPassword(value)
    return validateConfirm(all.password, value)
  }
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const handleBlur = (e) => {
    const { name, value } = e.target
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const order = ['fullName', 'email', 'password', 'confirm']
    const next = Object.fromEntries(order.map((n) => [n, validate(n, form[n])]))
    setErrors(next)
    const firstInvalid = order.find((n) => next[n])
    if (firstInvalid) { ({ fullName: fullNameRef, email: emailRef, password: passwordRef, confirm: confirmRef })[firstInvalid].current?.focus(); return }
    setLoading(true)
    const { error: err } = await signUp(form.email, form.password, form.fullName)
    setLoading(false)
    if (err) setError(err.message || 'Error al crear la cuenta.')
    else {
      enqueueSnackbar('Cuenta creada. Verifica tu email si es necesario.', { variant: 'success' })
      navigate('/auth/login')
    }
  }

  const icon = (Icon) => <InputAdornment position="start"><Icon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>

  return (
    <AuthShell panel="brief" heading="Crear cuenta" subheading="Empieza gratis, sin tarjeta de crédito.">
      {error && <Alert severity="warning" role="alert" onClose={() => setError('')}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <TextField
          fullWidth required autoFocus
          label="Nombre completo" name="fullName" value={form.fullName}
          onChange={handleChange} onBlur={handleBlur}
          error={Boolean(errors.fullName)} helperText={errors.fullName || ' '}
          inputRef={fullNameRef}
          slotProps={{ htmlInput: { autoComplete: 'name' }, input: { startAdornment: icon(Person) } }}
        />
        <TextField
          fullWidth required
          label="Correo electrónico" name="email" type="email" value={form.email}
          onChange={handleChange} onBlur={handleBlur}
          error={Boolean(errors.email)} helperText={errors.email || ' '}
          inputRef={emailRef}
          slotProps={{ htmlInput: { autoComplete: 'email' }, input: { startAdornment: icon(Email) } }}
        />
        <PasswordField
          label="Contraseña" name="password" autoComplete="new-password"
          value={form.password} onChange={handleChange} onBlur={handleBlur}
          error={errors.password} show={showPassword} onToggle={() => setShowPassword((s) => !s)}
          inputRef={passwordRef}
        />
        <PasswordField
          label="Confirmar contraseña" name="confirm" autoComplete="new-password"
          value={form.confirm} onChange={handleChange} onBlur={handleBlur}
          error={errors.confirm} show={showPassword}
          inputRef={confirmRef}
        />

        <Button
          fullWidth variant="contained" type="submit" size="large" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ mt: 1 }}
        >
          {loading ? 'Creando cuenta…' : 'Crear cuenta gratuita'}
        </Button>
      </Box>

      <Divider>
        <Typography component="span" sx={{ fontSize: FS.meta, color: 'text.secondary', px: 1 }}>o</Typography>
      </Divider>

      <Typography sx={{ fontSize: FS.body, color: 'text.secondary', textAlign: 'center' }}>
        ¿Ya tienes cuenta?{' '}
        <Link component={RouterLink} to="/auth/login" sx={{ fontWeight: 700 }}>Iniciar sesión</Link>
      </Typography>
    </AuthShell>
  )
}
