// Formato de cifras y fechas compartido: S/ 1,234.56 · - S/ 350.00 · dd/mm/aaaa

export const fmtMoney = (n) => {
  const v = Number(n) || 0
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return v < 0 ? `- S/ ${s}` : `S/ ${s}`
}

// Una fecha "solo día" (AAAA-MM-DD) se interpreta en hora local: así no se corre un día en husos negativos
export const fmtDate = (d) => {
  if (!d) return ''
  const value = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// AAAA-MM → MM/AAAA (otros valores, como "Sin fecha", se dejan tal cual)
export const fmtMonth = (m) => (/^\d{4}-\d{2}$/.test(m) ? `${m.slice(5)}/${m.slice(0, 4)}` : m)

// Fecha "solo día" (AAAA-MM-DD) → Date en hora local, para agrupar sin corrimientos
export const parseDay = (d) => new Date(typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d)
