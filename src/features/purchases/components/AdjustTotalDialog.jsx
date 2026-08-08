import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, Typography, InputAdornment,
} from '@mui/material'

export default function AdjustTotalDialog({ open, itemsSubtotal, initialTotal, saving, title, confirmLabel, onConfirm, onClose }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue(String(initialTotal ?? itemsSubtotal ?? ''))
  }, [open, initialTotal, itemsSubtotal])

  const total = Number(value || 0)
  const diff = total - itemsSubtotal
  const showDiff = value !== '' && Math.abs(diff) > 0.009

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          El precio en caja a veces no coincide con el de góndola — ajustá el total si hace falta.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 2, mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Suma de productos</Typography>
          <Typography variant="subtitle1" fontWeight={700}>S/{itemsSubtotal.toFixed(2)}</Typography>
        </Box>
        <TextField
          fullWidth autoFocus type="number" label="Total pagado (boleta)"
          value={value} onChange={(e) => setValue(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
        />
        {showDiff && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1 }} color={diff > 0 ? 'error.main' : 'success.main'}>
            Ajuste: {diff > 0 ? '+' : ''}S/{diff.toFixed(2)} ({diff > 0 ? 'más caro' : 'más barato'} que la suma de productos)
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={() => onConfirm(total)} disabled={saving || value === ''} fullWidth>
          {saving ? 'Guardando…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
