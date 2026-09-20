import { useRef, useState } from 'react'
import {
  Box, Card, Typography, TextField, Button,
  Avatar, Alert, CircularProgress, useTheme,
} from '@mui/material'
import { Person } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '../store/authStore'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

export default function ProfilePage() {
  const st = useTheme().palette.stock.saludable
  const { user, profile, updateProfile } = useAuthStore()
  const { enqueueSnackbar } = useSnackbar()
  // Borrador: mientras no se edite, el campo muestra el nombre del perfil (aunque llegue después)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const nameRef = useRef(null)

  const fullName = draft ?? profile?.full_name ?? ''
  const validate = (v) => (v.trim() ? '' : 'Ingresa el nombre completo.')

  const handleSave = async () => {
    const err = validate(fullName)
    setNameError(err)
    if (err) { nameRef.current?.focus(); return }
    setSaving(true)
    setError('')
    const result = await updateProfile({ full_name: fullName })
    setSaving(false)
    if (result?.error) setError(result.error.message)
    else { enqueueSnackbar('Perfil actualizado', { variant: 'success' }); setDraft(null) }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography {...reveal(0)} component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>Mi Perfil</Typography>

      <Box {...reveal(1)} sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' }, alignItems: 'start' }}>
        {/* Nivel 1: identidad */}
        <Card sx={{ bgcolor: st.tint, borderColor: st.line, p: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 32, borderRadius: '16px', flexShrink: 0 }}>
            {profile?.full_name?.[0]?.toUpperCase() || <Person />}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={{ fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>
              {profile?.full_name}
            </Typography>
            <Typography sx={{ fontSize: FS.body, color: 'text.secondary', overflowWrap: 'anywhere' }}>{user?.email}</Typography>
          </Box>
        </Card>

        <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Información personal</Typography>
          {error && <Alert severity="warning">{error}</Alert>}
          <TextField
            fullWidth required label="Nombre completo" value={fullName}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setNameError(validate(fullName))}
            error={Boolean(nameError)} helperText={nameError || ' '}
            inputRef={nameRef}
          />
          <TextField fullWidth label="Email" value={user?.email || ''} disabled />
          <Box>
            <Button variant="contained" onClick={handleSave} disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}
