import { TextField, InputAdornment, IconButton } from '@mui/material'
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material'

// Campo de contraseña: etiqueta visible, error en línea y (opcional) botón para mostrar u ocultar
export default function PasswordField({
  label, name, value, onChange, onBlur, error, show, onToggle, autoComplete, inputRef, autoFocus,
}) {
  return (
    <TextField
      fullWidth required
      label={label} name={name} value={value}
      type={show ? 'text' : 'password'}
      onChange={onChange} onBlur={onBlur}
      error={Boolean(error)} helperText={error || ' '}
      inputRef={inputRef} autoFocus={autoFocus}
      slotProps={{
        htmlInput: { autoComplete },
        input: {
          startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
          endAdornment: onToggle && (
            <InputAdornment position="end">
              <IconButton onClick={onToggle} edge="end" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show}>
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
