import { useState, useEffect } from 'react'
import {
    Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, Grid, FormControl, InputLabel, Select, MenuItem,
    Typography, Alert, InputAdornment, IconButton, Divider,
} from '@mui/material'
import { Inventory2, Close, QrCode2 } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useInventoryStore } from '../store/inventoryStore'

const UNITS = ['unidad', 'kg', 'g', 'L', 'ml', 'paquete', 'caja', 'botella', 'lata', 'bolsa', 'docena']

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

export default function ProductForm({ open, product, categories, workspaceId, userId, onClose }) {
    const { createProduct, updateProduct } = useInventoryStore()
    const { enqueueSnackbar } = useSnackbar()
    const isEdit = Boolean(product)

    const emptyForm = { name: '', description: '', category_id: '', unit: 'unidad', current_quantity: 0, min_quantity: 0, barcode: '' }
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (open) {
            setError('')
            setForm(product
                ? { name: product.name || '', description: product.description || '', category_id: product.category_id || '', unit: product.unit || 'unidad', current_quantity: product.current_quantity ?? 0, min_quantity: product.min_quantity ?? 0, barcode: product.barcode || '' }
                : emptyForm
            )
        }
    }, [open, product])

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

    const handleSubmit = async () => {
        if (!form.name.trim()) return setError('El nombre del producto es requerido.')
        setSaving(true)
        setError('')
        const payload = { ...form, category_id: form.category_id || null }
        const { error: err } = isEdit
            ? await updateProduct(product.id, payload, workspaceId, userId)
            : await createProduct(workspaceId, payload, userId)
        setSaving(false)
        if (err) { setError(err.message || 'Error al guardar el producto.'); return }
        enqueueSnackbar(isEdit ? 'Producto actualizado' : 'Producto creado', { variant: 'success' })
        onClose()
    }

    const selectedCategory = categories.find((c) => c.id === form.category_id)

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
            {/* Title */}
            <DialogTitle sx={{ px: 3, pt: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            p: 1.25,
                            bgcolor: 'rgba(99,102,241,0.12)',
                            borderRadius: '10px',
                            color: 'primary.main',
                            display: 'flex',
                            flexShrink: 0,
                        }}
                    >
                        <Inventory2 sx={{ fontSize: 20 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {isEdit ? 'Editar producto' : 'Nuevo producto'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {isEdit ? 'Modifica los datos del producto' : 'Completa la información del nuevo producto'}
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

                {/* Información básica */}
                <SectionLabel>Información básica</SectionLabel>
                <Grid container spacing={2} >
                    <Grid size={12}>
                        <TextField
                            fullWidth
                            label="Nombre del producto"
                            required
                            value={form.name}
                            onChange={set('name')}
                            placeholder="Ej: Leche entera, Jabón de manos…"
                            autoFocus
                        />
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            fullWidth
                            label="Descripción"
                            value={form.description}
                            onChange={set('description')}
                            multiline
                            rows={2}
                            placeholder="Marca, presentación u otras notas (opcional)"
                        />
                    </Grid>
                </Grid>

                {/* Clasificación */}
                <Box sx={{ mt: 3 }} >
                    <SectionLabel>Clasificación</SectionLabel>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 7 }}>
                            <FormControl fullWidth>
                                <InputLabel>Categoría</InputLabel>
                                <Select
                                    value={form.category_id}
                                    label="Categoría"
                                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                                    renderValue={(val) => {
                                        if (!val) return <Typography color="text.disabled" variant="body2">Sin categoría</Typography>
                                        return (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: selectedCategory?.color }} />
                                                {selectedCategory?.name}
                                            </Box>
                                        )
                                    }}
                                >
                                    <MenuItem value=""><Typography color="text.secondary" variant="body2">Sin categoría</Typography></MenuItem>
                                    {categories.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                                                    {c.aisle && <Typography variant="caption" color="text.disabled">Pasillo {c.aisle}</Typography>}
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                            <FormControl fullWidth>
                                <InputLabel>Unidad de medida</InputLabel>
                                <Select value={form.unit} label="Unidad de medida" onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                                    {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Box>

                {/* Stock */}
                <Box sx={{ mt: 3 }}>
                    <SectionLabel>Control de stock</SectionLabel>
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Cantidad actual"
                                value={form.current_quantity}
                                onChange={set('current_quantity')}
                                slotProps={{ htmlInput: { min: 0, step: 0.01 }, input: { endAdornment: form.unit && <InputAdornment position="end"><Typography variant="caption" color="text.disabled">{form.unit}</Typography></InputAdornment> } }}
                                helperText="Stock disponible ahora"
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Mínimo requerido"
                                value={form.min_quantity}
                                onChange={set('min_quantity')}
                                slotProps={{ htmlInput: { min: 0, step: 0.01 }, input: { endAdornment: form.unit && <InputAdornment position="end"><Typography variant="caption" color="text.disabled">{form.unit}</Typography></InputAdornment> } }}
                                helperText="Alerta cuando baje de este valor"
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* Código de barras */}
                <Box sx={{ mt: 3 }}>
                    <SectionLabel>Opcional</SectionLabel>
                    <TextField
                        fullWidth
                        label="Código de barras"
                        value={form.barcode}
                        onChange={set('barcode')}
                        placeholder="Ingresa el código de barras del producto (opcional)    "
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><QrCode2 sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
                    />
                </Box>
            </DialogContent>

            <Divider />

            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancelar</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ minWidth: 120 }}>
                    {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear producto'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
