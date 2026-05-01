import { useState, useEffect } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, Alert, Typography, InputAdornment, Divider, IconButton,
} from '@mui/material'
import { Receipt, Close, Store, CalendarToday, AttachMoney } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useBudgetStore } from '../store/budgetStore'

function SectionLabel({ children }) {
  return (
    <Typography
      variant="overline"
      color="text.disabled"
      sx={{ display: 'block', mb: 1.5, fontSize: '0.6875rem', letterSpacing: '0.08em', fontWeight: 700 }}
    >
      {children}
    </Typography>
  )
}

export default function BudgetForm({ open, budget, workspaceId, userId, onClose }) {
  const { createBudget, updateBudget } = useBudgetStore()
  const { enqueueSnackbar } = useSnackbar()
  const isEdit = Boolean(budget)

  const [form, setForm] = useState({ name: '', store: '', date: '', target_amount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setForm(budget
        ? { name: budget.name, store: budget.store || '', date: budget.date || '', target_amount: budget.target_amount || '' }
        : { name: '', store: '', date: new Date().toISOString().split('T')[0], target_amount: '' }
      )
    }
  }, [open, budget])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('El nombre del presupuesto es requerido.')
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ px: 3, pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1.25, bgcolor: 'rgba(6,182,212,0.12)', borderRadius: '10px', color: 'secondary.main', display: 'flex', flexShrink: 0 }}>
            <Receipt sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isEdit ? 'Modifica los datos del presupuesto' : 'Define el presupuesto para tu próxima compra'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5 }}>{error}</Alert>}

        <SectionLabel>Información básica</SectionLabel>
        <TextField
          fullWidth
          label="Nombre del presupuesto"
          required
          value={form.name}
          onChange={set('name')}
          placeholder="Ej: Compra semanal, Despensa del mes…"
          autoFocus
          sx={{ mb: 2 }}
        />

        <Box sx={{ mt: 3 }}>
          <SectionLabel>Detalles de la compra</SectionLabel>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Supermercado / Local"
                value={form.store}
                onChange={set('store')}
                placeholder="Ej: Carrefour, Día…"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Store sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Fecha de compra"
                value={form.date}
                onChange={set('date')}
                slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarToday sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> } }}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <SectionLabel>Límite de gasto</SectionLabel>
          <TextField
            fullWidth
            type="number"
            label="Monto objetivo"
            value={form.target_amount}
            onChange={set('target_amount')}
            placeholder="0.00"
            helperText="Opcional. Se usará para calcular el progreso durante la compra."
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><AttachMoney sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ minWidth: 120 }}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
