import { useState } from 'react'
import {
  Box, Button, List, ListItem, ListItemText,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Typography,
} from '@mui/material'
import { Add, Edit, Delete } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useInventoryStore } from '../store/inventoryStore'

const PRESET_COLORS = ['#f44336','#e91e63','#9c27b0','#3f51b5','#2196f3','#03a9f4','#009688','#4caf50','#8bc34a','#ffeb3b','#ff9800','#795548']

export default function CategoryManager({ workspaceId, isEditor }) {
  const { categories, createCategory, updateCategory, deleteCategory } = useInventoryStore()
  const { enqueueSnackbar } = useSnackbar()
  const [dialog, setDialog] = useState({ open: false, category: null })
  const [form, setForm] = useState({ name: '', color: '#2196F3', aisle: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const openCreate = () => { setDialog({ open: true, category: null }); setForm({ name: '', color: '#2196F3', aisle: '' }) }
  const openEdit = (c) => { setDialog({ open: true, category: c }); setForm({ name: c.name, color: c.color, aisle: c.aisle || '' }) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (dialog.category) {
      const { error } = await updateCategory(dialog.category.id, form)
      if (error) enqueueSnackbar('Error al actualizar', { variant: 'error' })
      else enqueueSnackbar('Categoría actualizada', { variant: 'success' })
    } else {
      const { error } = await createCategory(workspaceId, form)
      if (error) enqueueSnackbar('Error al crear', { variant: 'error' })
      else enqueueSnackbar('Categoría creada', { variant: 'success' })
    }
    setSaving(false)
    setDialog({ open: false, category: null })
  }

  const handleDelete = async () => {
    const { error } = await deleteCategory(deleteConfirm.id)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Categoría eliminada', { variant: 'success' })
    setDeleteConfirm(null)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Categorías</Typography>
        {isEditor && <Button startIcon={<Add />} variant="contained" size="small" onClick={openCreate}>Nueva</Button>}
      </Box>

      {categories.length === 0 ? (
        <Typography color="text.secondary">No hay categorías.</Typography>
      ) : (
        <List>
          {categories.map((c) => (
            <ListItem
              key={c.id}
              divider
              secondaryAction={isEditor ? (
                <>
                  <IconButton size="small" onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => setDeleteConfirm(c)} color="error"><Delete fontSize="small" /></IconButton>
                </>
              ) : undefined}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: c.color }} />
                <ListItemText primary={c.name} secondary={c.aisle ? `Pasillo: ${c.aisle}` : undefined} />
              </Box>
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, category: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.category ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField fullWidth label="Nombre *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Pasillo (opcional)" value={form.aisle} onChange={(e) => setForm((f) => ({ ...f, aisle: e.target.value }))} placeholder="ej: A1, Bebidas, Lácteos..." />
            </Grid>
            <Grid size={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>Color</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((color) => (
                  <Box key={color} onClick={() => setForm((f) => ({ ...f, color }))} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: color, cursor: 'pointer', border: form.color === color ? '3px solid #000' : '2px solid transparent', transition: 'border 0.1s' }} />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, category: null })}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Eliminar Categoría</DialogTitle>
        <DialogContent><Typography>¿Eliminar "{deleteConfirm?.name}"?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
