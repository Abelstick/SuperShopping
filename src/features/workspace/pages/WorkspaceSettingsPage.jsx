import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Avatar, Chip, IconButton, List, ListItem, ListItemAvatar,
  ListItemText, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, Alert, Divider, Select, FormControl, InputLabel,
} from '@mui/material'
import { People, PersonAdd, MoreVert, Delete, Email, Settings } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'

const ROLE_LABELS = { owner: 'Propietario', editor: 'Editor', viewer: 'Lector' }
const ROLE_COLORS = { owner: 'primary', editor: 'success', viewer: 'default' }

function MemberItem({ member, isOwner, currentUserId, onRoleChange, onRemove }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const isSelf = member.profiles?.id === currentUserId

  return (
    <ListItem divider>
      <ListItemAvatar>
        <Avatar src={member.profiles?.avatar_url}>{member.profiles?.full_name?.[0]?.toUpperCase()}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {member.profiles?.full_name || member.profiles?.email}
          {isSelf && <Chip size="small" label="Tú" />}
        </Box>}
        secondary={member.profiles?.email}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip size="small" label={ROLE_LABELS[member.role]} color={ROLE_COLORS[member.role]} />
        {isOwner && !isSelf && (
          <>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              {['editor', 'viewer'].map((role) => (
                <MenuItem key={role} onClick={() => { setAnchorEl(null); onRoleChange(member.profiles?.id, role) }} disabled={member.role === role}>
                  Cambiar a {ROLE_LABELS[role]}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); onRemove(member) }} sx={{ color: 'error.main' }}>
                <Delete fontSize="small" sx={{ mr: 1 }} /> Eliminar
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
    </ListItem>
  )
}

export default function WorkspaceSettingsPage() {
  const { user } = useAuthStore()
  const { currentWorkspace, members, invitations, fetchMembers, fetchInvitations, updateMemberRole, removeMember, inviteMember, updateWorkspace } = useWorkspaceStore()
  const { enqueueSnackbar } = useSnackbar()
  const [tab, setTab] = useState(0)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'editor' })
  const [saving, setSaving] = useState(false)
  const [wsForm, setWsForm] = useState({ name: currentWorkspace?.name || '', description: currentWorkspace?.description || '' })
  const [removeConfirm, setRemoveConfirm] = useState(null)

  const isOwner = currentWorkspace?.my_role === 'owner'

  useEffect(() => {
    if (currentWorkspace) {
      fetchMembers(currentWorkspace.id)
      fetchInvitations(currentWorkspace.id)
      setWsForm({ name: currentWorkspace.name, description: currentWorkspace.description || '' })
    }
  }, [currentWorkspace?.id])

  const handleInvite = async () => {
    setSaving(true)
    const { error } = await inviteMember(currentWorkspace.id, inviteForm.email, inviteForm.role, user.id)
    setSaving(false)
    if (error) enqueueSnackbar('Error al enviar invitación', { variant: 'error' })
    else { enqueueSnackbar('Invitación enviada', { variant: 'success' }); setInviteDialog(false) }
  }

  const handleRoleChange = async (memberId, role) => {
    const { error } = await updateMemberRole(currentWorkspace.id, memberId, role)
    if (error) enqueueSnackbar('Error al cambiar rol', { variant: 'error' })
    else enqueueSnackbar('Rol actualizado', { variant: 'success' })
  }

  const handleRemoveMember = async () => {
    const { error } = await removeMember(currentWorkspace.id, removeConfirm.profiles?.id)
    if (error) enqueueSnackbar('Error al eliminar miembro', { variant: 'error' })
    else enqueueSnackbar('Miembro eliminado', { variant: 'success' })
    setRemoveConfirm(null)
  }

  const handleSaveWorkspace = async () => {
    setSaving(true)
    const { error } = await updateWorkspace(currentWorkspace.id, wsForm)
    setSaving(false)
    if (error) enqueueSnackbar('Error al guardar', { variant: 'error' })
    else enqueueSnackbar('Hogar actualizado', { variant: 'success' })
  }

  if (!currentWorkspace) return <Alert severity="info">Selecciona un hogar primero.</Alert>

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>Configuración del Hogar</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Settings />} label="General" iconPosition="start" />
        <Tab icon={<People />} label="Miembros" iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Información del Hogar</Typography>
            <TextField fullWidth label="Nombre" value={wsForm.name} onChange={(e) => setWsForm((f) => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} disabled={!isOwner} />
            <TextField fullWidth label="Descripción" value={wsForm.description} onChange={(e) => setWsForm((f) => ({ ...f, description: e.target.value }))} multiline rows={3} disabled={!isOwner} />
            {isOwner && (
              <Button variant="contained" onClick={handleSaveWorkspace} disabled={saving} sx={{ mt: 2 }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{members.length} Miembro{members.length !== 1 ? 's' : ''}</Typography>
            {isOwner && (
              <Button startIcon={<PersonAdd />} variant="contained" onClick={() => { setInviteForm({ email: '', role: 'editor' }); setInviteDialog(true) }}>
                Invitar
              </Button>
            )}
          </Box>

          <Card sx={{ mb: 2 }}>
            <List disablePadding>
              {members.map((m) => (
                <MemberItem key={m.id} member={m} isOwner={isOwner} currentUserId={user?.id} onRoleChange={handleRoleChange} onRemove={setRemoveConfirm} />
              ))}
            </List>
          </Card>

          {invitations.length > 0 && (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Invitaciones pendientes</Typography>
              <Card>
                <List disablePadding>
                  {invitations.map((inv) => (
                    <ListItem key={inv.id} divider>
                      <ListItemAvatar><Avatar><Email /></Avatar></ListItemAvatar>
                      <ListItemText primary={inv.email} secondary={`Rol: ${ROLE_LABELS[inv.role]} • Expira: ${new Date(inv.expires_at).toLocaleDateString()}`} />
                      <Chip size="small" label="Pendiente" color="warning" />
                    </ListItem>
                  ))}
                </List>
              </Card>
            </>
          )}
        </Box>
      )}

      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invitar miembro</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} sx={{ mt: 1, mb: 2 }} />
          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select value={inviteForm.role} label="Rol" onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="viewer">Lector</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleInvite} disabled={saving || !inviteForm.email}>
            {saving ? 'Enviando...' : 'Enviar invitación'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(removeConfirm)} onClose={() => setRemoveConfirm(null)}>
        <DialogTitle>Eliminar miembro</DialogTitle>
        <DialogContent>
          <Typography>¿Eliminar a <strong>{removeConfirm?.profiles?.full_name}</strong> del hogar?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleRemoveMember}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
