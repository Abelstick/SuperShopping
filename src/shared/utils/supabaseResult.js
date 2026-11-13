// Supabase no devuelve error cuando RLS impide un UPDATE o DELETE: simplemente afecta 0 filas.
// Usar con `.select('id')` al final de la consulta para enterarse.
export const NO_ROWS_MESSAGE = 'No tienes permiso para esta acción o el registro ya no existe.'

export function ensureAffected({ data, error }) {
  if (error) return { data, error }
  if (!data || data.length === 0) return { data, error: new Error(NO_ROWS_MESSAGE) }
  return { data, error: null }
}
