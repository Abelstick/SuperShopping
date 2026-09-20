import { useState, useEffect, useRef } from 'react'
import {
  Box, Button, Card, Typography,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Skeleton, CircularProgress, useTheme,
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

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

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

// ── Nivel 1: el hogar activo es la identidad principal de la pantalla ───────
function CurrentWorkspaceHero({ workspace }) {
  const st = useTheme().palette.stock.saludable
  return (
    <Card sx={{ bgcolor: st.tint, borderColor: st.line, p: 3, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Home />
      </Box>
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography component="h2" sx={{ fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>
          {workspace.name}
        </Typography>
        <Box><RoleChip role={workspace.my_role} /></Box>
        {workspace.description && <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>{workspace.description}</Typography>}
        <OwnerLine workspace={workspace} />
      </Box>
    </Card>
  )
}

function WorkspaceCard({ workspace, isCurrent, onSelect, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const isOwner = workspace.my_role === 'owner'
  const close = () => setAnchorEl(null)

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: isCurrent ? '2px solid' : '1px solid', borderColor: isCurrent ? 'primary.main' : 'divider' }}>
      <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Home />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography component="h3" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }} noWrap>{workspace.name}</Typography>
            <Box sx={{ mt: 0.5 }}><RoleChip role={workspace.my_role} /></Box>
          </Box>
          {isCurrent && <CheckCircle aria-label="Hogar activo" sx={{ color: 'primary.main', fontSize: 24, flexShrink: 0 }} />}
          {isOwner && (
            <>
              <IconButton aria-label={`Acciones de ${workspace.name}`} onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ flexShrink: 0, mt: -0.5, mr: -1 }}>
                <MoreVert fontSize="small" />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
                <MenuItem onClick={() => { close(); onEdit(workspace) }}>
                  <ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Editar</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { close(); onDelete(workspace) }}>
                  <ListItemIcon><Delete fontSize="small" /></ListItemIcon><ListItemText>Eliminar</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
        {workspace.description && <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>{workspace.description}</Typography>}
        <Box sx={{ mt: 'auto' }}><OwnerLine workspace={workspace} /></Box>
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
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

const GRID = { display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { workspaces, currentWorkspace, loading, fetchWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, setCurrentWorkspace } = useWorkspaceStore()
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
  const active = workspaces.find((w) => w.id === currentWorkspace?.id)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box {...reveal(0)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>Mis Hogares</Typography>
        <Button startIcon={<Add />} variant={workspaces.length === 0 ? 'outlined' : 'contained'} onClick={openCreate}>Nuevo Hogar</Button>
      </Box>

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setRetryTick((t) => t + 1) }} />
      )}

      {active && <Box {...reveal(1)}><CurrentWorkspaceHero workspace={active} /></Box>}

      <Box {...reveal(2)}>
        {showSkeleton ? (
          <Box sx={GRID}>
            {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: '12px' }} />)}
          </Box>
        ) : failedWithoutData ? null : workspaces.length === 0 ? (
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

      <Dialog open={Boolean(deleteConfirm)} onClose={deleting ? undefined : () => setDeleteConfirm(null)}>
        <DialogTitle>Eliminar Hogar</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body }}>¿Estás seguro de que quieres eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
