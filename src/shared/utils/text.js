// Compara textos sin tildes, mayúsculas ni espacios de más
export const normalizeText = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
