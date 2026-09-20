import { useState, useEffect, useRef } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Alert, Typography, InputAdornment, Divider, IconButton, CircularProgress,
} from '@mui/material'
import { Receipt, Close, Store, CalendarToday } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useBudgetStore } from '../store/budgetStore'

// Tamaños: 20 título · 15 texto · 13 meta
const FS = { title: 20, body: 15, meta: 13 }

function SectionLabel({ children }) {
  return <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: 700, mb: 2 }}>{children}</Typography>
}

// Validación al salir del campo (on blur) y de nuevo al guardar
const validators = {
  name: (v) => (String(v).trim() ? '' : 'Ingresa el nombre del presupuesto.'),
  target_amount: (v) => (v !== '' && Number(v) < 0 ? 'El monto no puede ser negativo.' : ''),
}
const FIELD_ORDER = ['name', 'target_amount']

export default function BudgetForm({ open, budget, workspaceId, userId, onClose }) {
  const { createBudget, updateBudget } = useBudgetStore()
  const { enqueueSnackbar } = useSnackbar()
  const isEdit = Boolean(budget)

  const [form, setForm] = useState({ name: '', store: '', date: '', target_amount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const nameRef = useRef(null)
  const amountRef = useRef(null)

  useEffect(() => {
    if (open) {
      setError('')
      setFieldErrors({})
      setForm(budget
        ? { name: budget.name, store: budget.store || '', date: budget.date || '', target_amount: budget.target_amount || '' }
        : { name: '', store: '', date: new Date().toISOString().split('T')[0], target_amount: '' }
      )
    }
  }, [open, budget])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const blur = (field) => () => setFieldErrors((errs) => ({ ...errs, [field]: validators[field](form[field]) }))

  const handleSubmit = async () => {
    const errs = Object.fromEntries(FIELD_ORDER.map((f) => [f, validators[f](form[f])]))
    setFieldErrors(errs)
    const firstInvalid = FIELD_ORDER.find((f) => errs[f])
    if (firstInvalid) {
      if (firstInvalid === 'name') setError('El nombre del presupuesto es requerido.')
      const refs = { name: nameRef, target_amount: amountRef }
      refs[firstInvalid].current?.focus()
      return
    }
    setSaving(true)
    setError('')
    const payload = { ...form, target_amount: form.target_amount ? Number(form.target_amount) : null, date: form.date || null }
    const { error: err } = isEdit
      ? await updateBudget(budget.id, payload)
      : await createBudget(workspaceId, payload, userId)
    setSaving(false)
    if (err) { setError(err.message || 'Error al guardar.'); return }
    enqueueSnackbar(isEdit ? 'Presupuesto actualizado' : 'Presupuesto creado', { variant: 'success' })
    onClose()
  }

  const submitLabel = isEdit ? 'Guardar cambios' : 'Crear presupuesto'

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, bgcolor: 'action.selected', borderRadius: '8px', color: 'primary.main', display: 'flex', flexShrink: 0 }}>
            <Receipt sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography component="span" sx={{ display: 'block', fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>
              {isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}
            </Typography>
            <Typography component="span" sx={{ display: 'block', fontSize: FS.meta, fontWeight: 400, color: 'text.secondary' }}>
              {isEdit ? 'Modifica los datos del presupuesto' : 'Define el presupuesto para tu próxima compra'}
            </Typography>
          </Box>
          <IconButton aria-label="Cerrar" onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {error && <Alert severity="warning" onClose={() => setError('')} sx={{ mb: 3 }}>{error}</Alert>}

        <SectionLabel>Información básica</SectionLabel>
        <TextField
          fullWidth
          label="Nombre del presupuesto"
          required
          value={form.name}
          onChange={set('name')}
          onBlur={blur('name')}
          error={Boolean(fieldErrors.name)}
          helperText={fieldErrors.name || ' '}
          inputRef={nameRef}
          placeholder="Ej: Compra semanal, Despensa del mes…"
          autoFocus
        />

        <Box sx={{ mt: 4 }}>
          <SectionLabel>Detalles de la compra</SectionLabel>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              fullWidth
              label="Supermercado / Local"
              value={form.store}
              onChange={set('store')}
              placeholder="Ej: Carrefour, Día…"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Store sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment> } }}
            />
            <TextField
              fullWidth
              type="date"
              label="Fecha de compra"
              value={form.date}
              onChange={set('date')}
              slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarToday sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment> } }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          <SectionLabel>Límite de gasto</SectionLabel>
          <TextField
            fullWidth
            type="number"
            label="Monto objetivo"
            value={form.target_amount}
            onChange={set('target_amount')}
            onBlur={blur('target_amount')}
            error={Boolean(fieldErrors.target_amount)}
            inputRef={amountRef}
            placeholder="0.00"
            helperText={fieldErrors.target_amount || 'Opcional. Se usará para calcular el progreso durante la compra.'}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><Box component="span" sx={{ color: 'text.secondary', fontSize: FS.meta, fontWeight: 700 }}>S/</Box></InputAdornment> },
              htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' },
            }}
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ minWidth: 144 }}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
