import { useState, useEffect, useRef } from 'react'
import {
  Box, Card, Typography, Button, TextField,
  Avatar, IconButton, ListItemIcon, ListItemText, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, Alert, Divider, Select, FormControl, InputLabel, Skeleton, CircularProgress, useTheme,
} from '@mui/material'
import { People, PersonAdd, MoreVert, Delete, Email, Settings, Home, Schedule, SwapHoriz } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import { fmtDate } from '@/shared/utils/format'
import { ROLE_LABELS, EMAIL_RE } from '../constants'
import RoleChip from '../components/RoleChip'

// Tamaños de la pantalla (escala de 4): 48 hero (36 en móvil) · 20 títulos · 15 texto · 13 meta
const FS = { hero: 48, heroXs: 36, title: 20, body: 15, meta: 13 }
const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

function MemberItem({ member, isOwner, currentUserId, onRoleChange, onRemove, last }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const isSelf = member.profiles?.id === currentUserId
  const label = member.profiles?.full_name || member.profiles?.email
  const close = () => setAnchorEl(null)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1, minHeight: 72 }}>
        <Avatar src={member.profiles?.avatar_url} alt={label} sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: 'action.selected', color: 'primary.main' }}>
          {member.profiles?.full_name?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>{label}</Typography>
            {isSelf && (
              <Box sx={{ px: 1, borderRadius: '8px', bgcolor: 'action.hover' }}>
                <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, lineHeight: 1.6 }}>Tú</Typography>
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>{member.profiles?.email}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <RoleChip role={member.role} />
          {isOwner && !isSelf && (
            <>
              <IconButton aria-label={`Acciones de ${label}`} onClick={(e) => setAnchorEl(e.currentTarget)}>
                <MoreVert fontSize="small" />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
                {['editor', 'viewer'].map((role) => (
                  <MenuItem key={role} onClick={() => { close(); onRoleChange(member.profiles?.id, role) }} disabled={member.role === role}>
                    <ListItemIcon><SwapHoriz fontSize="small" /></ListItemIcon>
                    <ListItemText>Cambiar a {ROLE_LABELS[role]}</ListItemText>
                  </MenuItem>
                ))}
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => { close(); onRemove(member) }}>
                  <ListItemIcon><Delete fontSize="small" /></ListItemIcon><ListItemText>Eliminar</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>
      {!last && <Divider sx={{ mx: 3 }} />}
    </Box>
  )
}

export default function WorkspaceSettingsPage() {
  const theme = useTheme()
  const st = theme.palette.stock
  const { user } = useAuthStore()
  const { currentWorkspace, members, invitations, fetchMembers, fetchInvitations, updateMemberRole, removeMember, inviteMember, updateWorkspace } = useWorkspaceStore()
  const { refreshSignal } = useAppStore()
  const { enqueueSnackbar } = useSnackbar()
  const [tab, setTab] = useState(0)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'editor' })
  const [emailError, setEmailError] = useState('')
  const [saving, setSaving] = useState(false)
  // Borrador del formulario: mientras no se edite, se muestran los datos del hogar actual
  const [wsDraft, setWsDraft] = useState(null)
  const [nameError, setNameError] = useState('')
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [membersReady, setMembersReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const nameRef = useRef(null)
  const emailRef = useRef(null)

  const isOwner = currentWorkspace?.my_role === 'owner'
  const wsForm = wsDraft ?? { name: currentWorkspace?.name || '', description: currentWorkspace?.description || '' }

  // Mismas cargas de siempre; ahora se recoge el `{ error }` que ya devuelven
  useEffect(() => {
    if (!currentWorkspace) return
    let cancelled = false
    Promise.all([fetchMembers(currentWorkspace.id), fetchInvitations(currentWorkspace.id)])
      .then((results) => {
        if (cancelled) return
        const failed = results.find((r) => r?.error)
        setLoadError(failed ? { message: failed.error.message || 'Sin detalle del servidor' } : null)
        setMembersReady(true)
      })
      .catch((e) => { if (!cancelled) { setLoadError({ message: e?.message || 'Sin detalle del servidor' }); setMembersReady(true) } })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, refreshSignal, retryTick])

  const validateEmail = (v) => (EMAIL_RE.test(v.trim()) ? '' : 'Ingresa un email válido.')
  const validateName = (v) => (v.trim() ? '' : 'Ingresa el nombre del hogar.')

  const handleInvite = async () => {
    const err = validateEmail(inviteForm.email)
    setEmailError(err)
    if (err) { emailRef.current?.focus(); return }
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
    setRemoving(true)
    const { error } = await removeMember(currentWorkspace.id, removeConfirm.profiles?.id)
    setRemoving(false)
    if (error) enqueueSnackbar('Error al eliminar miembro', { variant: 'error' })
    else enqueueSnackbar('Miembro eliminado', { variant: 'success' })
    setRemoveConfirm(null)
  }

  const handleSaveWorkspace = async () => {
    const err = validateName(wsForm.name)
    setNameError(err)
    if (err) { nameRef.current?.focus(); return }
    setSaving(true)
    const { error } = await updateWorkspace(currentWorkspace.id, wsForm)
    setSaving(false)
    if (error) enqueueSnackbar('Error al guardar', { variant: 'error' })
    else { enqueueSnackbar('Hogar actualizado', { variant: 'success' }); setWsDraft(null) }
  }

  if (!currentWorkspace) return <Alert severity="info">Selecciona un hogar primero.</Alert>

  const showMembersSkeleton = !membersReady && members.length === 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography {...reveal(0)} component="h1" sx={{ fontSize: FS.title, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em' }}>Configuración del Hogar</Typography>

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setMembersReady(false); setRetryTick((t) => t + 1) }} />
      )}

      {/* Nivel 1: el hogar que se está configurando */}
      <Card {...reveal(1)} sx={{ bgcolor: st.saludable.tint, borderColor: st.saludable.line, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Home />
        </Box>
        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography component="h2" sx={{ fontSize: { xs: FS.heroXs, md: FS.hero }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>
            {currentWorkspace.name}
          </Typography>
          <Box><RoleChip role={currentWorkspace.my_role} /></Box>
        </Box>
      </Card>

      <Tabs {...reveal(2)} value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Settings sx={{ fontSize: 20 }} />} label="General" iconPosition="start" />
        <Tab icon={<People sx={{ fontSize: 20 }} />} label="Miembros" iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Información del Hogar</Typography>
          <TextField
            fullWidth label="Nombre" value={wsForm.name} disabled={!isOwner} required={isOwner}
            onChange={(e) => setWsDraft({ ...wsForm, name: e.target.value })}
            onBlur={() => isOwner && setNameError(validateName(wsForm.name))}
            error={Boolean(nameError)} helperText={nameError || ' '}
            inputRef={nameRef}
          />
          <TextField fullWidth label="Descripción" value={wsForm.description} onChange={(e) => setWsDraft({ ...wsForm, description: e.target.value })} multiline rows={3} disabled={!isOwner} />
          {isOwner && (
            <Box>
              <Button variant="contained" onClick={handleSaveWorkspace} disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Box>
          )}
        </Card>
      )}

      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{members.length} Miembro{members.length !== 1 ? 's' : ''}</Typography>
            {isOwner && (
              <Button startIcon={<PersonAdd />} variant="contained" onClick={() => { setInviteForm({ email: '', role: 'editor' }); setEmailError(''); setInviteDialog(true) }}>
                Invitar
              </Button>
            )}
          </Box>

          <Card>
            {showMembersSkeleton ? (
              [1, 2, 3].map((i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, minHeight: 72 }}>
                  <Skeleton variant="rectangular" width={40} height={40} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" width="40%" sx={{ fontSize: FS.body }} />
                    <Skeleton variant="text" width="30%" sx={{ fontSize: FS.meta }} />
                  </Box>
                </Box>
              ))
            ) : (
              members.map((m, i) => (
                <MemberItem key={m.id} member={m} isOwner={isOwner} currentUserId={user?.id} onRoleChange={handleRoleChange} onRemove={setRemoveConfirm} last={i === members.length - 1} />
              ))
            )}
          </Card>

          {invitations.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: 700, color: 'text.secondary' }}>Invitaciones pendientes</Typography>
              <Card>
                {invitations.map((inv, i) => (
                  <Box key={inv.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1, minHeight: 72 }}>
                      <Avatar sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: 'action.hover', color: 'text.secondary' }}><Email /></Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{inv.email}</Typography>
                        <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                          Rol: {ROLE_LABELS[inv.role]} • Expira: {fmtDate(inv.expires_at)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: '8px', bgcolor: st.riesgo.tint, border: 1, borderColor: st.riesgo.line, color: st.riesgo.text, flexShrink: 0 }}>
                        <Schedule sx={{ fontSize: 16, color: st.riesgo.icon }} />
                        <Typography component="span" sx={{ fontSize: FS.meta, fontWeight: 700, color: 'inherit', lineHeight: 1.4 }}>Pendiente</Typography>
                      </Box>
                    </Box>
                    {i < invitations.length - 1 && <Divider sx={{ mx: 3 }} />}
                  </Box>
                ))}
              </Card>
            </Box>
          )}
        </Box>
      )}

      <Dialog open={inviteDialog} onClose={saving ? undefined : () => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invitar miembro</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth autoFocus label="Email" type="email" value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              onBlur={() => inviteForm.email && setEmailError(validateEmail(inviteForm.email))}
              error={Boolean(emailError)} helperText={emailError || ' '}
              inputRef={emailRef}
              slotProps={{ htmlInput: { inputMode: 'email' } }}
            />
            <FormControl fullWidth>
              <InputLabel id="inv-role">Rol</InputLabel>
              <Select labelId="inv-role" value={inviteForm.role} label="Rol" onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="viewer">Lector</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleInvite} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {saving ? 'Enviando...' : 'Enviar invitación'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(removeConfirm)} onClose={removing ? undefined : () => setRemoveConfirm(null)}>
        <DialogTitle>Eliminar miembro</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: FS.body }}>¿Eliminar a <strong>{removeConfirm?.profiles?.full_name}</strong> del hogar?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirm(null)} disabled={removing}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleRemoveMember} disabled={removing}
            startIcon={removing ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
