import { useState, useEffect, useRef } from 'react'
import {
  Box, Button, Card, Typography,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Skeleton, CircularProgress,
} from '@mui/material'
import {
  Add, MoreVert, Home, People, Delete, Edit, CheckCircle,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useNavigate } from 'react-router-dom'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import EmptyState from '@/shared/components/EmptyState'
import RoleChip from '../components/RoleChip'
import ReceivedInvitations from '../components/ReceivedInvitations'
import { canManageRole } from '../constants'
import { ConfirmDialog, PageHeader, PrimaryAction } from '@/shared/components/ui'
import { FS, reveal } from '@/theme/tokens'


function OwnerLine({ workspace }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
      <People sx={{ fontSize: 16 }} />
      <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>
        Propietario: {workspace.profiles?.full_name || workspace.profiles?.email}
      </Typography>
    </Box>
  )
}

function WorkspaceCard({ workspace, isCurrent, onSelect, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const isOwner = workspace.my_role === 'owner'
  const canManage = canManageRole(workspace.my_role)
  const close = () => setAnchorEl(null)

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 2, sm: 2.5 }, gap: 1.5, borderColor: isCurrent ? 'primary.main' : 'divider', boxShadow: (t) => (isCurrent ? `inset 0 0 0 1px ${t.vars.palette.primary.main}` : 'none') }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'action.selected', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Home />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }} noWrap>{workspace.name}</Typography>
          <Box sx={{ mt: 0.5 }}><RoleChip role={workspace.my_role} /></Box>
        </Box>
        {canManage && (
          <>
            <IconButton aria-label={`Acciones de ${workspace.name}`} onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ flexShrink: 0, mt: -0.75, mr: -1, color: 'text.secondary' }}>
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
              <MenuItem onClick={() => { close(); onEdit(workspace) }}>
                <ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Editar</ListItemText>
              </MenuItem>
              {isOwner && (
                <MenuItem onClick={() => { close(); onDelete(workspace) }}>
                  <ListItemIcon><Delete fontSize="small" /></ListItemIcon><ListItemText>Eliminar</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>
      {workspace.description && <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>{workspace.description}</Typography>}
      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <OwnerLine workspace={workspace} />
        <Button
          fullWidth
          variant={isCurrent ? 'text' : 'outlined'}
          startIcon={isCurrent ? <CheckCircle sx={{ fontSize: 20 }} /> : undefined}
          onClick={() => onSelect(workspace)}
          sx={{ color: isCurrent ? 'primary.main' : undefined }}
        >
          {isCurrent ? 'Seleccionado' : 'Seleccionar'}
        </Button>
      </Box>
    </Card>
  )
}

const GRID = { display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { workspaces, currentWorkspace, loading, myInvitations, fetchWorkspaces, fetchMyInvitations, createWorkspace, updateWorkspace, deleteWorkspace, setCurrentWorkspace } = useWorkspaceStore()
  const { enqueueSnackbar } = useSnackbar()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const nameRef = useRef(null)

  // Misma carga de siempre; ahora se recoge el `{ error }` que ya devuelve
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchMyInvitations()
    fetchWorkspaces(user.id)
      .then((r) => { if (!cancelled) setLoadError(r?.error ? { message: r.error.message || 'Sin detalle del servidor' } : null) })
      .catch((e) => { if (!cancelled) setLoadError({ message: e?.message || 'Sin detalle del servidor' }) })
    return () => { cancelled = true }
  }, [user?.id, retryTick])

  const openCreate = () => { setEditingWorkspace(null); setForm({ name: '', description: '' }); setNameError(''); setDialogOpen(true) }
  const openEdit = (ws) => { setEditingWorkspace(ws); setForm({ name: ws.name, description: ws.description || '' }); setNameError(''); setDialogOpen(true) }

  const validateName = (v) => (v.trim() ? '' : 'Ingresa el nombre del hogar.')

  const handleSave = async () => {
    const err = validateName(form.name)
    setNameError(err)
    if (err) { nameRef.current?.focus(); return }
    setSaving(true)
    let failed
    if (editingWorkspace) {
      const { error } = await updateWorkspace(editingWorkspace.id, form)
      failed = Boolean(error)
      if (error) enqueueSnackbar('Error al actualizar', { variant: 'error' })
      else enqueueSnackbar('Hogar actualizado', { variant: 'success' })
    } else {
      const { error } = await createWorkspace(form.name, form.description, user.id)
      failed = Boolean(error)
      if (error) enqueueSnackbar('Error al crear', { variant: 'error' })
      else enqueueSnackbar('Hogar creado', { variant: 'success' })
    }
    setSaving(false)
    // Si falla, el diálogo sigue abierto con lo escrito: los datos no se pierden
    if (!failed) setDialogOpen(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await deleteWorkspace(deleteConfirm.id, user.id)
    setDeleting(false)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Hogar eliminado', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const handleSelect = (ws) => {
    setCurrentWorkspace(ws)
    navigate('/')
    enqueueSnackbar(`Cambiado a "${ws.name}"`, { variant: 'info' })
  }

  const showSkeleton = loading && workspaces.length === 0
  const failedWithoutData = Boolean(loadError) && workspaces.length === 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 } }}>
      <PageHeader
        {...reveal(0)}
        title="Mis Hogares"
        subtitle={currentWorkspace?.name}
        actions={<PrimaryAction icon={<Add />} label="Nuevo Hogar" onClick={openCreate} variant={workspaces.length === 0 ? 'outlined' : 'contained'} />}
      />

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      {myInvitations.length > 0 && (
        <Box {...reveal(1)} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography component="h2" sx={{ fontSize: FS.body, fontWeight: 700, color: 'text.secondary' }}>
            Invitaciones recibidas
          </Typography>
          <ReceivedInvitations invitations={myInvitations} onAccepted={() => navigate('/')} />
        </Box>
      )}

      <Box {...reveal(2)}>
        {showSkeleton ? (
          <Box sx={GRID}>
            {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: '16px' }} />)}
          </Box>
        ) : failedWithoutData ? null : workspaces.length === 0 && myInvitations.length === 0 ? (
          <EmptyState
            icon={<Home sx={{ fontSize: 28 }} />}
            title="No tienes hogares todavía"
            action={<Button variant="contained" startIcon={<Add />} onClick={openCreate}>Crear mi primer hogar</Button>}
          />
        ) : (
          <Box sx={GRID}>
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                isCurrent={currentWorkspace?.id === ws.id}
                onSelect={handleSelect}
                onEdit={openEdit}
                onDelete={setDeleteConfirm}
              />
            ))}
          </Box>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWorkspace ? 'Editar Hogar' : 'Nuevo Hogar'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth required autoFocus label="Nombre del hogar" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => setNameError(validateName(form.name))}
              error={Boolean(nameError)} helperText={nameError || ' '}
              inputRef={nameRef}
            />
            <TextField fullWidth label="Descripción (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Hogar"
        confirmLabel="Eliminar"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      >
        <Typography sx={{ fontSize: FS.body }}>¿Estás seguro de que quieres eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.</Typography>
      </ConfirmDialog>
    </Box>
  )
}
