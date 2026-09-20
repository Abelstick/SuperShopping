// Validación al salir del campo (on blur) y de nuevo al enviar. Vacío = sin error.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateEmail = (v) => (EMAIL_RE.test(String(v).trim()) ? '' : 'Ingresa un email válido.')
export const validateRequiredPassword = (v) => (v ? '' : 'Ingresa tu contraseña.')
export const validateNewPassword = (v) => {
  if (!v) return 'Ingresa tu contraseña.'
  return v.length < 6 ? 'La contraseña debe tener al menos 6 caracteres.' : ''
}
export const validateConfirm = (password, confirm) => {
  if (!confirm) return 'Confirma tu contraseña.'
  return password !== confirm ? 'Las contraseñas no coinciden.' : ''
}
export const validateFullName = (v) => (String(v).trim() ? '' : 'Ingresa el nombre completo.')
