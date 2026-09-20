import { useState } from 'react'
import {
  Box, Button, Card, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, CircularProgress,
} from '@mui/material'
import { Add, Edit, Delete, Category, Check } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useInventoryStore } from '../store/inventoryStore'

// Tamaños: 20 títulos · 15 texto · 13 meta
const FS = { title: 20, body: 15, meta: 13 }
const PRESET_COLORS = ['#f44336','#e91e63','#9c27b0','#3f51b5','#2196f3','#03a9f4','#009688','#4caf50','#8bc34a','#ffeb3b','#ff9800','#795548']

export default function CategoryManager({ workspaceId, isEditor }) {
  const { categories, createCategory, updateCategory, deleteCategory } = useInventoryStore()
  const { enqueueSnackbar } = useSnackbar()
  const [dialog, setDialog] = useState({ open: false, category: null })
  const [form, setForm] = useState({ name: '', color: '#2196F3', aisle: '' })
  const [saving, setSaving] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deletingCat, setDeletingCat] = useState(false)

  const openCreate = () => { setDialog({ open: true, category: null }); setForm({ name: '', color: '#2196F3', aisle: '' }); setNameTouched(false) }
  const openEdit = (c) => { setDialog({ open: true, category: c }); setForm({ name: c.name, color: c.color, aisle: c.aisle || '' }); setNameTouched(false) }

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
    setDeletingCat(true)
    const { error } = await deleteCategory(deleteConfirm.id)
    setDeletingCat(false)
    if (error) enqueueSnackbar('Error al eliminar', { variant: 'error' })
    else enqueueSnackbar('Categoría eliminada', { variant: 'success' })
    setDeleteConfirm(null)
  }

  const nameError = nameTouched && !form.name.trim() ? 'Ingresa el nombre de la categoría.' : ''

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Typography component="h2" sx={{ fontSize: FS.title, fontWeight: 700, lineHeight: 1.3 }}>Categorías</Typography>
        {isEditor && <Button startIcon={<Add />} variant="contained" onClick={openCreate}>Nueva</Button>}
      </Box>

      {categories.length === 0 ? (
        <Card sx={{ px: 3, py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, borderStyle: 'dashed' }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: 'action.hover', color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Category sx={{ fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>No hay categorías.</Typography>
          {isEditor && <Button variant="outlined" startIcon={<Add />} onClick={openCreate}>Nueva</Button>}
        </Card>
      ) : (
        <Card>
          {categories.map((c, i) => (
            <Box key={c.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1, minHeight: 64 }}>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: FS.body, fontWeight: 700 }} noWrap>{c.name}</Typography>
                  {c.aisle && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }}>Pasillo: {c.aisle}</Typography>}
                </Box>
                {isEditor && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <IconButton aria-label={`Editar categoría ${c.name}`} onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton>
                    <IconButton aria-label={`Eliminar categoría ${c.name}`} onClick={() => setDeleteConfirm(c)}><Delete fontSize="small" /></IconButton>
                  </Box>
                )}
              </Box>
              {i < categories.length - 1 && <Divider sx={{ mx: 3 }} />}
            </Box>
          ))}
        </Card>
      )}

      <Dialog open={dialog.open} onClose={saving ? undefined : () => setDialog({ open: false, category: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.category ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              fullWidth required autoFocus label="Nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => setNameTouched(true)}
              error={Boolean(nameError)}
              helperText={nameError || ' '}
            />
            <TextField fullWidth label="Pasillo (opcional)" value={form.aisle} onChange={(e) => setForm((f) => ({ ...f, aisle: e.target.value }))} placeholder="ej: A1, Bebidas, Lácteos..." />
            <Box role="radiogroup" aria-label="Color">
              <Typography sx={{ fontSize: FS.body, fontWeight: 700, mb: 1 }}>Color</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((color) => {
                  const selected = form.color.toLowerCase() === color
                  return (
                    <Box
                      key={color}
                      component="button"
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={color}
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      sx={{
                        width: 44, height: 44, borderRadius: '8px', bgcolor: color, cursor: 'pointer', p: 0,
                        border: 0, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        outline: selected ? '2px solid' : '2px solid transparent', outlineColor: selected ? 'text.primary' : 'transparent', outlineOffset: 2,
                        transition: 'outline-color 120ms',
                      }}
                    >
                      {selected && <Check sx={{ fontSize: 24, color: '#FFFFFF', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))' }} />}
                    </Box>
                  )
                })}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, category: null })} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteConfirm)} onClose={deletingCat ? undefined : () => setDeleteConfirm(null)}>
        <DialogTitle>Eliminar Categoría</DialogTitle>
        <DialogContent><Typography sx={{ fontSize: FS.body }}>¿Eliminar "{deleteConfirm?.name}"?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} disabled={deletingCat}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deletingCat}
            startIcon={deletingCat ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
