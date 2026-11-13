import {
  Avatar, Box, ButtonBase, Checkbox, IconButton, Tooltip, Typography, useTheme,
} from '@mui/material'
import { Add, CheckRounded, Delete, Edit, Lock, LockOpen, Remove } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { FS, NUM } from '@/theme/tokens'
import { fmtMoney } from '@/shared/utils/format'
import { roundQty, stepFor } from '@/shared/utils/quantity'
import { StatusPill } from '@/shared/components/ui'
import { useShoppingStore } from '../store/shoppingStore'

// Casilla redonda de 48 px: se puede acertar caminando y con una mano
function CheckRing({ label, disabled, busy, onClick }) {
  return (
    <ButtonBase
      aria-label={label}
      disabled={disabled || busy}
      onClick={onClick}
      sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: '50%', '&:hover > span': { borderColor: 'primary.main', bgcolor: 'action.selected' } }}
    >
      <Box
        component="span"
        sx={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 2, borderStyle: disabled ? 'dashed' : 'solid', borderColor: busy ? 'primary.main' : 'text.disabled',
          bgcolor: busy ? 'primary.main' : 'transparent', color: 'primary.contrastText',
          transition: 'background-color 140ms, border-color 140ms',
        }}
      >
        {busy && <CheckRounded sx={{ fontSize: 20, animation: 'check-pop 240ms var(--ease-out) both' }} />}
      </Box>
    </ButtonBase>
  )
}

// ── Producto pendiente ───────────────────────────────────────────────────────
export function PendingItemRow({ item, lock, isLockedByMe, sessionId, onOpen, onQuickAdd, busy, selectMode, selected, onToggleSelect, compact }) {
  const st = useTheme().vars.palette.stock
  const { lockItem, unlockItem } = useShoppingStore()
  const { enqueueSnackbar } = useSnackbar()
  const isLocked = Boolean(lock)
  const canInteract = !isLocked || isLockedByMe
  // Mientras se agrega no se puede abrir: evita enviar el mismo producto dos veces
  const canOpen = canInteract && !selectMode && !busy

  const handleLock = async () => {
    if (isLockedByMe) {
      await unlockItem(sessionId, item.id)
    } else if (!isLocked) {
      const { error } = await lockItem(sessionId, item.id)
      if (error) enqueueSnackbar(error.code === '55P03' ? 'Otra persona lo está comprando' : 'No se pudo reservar el producto', { variant: 'warning' })
    }
  }

  const lockTitle = isLockedByMe ? 'Liberar' : isLocked ? 'Reservado por otro' : 'Reservar para mí'
  const quantity = `${item.quantity} ${item.unit}`

  return (
    <Box
      onClick={selectMode && canInteract ? onToggleSelect : undefined}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.25, pl: 0.5, pr: 0.5, minHeight: compact ? 60 : 72,
        cursor: selectMode && canInteract ? 'pointer' : 'default',
        bgcolor: isLockedByMe ? 'action.selected' : 'transparent',
      }}
    >
      {selectMode ? (
        <Box sx={{ width: 48, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <Checkbox
            className="select-in"
            checked={selected}
            disabled={!canInteract}
            onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
            slotProps={{ input: { 'aria-label': `Seleccionar ${item.product_name}` } }}
          />
        </Box>
      ) : (
        <CheckRing label={`Marcar ${item.product_name} como comprado`} disabled={!canInteract} busy={busy} onClick={() => onQuickAdd(item)} />
      )}

      <ButtonBase
        component="div"
        role={selectMode ? undefined : 'button'}
        tabIndex={canOpen ? 0 : -1}
        aria-label={selectMode ? undefined : `Comprar ${item.product_name}: editar cantidad y precio`}
        disabled={!canOpen}
        onClick={canOpen ? () => onOpen(item) : undefined}
        onKeyDown={canOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item) } } : undefined}
        sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, py: compact ? 0.75 : 1.25, pl: 0.25, borderRadius: '10px', textAlign: 'left' }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, color: canInteract ? 'text.primary' : 'text.secondary' }} noWrap>{item.product_name}</Typography>
          <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>{quantity}</Typography>
          {!compact && item.notes && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary', lineHeight: 1.35 }} noWrap>{item.notes}</Typography>}

          {/* Reserva: icono + texto + tono (nunca solo color) */}
          {isLocked && !isLockedByMe && lock && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: st.riesgo.text, mt: 0.25, minWidth: 0 }}>
              <Avatar src={lock.profiles?.avatar_url} sx={{ width: 18, height: 18, fontSize: 11 }}>{lock.profiles?.full_name?.[0]}</Avatar>
              <Typography sx={{ fontSize: FS.meta, fontWeight: 600, color: 'inherit', lineHeight: 1.35 }}>{lock.profiles?.full_name} lo está comprando</Typography>
            </Box>
          )}
          {isLockedByMe && (
            <Typography sx={{ fontSize: FS.meta, fontWeight: 600, color: 'primary.main', lineHeight: 1.35 }} noWrap>Lo estás comprando tú</Typography>
          )}
        </Box>
        {item.estimated_price ? (
          <Typography sx={{ ...NUM, fontSize: FS.body, fontWeight: 600, flexShrink: 0, color: 'text.secondary' }}>~{fmtMoney(item.estimated_price)}</Typography>
        ) : null}
      </ButtonBase>

      {!selectMode && (
        <Tooltip title={lockTitle}>
          <span>
            <IconButton
              aria-label={`${lockTitle}: ${item.product_name}`}
              onClick={handleLock}
              disabled={isLocked && !isLockedByMe}
              sx={{ flexShrink: 0, color: isLockedByMe ? 'primary.main' : 'text.secondary' }}
            >
              {isLocked ? <Lock sx={{ fontSize: 20 }} /> : <LockOpen sx={{ fontSize: 20 }} />}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  )
}

// ── Selector de cantidad − n + ───────────────────────────────────────────────
function QtyStepper({ item, onStep }) {
  const canDecrease = roundQty(Number(item.quantity) - stepFor(item.unit)) > 0
  return (
    <Box role="group" aria-label={`Cantidad de ${item.product_name}`} sx={{ display: 'inline-flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: '10px' }}>
      <IconButton aria-label={`Disminuir cantidad de ${item.product_name}`} disabled={!canDecrease} onClick={() => onStep(item, -1)} sx={{ width: 44, height: 44 }}>
        <Remove fontSize="small" />
      </IconButton>
      <Typography aria-live="polite" sx={{ ...NUM, minWidth: 36, textAlign: 'center', fontSize: FS.body, fontWeight: 700 }}>
        {Number(item.quantity)}
      </Typography>
      <IconButton aria-label={`Aumentar cantidad de ${item.product_name}`} onClick={() => onStep(item, 1)} sx={{ width: 44, height: 44 }}>
        <Add fontSize="small" />
      </IconButton>
    </Box>
  )
}

// ── Producto en el carrito ───────────────────────────────────────────────────
export function CartItemRow({ item, onRemove, onEdit, onStep, selectMode, selected, onToggleSelect, compact }) {
  return (
    <Box
      sx={{ px: 1.5, py: compact ? 1 : 1.5, display: 'flex', alignItems: 'flex-start', gap: 1, cursor: selectMode ? 'pointer' : 'default' }}
      onClick={selectMode ? onToggleSelect : undefined}
    >
      {selectMode ? (
        <Checkbox
          className="select-in"
          checked={selected}
          sx={{ ml: -0.5, mt: -0.5 }}
          onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          slotProps={{ input: { 'aria-label': `Seleccionar ${item.product_name}` } }}
        />
      ) : (
        <Box aria-hidden sx={{ width: 24, height: 24, mt: 0.125, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckRounded sx={{ fontSize: 17 }} />
        </Box>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35, minWidth: 0 }} noWrap>
            {item.product_name}
            {item.brand && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}> · {item.brand}</Box>}
          </Typography>
          {item.total_price != null && (
            <Typography sx={{ ...NUM, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{fmtMoney(item.total_price)}</Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', columnGap: 0.75, alignItems: 'center', minWidth: 0 }}>
          <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary', flexShrink: 0 }}>{selectMode ? `${Number(item.quantity)} ${item.unit}` : item.unit}</Typography>
          {item.profiles && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>· {item.profiles.full_name}</Typography>}
          {item.is_household === false && <StatusPill sx={{ ml: 0.5 }}>No hogar</StatusPill>}
        </Box>

        {!selectMode && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.5 }}>
            <QtyStepper item={item} onStep={onStep} />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Editar">
                <IconButton aria-label={`Editar ${item.product_name}`} onClick={() => onEdit(item)} sx={{ color: 'text.secondary' }}><Edit fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title="Eliminar">
                <IconButton aria-label={`Eliminar ${item.product_name}`} onClick={() => onRemove(item)} sx={{ color: 'text.secondary' }}><Delete fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ── Producto del inventario encontrado en la búsqueda (agregar con un toque) ─
export function InventorySuggestionRow({ product, compact, onAdd }) {
  const meta = [`${product.current_quantity} ${product.unit} en stock`, product.categories?.name].filter(Boolean).join(' · ')
  return (
    <Box sx={{ px: 1.5, py: compact ? 0.5 : 1, minHeight: compact ? 56 : 64, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35 }} noWrap>{product.name}</Typography>
        <Typography sx={{ ...NUM, fontSize: FS.meta, color: 'text.secondary' }} noWrap>{meta}</Typography>
      </Box>
      <Tooltip title="Agregar al carrito">
        <IconButton
          aria-label={`Agregar ${product.name} al carrito`}
          onClick={() => onAdd(product)}
          sx={{ flexShrink: 0, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark', color: '#FFFFFF' } }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
