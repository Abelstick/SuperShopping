import { useState } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Avatar, Grid, Alert, Divider,
} from '@mui/material'
import { Person } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '../store/authStore'

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuthStore()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ full_name: profile?.full_name || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await updateProfile(form)
    setSaving(false)
    if (err) setError(err.message)
    else enqueueSnackbar('Perfil actualizado', { variant: 'success' })
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>Mi Perfil</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ textAlign: 'center', py: 3 }}>
            <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: 32 }}>
              {profile?.full_name?.[0]?.toUpperCase() || <Person />}
            </Avatar>
            <Typography variant="h6" fontWeight={600}>{profile?.full_name}</Typography>
            <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Información personal</Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField
                fullWidth label="Nombre completo" value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField fullWidth label="Email" value={user?.email || ''} disabled sx={{ mb: 2 }} />
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
