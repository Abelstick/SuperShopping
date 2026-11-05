import { useRef, useState } from 'react'
import {
  Box, Card, Typography, TextField, Button,
  Avatar, Alert, CircularProgress,
} from '@mui/material'
import { Person } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '../store/authStore'
import { PageHeader } from '@/shared/components/ui'
import { FS, reveal } from '@/theme/tokens'


export default function ProfilePage() {
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
      <PageHeader {...reveal(0)} title="Mi Perfil" />

      <Box {...reveal(1)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 720 }}>
        {/* Identidad */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 26, flexShrink: 0 }}>
            {profile?.full_name?.[0]?.toUpperCase() || <Person />}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={{ fontSize: FS.dialog, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em', overflowWrap: 'anywhere' }}>
              {profile?.full_name}
            </Typography>
            <Typography sx={{ fontSize: FS.body, color: 'text.secondary', overflowWrap: 'anywhere' }}>{user?.email}</Typography>
          </Box>
        </Box>

        <Card sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
