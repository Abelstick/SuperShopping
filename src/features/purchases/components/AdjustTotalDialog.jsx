import { useEffect, useRef, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, Typography, InputAdornment, CircularProgress, useTheme,
} from '@mui/material'
import { TrendingUp, TrendingDown } from '@mui/icons-material'
import { fmtMoney } from '@/shared/utils/format'

// Tamaños: 20 título · 15 texto · 13 meta
const FS = { title: 20, body: 15, meta: 13 }
const validate = (v) => (v !== '' && Number(v) < 0 ? 'El total no puede ser negativo.' : '')

export default function AdjustTotalDialog({ open, itemsSubtotal, initialTotal, saving, title, confirmLabel, onConfirm, onClose }) {
  const st = useTheme().palette.stock
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setValue(String(initialTotal ?? itemsSubtotal ?? ''))
      setError('')
    }
  }, [open, initialTotal, itemsSubtotal])

  const total = Number(value || 0)
  const diff = total - itemsSubtotal
  const showDiff = value !== '' && Math.abs(diff) > 0.009

  const handleConfirm = () => {
    const err = validate(value)
    setError(err)
    if (err) { inputRef.current?.focus(); return }
    onConfirm(total)
  }

  // Más caro que la suma = coral (sale más capital); más barato = neutro con signo (no es un flujo positivo)
  const DiffIcon = diff > 0 ? TrendingUp : TrendingDown
  const diffColor = diff > 0 ? st.agotado.text : 'text.secondary'

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Typography component="span" sx={{ display: 'block', fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>{title}</Typography>
        <Typography component="span" sx={{ display: 'block', fontSize: FS.meta, fontWeight: 400, color: 'text.secondary', mt: 0.5 }}>
          El precio en caja a veces no coincide con el de góndola — ajustá el total si hace falta.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: '8px', my: 2 }}>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Suma de productos</Typography>
          <Typography sx={{ fontSize: FS.body, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(itemsSubtotal)}</Typography>
        </Box>
        <TextField
          fullWidth autoFocus type="number" label="Total pagado (boleta)"
          value={value} onChange={(e) => setValue(e.target.value)}
          onBlur={() => setError(validate(value))}
          error={Boolean(error)}
          helperText={error || ' '}
          inputRef={inputRef}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> }, htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
        />
        {showDiff && (
          <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: FS.body, fontWeight: 600, color: diffColor, fontVariantNumeric: 'tabular-nums' }}>
            <DiffIcon sx={{ fontSize: 20 }} />
            Ajuste: {diff > 0 ? '+ ' : ''}{fmtMoney(diff)} ({diff > 0 ? 'más caro' : 'más barato'} que la suma de productos)
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="inherit" sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={saving || value === ''}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ flexGrow: 1 }}>
          {saving ? 'Guardando…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
