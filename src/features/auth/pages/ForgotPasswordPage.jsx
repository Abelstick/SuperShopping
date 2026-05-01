import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Card, CardContent, TextField, Button, Typography, Link, Alert } from '@mui/material'
import { ShoppingCart } from '@mui/icons-material'
import { useAuthStore } from '../store/authStore'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuthStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) setError(err.message)
    else setSent(true)
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <ShoppingCart sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>Recuperar contraseña</Typography>
          </Box>

          {sent ? (
            <Alert severity="success">
              Se envió un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada.
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <form onSubmit={handleSubmit}>
                <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required sx={{ mb: 3 }} />
                <Button fullWidth variant="contained" type="submit" disabled={loading} size="large">
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>
              </form>
            </>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link component={RouterLink} to="/auth/login" variant="body2">Volver al login</Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
