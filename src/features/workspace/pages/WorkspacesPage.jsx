import { useState, useEffect } from 'react'
import {
  Box, Button, Card, CardContent, CardActions, Typography, Grid,
  IconButton, Menu, MenuItem, Chip, Avatar, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Skeleton,
} from '@mui/material'
import {
  Add, MoreVert, Home, People, Delete, Edit, CheckCircle,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useNavigate } from 'react-router-dom'

const ROLE_LABELS = { owner: 'Propietario', editor: 'Editor', viewer: 'Lector' }
const ROLE_COLORS = { owner: 'primary', editor: 'success', viewer: 'default' }

function WorkspaceCard({ workspace, isCurrent, onSelect, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const isOwner = workspace.my_role === 'owner'

  return (
    <Card sx={{ position: 'relative', border: isCurrent ? 2 : 1, borderColor: isCurrent ? 'primary.main' : 'divider' }}>
      {isCurrent && (
        <CheckCircle sx={{ position: 'absolute', top: 12, right: 12, color: 'primary.main', fontSize: 20 }} />
      )}
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <Home />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={600} noWrap>{workspace.name}</Typography>
            <Chip size="small" label={ROLE_LABELS[workspace.my_role]} color={ROLE_COLORS[workspace.my_role]} />
          </Box>
        </Box>
        {workspace.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{workspace.description}</Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <People fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            Propietario: {workspace.profiles?.full_name || workspace.profiles?.email}
          </Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
        <Button size="small" variant={isCurrent ? 'outlined' : 'contained'} onClick={() => onSelect(workspace)}>
          {isCurrent ? 'Seleccionado' : 'Seleccionar'}
        </Button>
        {isOwner && (
          <>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { setAnchorEl(null); onEdit(workspace) }}>
                <Edit fontSize="small" sx={{ mr: 1 }} /> Editar
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); onDelete(workspace) }} sx={{ color: 'error.main' }}>
                <Delete fontSize="small" sx={{ mr: 1 }} /> Eliminar
              </MenuItem>
            </Menu>
          </>
        )}
      </CardActions>
    </Card>
  )
}

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { workspaces, currentWorkspace, loading, fetchWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, setCurrentWorkspace } = useWorkspaceStore()
  const { enqueueSnackbar } = useSnackbar()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) fetchWorkspaces(user.id)
  }, [user])

  const openCreate = () => { setEditingWorkspace(null); setForm({ name: '', description: '' }); setDialogOpen(true) }
  const openEdit = (ws) => { setEditingWorkspace(ws); setForm({ name: ws.name, description: ws.description || '' }); setDialogOpen(true) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (editingWorkspace) {
      const { error } = await updateWorkspace(editingWorkspace.id, form)
      if (error) enqueueSnackbar('Error al actualizar', { variant: 'error' })
      else enqueueSnackbar('Hogar actualizado', { variant: 'success' })
    } else {
      const { error } = await createWorkspace(form.name, form.description, user.id)
      if (error) enqueueSnackbar('Error al crear', { variant: 'error' })
      else enqueueSnackbar('Hogar creado', { variant: 'success' })
    }
    setSaving(false)
    setDialogOpen(false)
  }

  const handleDelete = async () => {
    const { error } = await deleteWorkspace(deleteConfirm.id, user.id)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Hogar eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const handleSelect = (ws) => {
    setCurrentWorkspace(ws)
    navigate('/')
    enqueueSnackbar(`Cambiado a "${ws.name}"`, { variant: 'info' })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Mis Hogares</Typography>
        <Button startIcon={<Add />} variant="contained" onClick={openCreate}>Nuevo Hogar</Button>
      </Box>

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}><Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} /></Grid>)}
        </Grid>
      ) : workspaces.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <Home sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No tienes hogares todavía</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ mt: 2 }}>Crear mi primer hogar</Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {workspaces.map((ws) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={ws.id}>
              <WorkspaceCard
                workspace={ws}
                isCurrent={currentWorkspace?.id === ws.id}
                onSelect={handleSelect}
                onEdit={openEdit}
                onDelete={setDeleteConfirm}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWorkspace ? 'Editar Hogar' : 'Nuevo Hogar'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nombre del hogar" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} sx={{ mt: 1, mb: 2 }} required />
          <TextField fullWidth label="Descripción (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Eliminar Hogar</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que quieres eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
