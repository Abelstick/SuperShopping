import { useState } from 'react'
import {
  Box, Button, ButtonBase, Card, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, CircularProgress, Tooltip,
} from '@mui/material'
import { Add, Edit, Delete, Category, Check, ChevronRight } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useInventoryStore } from '../store/inventoryStore'
import EmptyState from '@/shared/components/EmptyState'
import { CATEGORY_ICONS } from '@/shared/constants/categoryIcons'
import { normalizeText } from '@/shared/utils/text'
import { CategoryIcon, ConfirmDialog, PrimaryAction, Section } from '@/shared/components/ui'
import { FS, NUM } from '@/theme/tokens'

const PRESET_COLORS = ['#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3', '#03a9f4', '#009688', '#4caf50', '#8bc34a', '#ffeb3b', '#ff9800', '#795548']
const EMPTY_FORM = { name: '', color: '#2196F3', aisle: '', icon: 'Category' }

export default function CategoryManager({ workspaceId, isEditor, productCounts = {}, onOpenCategory }) {
  const { categories, createCategory, updateCategory, deleteCategory } = useInventoryStore()
  const { enqueueSnackbar } = useSnackbar()
  const [dialog, setDialog] = useState({ open: false, category: null })
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deletingCat, setDeletingCat] = useState(false)

  const openCreate = () => { setDialog({ open: true, category: null }); setForm(EMPTY_FORM); setNameTouched(false) }
  const openEdit = (c) => { setDialog({ open: true, category: c }); setForm({ name: c.name, color: c.color, aisle: c.aisle || '', icon: c.icon || 'Category' }); setNameTouched(false) }

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
  const nameExists = Boolean(form.name.trim()) && categories.some((c) => c.id !== dialog.category?.id && normalizeText(c.name) === normalizeText(form.name))

  return (
    <Section
      title="Categorías"
      count={categories.length > 0 ? categories.length : null}
      actions={isEditor && <PrimaryAction icon={<Add />} label="Nueva" onClick={openCreate} />}
    >
      {categories.length === 0 ? (
        <EmptyState icon={<Category sx={{ fontSize: 28 }} />} title="No hay categorías." />
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
          {categories.map((c) => {
            const count = productCounts[c.id] || 0
            const meta = [`${count} producto${count !== 1 ? 's' : ''}`, c.aisle ? `Pasillo: ${c.aisle}` : null].filter(Boolean).join(' · ')
            return (
              <Card key={c.id} sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <ButtonBase
                  aria-label={`Ver productos de ${c.name}`}
                  onClick={() => onOpenCategory?.(c.id)}
                  sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1.5, pl: 1.5, pr: 0.5, py: 1.25, minHeight: 68, textAlign: 'left', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <CategoryIcon category={c} size={44} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }} noWrap>{c.name}</Typography>
                    <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>{meta}</Typography>
                  </Box>
                  {!isEditor && <ChevronRight sx={{ color: 'text.secondary', flexShrink: 0 }} />}
                </ButtonBase>
                {isEditor && (
                  <Box sx={{ display: 'flex', flexShrink: 0, pr: 0.5 }}>
                    <Tooltip title="Editar"><IconButton aria-label={`Editar categoría ${c.name}`} onClick={() => openEdit(c)} sx={{ color: 'text.secondary' }}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton aria-label={`Eliminar categoría ${c.name}`} onClick={() => setDeleteConfirm(c)} sx={{ color: 'text.secondary' }}><Delete fontSize="small" /></IconButton></Tooltip>
                  </Box>
                )}
              </Card>
            )
          })}
        </Box>
      )}

      <Dialog open={dialog.open} onClose={saving ? undefined : () => setDialog({ open: false, category: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.category ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth required autoFocus label="Nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => setNameTouched(true)}
              error={Boolean(nameError)}
              helperText={nameError || (nameExists ? 'Ya existe una categoría con este nombre.' : ' ')}
            />
            <TextField fullWidth label="Pasillo (opcional)" value={form.aisle} onChange={(e) => setForm((f) => ({ ...f, aisle: e.target.value }))} placeholder="ej: A1, Bebidas, Lácteos..." />

            <Box role="radiogroup" aria-label="Icono">
              <Typography sx={{ fontSize: FS.body, fontWeight: 700, mb: 1 }}>Icono</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 0.75 }}>
                {Object.entries(CATEGORY_ICONS).map(([key, { Icon, label }]) => {
                  const selected = form.icon === key
                  return (
                    <Tooltip key={key} title={label}>
                      <ButtonBase
                        role="radio"
                        aria-checked={selected}
                        aria-label={label}
                        onClick={() => setForm((f) => ({ ...f, icon: key }))}
                        sx={{
                          height: 44, borderRadius: '10px', border: 1,
                          borderColor: selected ? 'primary.main' : 'divider',
                          bgcolor: selected ? 'action.selected' : 'transparent',
                          color: selected ? 'primary.main' : 'text.secondary',
                        }}
                      >
                        <Icon sx={{ fontSize: 22 }} />
                      </ButtonBase>
                    </Tooltip>
                  )
                })}
              </Box>
            </Box>

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
                        width: 44, height: 44, borderRadius: '10px', bgcolor: color, cursor: 'pointer', p: 0,
                        border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        outline: '2px solid', outlineColor: selected ? 'text.primary' : 'transparent', outlineOffset: 2,
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

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Categoría"
        confirmLabel="Eliminar"
        loading={deletingCat}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      >
        <Typography sx={{ fontSize: FS.body }}>¿Eliminar "{deleteConfirm?.name}"?</Typography>
      </ConfirmDialog>
    </Section>
  )
}
