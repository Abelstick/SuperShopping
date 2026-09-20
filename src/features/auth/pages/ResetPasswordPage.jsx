import { useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Box, Button, Typography, Link, Alert, CircularProgress, Skeleton } from '@mui/material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '../store/authStore'
import AuthShell from '../components/AuthShell'
import PasswordField from '../components/PasswordField'
import { validateNewPassword, validateConfirm } from '../validation'

// Destino del enlace de recuperación: Supabase crea una sesión temporal al abrirlo
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { session, initialized, updatePassword } = useAuthStore()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({ password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)

  const validate = (name, value, all = form) =>
    name === 'password' ? validateNewPassword(value) : validateConfirm(all.password, value)
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const handleBlur = (e) => {
    const { name, value } = e.target
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const next = { password: validate('password', form.password), confirm: validate('confirm', form.confirm) }
    setErrors(next)
    const firstInvalid = ['password', 'confirm'].find((n) => next[n])
    if (firstInvalid) { (firstInvalid === 'password' ? passwordRef : confirmRef).current?.focus(); return }
    setLoading(true)
    const { error: err } = await updatePassword(form.password)
    setLoading(false)
    if (err) setError(err.message)
    else { enqueueSnackbar('Contraseña actualizada', { variant: 'success' }); navigate('/') }
  }

  if (!initialized) {
    return (
      <AuthShell panel="none" heading="Nueva contraseña">
        <Box aria-busy="true" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={48} />
        </Box>
      </AuthShell>
    )
  }

  if (!session) {
    return (
      <AuthShell panel="none" heading="Enlace no válido">
        <Alert severity="warning" role="alert">
          El enlace de recuperación venció o ya fue usado. Solicita uno nuevo.
        </Alert>
        <Button component={RouterLink} to="/auth/forgot-password" variant="contained" size="large" fullWidth>
          Enviar enlace
        </Button>
        <Typography sx={{ fontSize: 15, textAlign: 'center' }}>
          <Link component={RouterLink} to="/auth/login" sx={{ fontWeight: 600 }}>Volver al login</Link>
        </Typography>
      </AuthShell>
    )
  }

  return (
    <AuthShell panel="none" heading="Nueva contraseña" subheading="Elige una contraseña para tu cuenta.">
      {error && <Alert severity="warning" role="alert" onClose={() => setError('')}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <PasswordField
          label="Contraseña" name="password" autoComplete="new-password" autoFocus
          value={form.password} onChange={handleChange} onBlur={handleBlur}
          error={errors.password} show={show} onToggle={() => setShow((s) => !s)}
          inputRef={passwordRef}
        />
        <PasswordField
          label="Confirmar contraseña" name="confirm" autoComplete="new-password"
          value={form.confirm} onChange={handleChange} onBlur={handleBlur}
          error={errors.confirm} show={show}
          inputRef={confirmRef}
        />
        <Button
          fullWidth variant="contained" type="submit" size="large" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </Button>
      </Box>
      <Typography sx={{ fontSize: 15, textAlign: 'center' }}>
        <Link component={RouterLink} to="/auth/login" sx={{ fontWeight: 600 }}>Volver al login</Link>
      </Typography>
    </AuthShell>
  )
}
