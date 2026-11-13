import { useState, useEffect, useRef } from 'react'
import {
  Box, Card, Typography, Button, TextField,
  Avatar, IconButton, ListItemIcon, ListItemText, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, Alert, Divider, Select, FormControl, InputLabel, Skeleton, CircularProgress,
} from '@mui/material'
import { History, People, PersonAdd, MoreVert, Delete, Email, Settings, Schedule, SwapHoriz, Shield, Logout, Link as LinkIcon, Close } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useAppStore } from '@/store/appStore'
import LoadErrorBanner from '@/shared/components/LoadErrorBanner'
import { LOCALE, fmtDate } from '@/shared/utils/format'
import { ROLE_LABELS, ASSIGNABLE_ROLES, EMAIL_RE, canManageRole } from '../constants'
import RoleChip from '../components/RoleChip'
import { ConfirmDialog, PageHeader, RowDivider, Section, StatusPill } from '@/shared/components/ui'
import { FS, reveal } from '@/theme/tokens'


const ACTIVITY_LABELS = { created: 'creó', updated: 'actualizó', quantity_changed: 'cambió la cantidad de', deleted: 'desactivó' }
const fmtDateTime = (d) => new Date(d).toLocaleString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

// Quién hizo qué en el inventario del hogar
function ActivityFeed({ workspaceId, members, fetchActivity }) {
  const [state, setState] = useState({ status: 'loading', items: [], error: null })
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchActivity(workspaceId).then(({ data, error }) => {
      if (!cancelled) setState({ status: error ? 'error' : 'ready', items: data, error })
    })
    return () => { cancelled = true }
  }, [workspaceId, fetchActivity, retryTick])

  if (state.status === 'error') {
    return <LoadErrorBanner message={state.error?.message || 'Sin detalle del servidor'} onRetry={() => { setState({ status: 'loading', items: [], error: null }); setRetryTick((t) => t + 1) }} />
  }
  if (state.status === 'loading') {
    return (
      <Card>
        {[1, 2, 3, 4].map((i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, minHeight: 60 }}>
            <Skeleton variant="circular" width={36} height={36} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="60%" sx={{ fontSize: FS.body }} />
              <Skeleton variant="text" width="30%" sx={{ fontSize: FS.meta }} />
            </Box>
          </Box>
        ))}
      </Card>
    )
  }
  if (state.items.length === 0) {
    return <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Todavía no hay actividad registrada.</Typography>
  }

  const profileOf = (id) => members.find((m) => m.profiles?.id === id)?.profiles
  return (
    <Card>
      {state.items.map((a, i) => {
        const author = profileOf(a.user_id)
        const name = author?.full_name || author?.email || 'Alguien'
        return (
          <Box key={a.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 2, sm: 2.5 }, py: 1, minHeight: 60 }}>
              <Avatar src={author?.avatar_url} alt={name} sx={{ width: 36, height: 36, bgcolor: 'action.selected', color: 'primary.main', fontSize: FS.meta }}>{name[0]?.toUpperCase()}</Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography sx={{ fontSize: FS.body, lineHeight: 1.35 }}>
                  <strong>{name}</strong> {ACTIVITY_LABELS[a.action] ?? a.action} <strong>{a.products?.name ?? 'un producto'}</strong>
                </Typography>
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(a.created_at)}</Typography>
              </Box>
            </Box>
            {i < state.items.length - 1 && <RowDivider />}
          </Box>
        )
      })}
    </Card>
  )
}

const inviteLink = (token) => `${window.location.origin}/invite/${token}`

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

const ROLE_HINTS = {
  admin: 'Gestiona miembros, invitaciones y datos del hogar, y puede eliminar contenido.',
  editor: 'Gestiona inventario, presupuestos y compras.',
  viewer: 'Solo puede ver la información del hogar.',
}

function MemberItem({ member, canManage, viewerIsOwner, currentUserId, onRoleChange, onRemove, onTransfer, last }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const isSelf = member.profiles?.id === currentUserId
  const label = member.profiles?.full_name || member.profiles?.email
  const close = () => setAnchorEl(null)
  // Al propietario no se le cambia el rol ni se le quita: solo él transfiere la propiedad
  const showMenu = canManage && !isSelf && member.role !== 'owner'

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: { xs: 2, sm: 2.5 }, pr: { xs: 1, sm: 1.5 }, py: 1, minHeight: 64, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <Avatar src={member.profiles?.avatar_url} alt={label} sx={{ width: 40, height: 40, bgcolor: 'action.selected', color: 'primary.main' }}>
          {label?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ flex: '1 1 140px', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: FS.body, fontWeight: 600, lineHeight: 1.35 }}>{label}</Typography>
            {isSelf && <StatusPill>Tú</StatusPill>}
          </Box>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>{member.profiles?.email}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <RoleChip role={member.role} />
          {showMenu && (
            <>
              <IconButton aria-label={`Acciones de ${label}`} onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                <MoreVert fontSize="small" />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
                {ASSIGNABLE_ROLES.map((role) => (
                  <MenuItem key={role} onClick={() => { close(); onRoleChange(member.profiles?.id, role) }} disabled={member.role === role}>
                    <ListItemIcon><SwapHoriz fontSize="small" /></ListItemIcon>
                    <ListItemText>Cambiar a {ROLE_LABELS[role]}</ListItemText>
                  </MenuItem>
                ))}
                {viewerIsOwner && (
                  <MenuItem onClick={() => { close(); onTransfer(member) }}>
                    <ListItemIcon><Shield fontSize="small" /></ListItemIcon><ListItemText>Hacer propietario</ListItemText>
                  </MenuItem>
                )}
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => { close(); onRemove(member) }}>
                  <ListItemIcon><Delete fontSize="small" /></ListItemIcon><ListItemText>Quitar del hogar</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>
      {!last && <RowDivider />}
    </Box>
  )
}

function InvitationItem({ invitation, canManage, onCopy, onCancel, last }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: { xs: 2, sm: 2.5 }, pr: { xs: 1, sm: 1.5 }, py: 1, minHeight: 64, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'action.hover', color: 'text.secondary' }}><Email /></Avatar>
        <Box sx={{ flex: '1 1 160px', minWidth: 0 }}>
          <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{invitation.email}</Typography>
          <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            Rol: {ROLE_LABELS[invitation.role]} • Expira: {fmtDate(invitation.expires_at)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <StatusPill tone="warn" icon={Schedule}>Pendiente</StatusPill>
          {canManage && (
            <>
              <IconButton aria-label={`Copiar enlace de invitación para ${invitation.email}`} onClick={() => onCopy(invitation)} sx={{ color: 'text.secondary' }}>
                <LinkIcon fontSize="small" />
              </IconButton>
              <IconButton aria-label={`Cancelar invitación de ${invitation.email}`} onClick={() => onCancel(invitation)} sx={{ color: 'text.secondary' }}>
                <Close fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </Box>
      {!last && <RowDivider />}
    </Box>
  )
}

export default function WorkspaceSettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentWorkspace, members, invitations, fetchMembers, fetchInvitations, fetchActivity,
    updateMemberRole, removeMember, inviteMember, cancelInvitation, updateWorkspace, transferOwnership, leaveWorkspace,
  } = useWorkspaceStore()
  const refreshSignal = useAppStore((s) => s.refreshSignal)
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const [tab, setTab] = useState(0)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'editor' })
  const [emailError, setEmailError] = useState('')
  const [saving, setSaving] = useState(false)
  // Borrador del formulario: mientras no se edite, se muestran los datos del hogar actual
  const [wsDraft, setWsDraft] = useState(null)
  const [nameError, setNameError] = useState('')
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [transferConfirm, setTransferConfirm] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(null)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [membersReady, setMembersReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const nameRef = useRef(null)
  const emailRef = useRef(null)

  const isOwner = currentWorkspace?.my_role === 'owner'
  const canManage = canManageRole(currentWorkspace?.my_role)
  const wsForm = wsDraft ?? { name: currentWorkspace?.name || '', description: currentWorkspace?.description || '' }

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

  const validateEmail = (v) => {
    const email = v.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return 'Ingresa un email válido.'
    if (members.some((m) => m.profiles?.email?.toLowerCase() === email)) return 'Esta persona ya es miembro del hogar.'
    if (invitations.some((i) => i.email?.toLowerCase() === email)) return 'Ya hay una invitación pendiente para este email.'
    return ''
  }
  const validateName = (v) => (v.trim() ? '' : 'Ingresa el nombre del hogar.')

  const handleCopyLink = async (invitation) => {
    const ok = await copyText(inviteLink(invitation.token))
    enqueueSnackbar(ok ? 'Enlace copiado. Compártelo con la persona invitada.' : 'No se pudo copiar el enlace', { variant: ok ? 'success' : 'error' })
  }

  const handleInvite = async () => {
    const err = validateEmail(inviteForm.email)
    setEmailError(err)
    if (err) { emailRef.current?.focus(); return }
    setSaving(true)
    const { data, error } = await inviteMember(currentWorkspace.id, inviteForm.email, inviteForm.role, user.id)
    setSaving(false)
    if (error) { enqueueSnackbar(`Error al crear la invitación: ${error.message}`, { variant: 'error' }); return }
    setInviteDialog(false)
    // No se envían correos: la persona la ve en "Mis hogares" al entrar con ese email, o por el enlace
    enqueueSnackbar('Invitación creada. La verá en Mis hogares al entrar con ese email.', {
      variant: 'success',
      action: (key) => (
        <Button color="inherit" sx={{ fontWeight: 700 }} onClick={() => { closeSnackbar(key); handleCopyLink(data) }}>Copiar enlace</Button>
      ),
    })
  }

  const handleRoleChange = async (memberId, role) => {
    const { error } = await updateMemberRole(currentWorkspace.id, memberId, role)
    if (error) enqueueSnackbar(`Error al cambiar rol: ${error.message}`, { variant: 'error' })
    else enqueueSnackbar('Rol actualizado', { variant: 'success' })
  }

  const handleRemoveMember = async () => {
    setBusy(true)
    const { error } = await removeMember(currentWorkspace.id, removeConfirm.profiles?.id)
    setBusy(false)
    if (error) enqueueSnackbar(`Error al quitar miembro: ${error.message}`, { variant: 'error' })
    else enqueueSnackbar('Miembro quitado del hogar', { variant: 'success' })
    setRemoveConfirm(null)
  }

  const handleTransfer = async () => {
    setBusy(true)
    const { error } = await transferOwnership(currentWorkspace.id, transferConfirm.profiles?.id, user.id)
    setBusy(false)
    if (error) enqueueSnackbar(`No se pudo transferir: ${error.message}`, { variant: 'error' })
    else enqueueSnackbar('Propiedad transferida. Ahora eres Administrador.', { variant: 'success' })
    setTransferConfirm(null)
  }

  const handleCancelInvitation = async () => {
    setBusy(true)
    const { error } = await cancelInvitation(cancelConfirm.id, currentWorkspace.id)
    setBusy(false)
    if (error) enqueueSnackbar(`No se pudo cancelar: ${error.message}`, { variant: 'error' })
    else enqueueSnackbar('Invitación cancelada', { variant: 'success' })
    setCancelConfirm(null)
  }

  const handleLeave = async () => {
    setBusy(true)
    const name = currentWorkspace.name
    const { error } = await leaveWorkspace(currentWorkspace.id, user.id)
    setBusy(false)
    setLeaveConfirm(false)
    if (error) { enqueueSnackbar(`No se pudo salir: ${error.message}`, { variant: 'error' }); return }
    enqueueSnackbar(`Saliste de "${name}"`, { variant: 'success' })
    navigate('/workspaces')
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
      <PageHeader {...reveal(0)} title="Configuración del Hogar" subtitle={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{currentWorkspace.name}<RoleChip role={currentWorkspace.my_role} /></Box>} />

      {loadError && (
        <LoadErrorBanner message={loadError.message} onRetry={() => { setLoadError(null); setMembersReady(false); setRetryTick((t) => t + 1) }} />
      )}

      <Tabs {...reveal(1)} value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons={false} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Settings sx={{ fontSize: 20 }} />} label="General" iconPosition="start" />
        <Tab icon={<People sx={{ fontSize: 20 }} />} label="Miembros" iconPosition="start" />
        <Tab icon={<History sx={{ fontSize: 20 }} />} label="Actividad" iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Información del Hogar</Typography>
            <TextField
              fullWidth label="Nombre" value={wsForm.name} disabled={!canManage} required={canManage}
              onChange={(e) => setWsDraft({ ...wsForm, name: e.target.value })}
              onBlur={() => canManage && setNameError(validateName(wsForm.name))}
              error={Boolean(nameError)} helperText={nameError || ' '}
              inputRef={nameRef}
            />
            <TextField fullWidth label="Descripción" value={wsForm.description} onChange={(e) => setWsDraft({ ...wsForm, description: e.target.value })} multiline rows={3} disabled={!canManage} />
            {canManage && (
              <Box>
                <Button variant="contained" onClick={handleSaveWorkspace} disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </Box>
            )}
          </Card>

          <Card sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Salir del hogar</Typography>
            {isOwner ? (
              <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>
                Eres el propietario. Para salir, primero haz propietario a otro miembro desde la pestaña Miembros, o elimina el hogar en Mis hogares.
              </Typography>
            ) : (
              <>
                <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Dejarás de ver el inventario, los presupuestos y las compras de este hogar. Para volver necesitarás una nueva invitación.</Typography>
                <Box><Button color="error" variant="outlined" startIcon={<Logout />} onClick={() => setLeaveConfirm(true)}>Salir del hogar</Button></Box>
              </>
            )}
          </Card>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{members.length} Miembro{members.length !== 1 ? 's' : ''}</Typography>
            {canManage && (
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
                <MemberItem
                  key={m.id} member={m} canManage={canManage} viewerIsOwner={isOwner} currentUserId={user?.id}
                  onRoleChange={handleRoleChange} onRemove={setRemoveConfirm} onTransfer={setTransferConfirm}
                  last={i === members.length - 1}
                />
              ))
            )}
          </Card>

          {invitations.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: 700, color: 'text.secondary' }}>Invitaciones pendientes</Typography>
              {canManage && (
                <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>
                  La persona invitada la verá en Mis hogares al entrar con ese email. También puedes copiar el enlace y enviárselo.
                </Typography>
              )}
              <Card>
                {invitations.map((inv, i) => (
                  <InvitationItem key={inv.id} invitation={inv} canManage={canManage} onCopy={handleCopyLink} onCancel={setCancelConfirm} last={i === invitations.length - 1} />
                ))}
              </Card>
            </Box>
          )}
        </Box>
      )}

      {tab === 2 && (
        <Section title="Actividad del hogar" caption="Últimos cambios en el inventario">
          <ActivityFeed workspaceId={currentWorkspace.id} members={members} fetchActivity={fetchActivity} />
        </Section>
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
                {ASSIGNABLE_ROLES.map((role) => <MenuItem key={role} value={role}>{ROLE_LABELS[role]}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>{ROLE_HINTS[inviteForm.role]}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleInvite} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {saving ? 'Creando...' : 'Crear invitación'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeConfirm)}
        title="Quitar miembro"
        confirmLabel="Quitar"
        loading={busy}
        onCancel={() => setRemoveConfirm(null)}
        onConfirm={handleRemoveMember}
      >
        <Typography sx={{ fontSize: FS.body }}>¿Quitar a <strong>{removeConfirm?.profiles?.full_name || removeConfirm?.profiles?.email}</strong> del hogar?</Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(transferConfirm)}
        title="Transferir propiedad"
        confirmLabel="Transferir"
        loading={busy}
        onCancel={() => setTransferConfirm(null)}
        onConfirm={handleTransfer}
      >
        <Typography sx={{ fontSize: FS.body }}>
          <strong>{transferConfirm?.profiles?.full_name || transferConfirm?.profiles?.email}</strong> será el nuevo propietario y podrá eliminar el hogar. Tú pasarás a ser Administrador.
        </Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(cancelConfirm)}
        title="Cancelar invitación"
        confirmLabel="Cancelar invitación"
        loading={busy}
        onCancel={() => setCancelConfirm(null)}
        onConfirm={handleCancelInvitation}
      >
        <Typography sx={{ fontSize: FS.body }}>El enlace de <strong>{cancelConfirm?.email}</strong> dejará de funcionar.</Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={leaveConfirm}
        title="Salir del hogar"
        confirmLabel="Salir"
        loading={busy}
        onCancel={() => setLeaveConfirm(false)}
        onConfirm={handleLeave}
      >
        <Typography sx={{ fontSize: FS.body }}>¿Salir de <strong>{currentWorkspace.name}</strong>?</Typography>
      </ConfirmDialog>
    </Box>
  )
}
