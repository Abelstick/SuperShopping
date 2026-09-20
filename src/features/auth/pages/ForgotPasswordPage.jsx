import { useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, TextField, Button, Typography, Link, Alert, InputAdornment, CircularProgress } from '@mui/material'
import { Email } from '@mui/icons-material'
import { useAuthStore } from '../store/authStore'
import AuthShell from '../components/AuthShell'
import { validateEmail } from '../validation'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuthStore()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const emailRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const err = validateEmail(email)
    setEmailError(err)
    if (err) { emailRef.current?.focus(); return }
    setLoading(true)
    const { error: resetErr } = await resetPassword(email)
    setLoading(false)
    if (resetErr) setError(resetErr.message)
    else setSent(true)
  }

  return (
    <AuthShell panel="none" heading="Recuperar contraseña">
      {sent ? (
        <Alert severity="success" role="status">
          Se envió un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada.
        </Alert>
      ) : (
        <>
          {error && <Alert severity="warning" role="alert" onClose={() => setError('')}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <TextField
              fullWidth required autoFocus
              label="Email" name="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailError(validateEmail(email))}
              error={Boolean(emailError)} helperText={emailError || ' '}
              inputRef={emailRef}
              slotProps={{
                htmlInput: { autoComplete: 'email' },
                input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> },
              }}
            />
            <Button
              fullWidth variant="contained" type="submit" size="large" disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>
          </Box>
        </>
      )}

      <Typography sx={{ fontSize: 15, textAlign: 'center' }}>
        <Link component={RouterLink} to="/auth/login" sx={{ fontWeight: 600 }}>Volver al login</Link>
      </Typography>
    </AuthShell>
  )
}
