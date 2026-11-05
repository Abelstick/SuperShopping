// Paso del +/- según la unidad: 1 para conteos, medio para kg/L, 100 para g/ml
const STEPS = { kg: 0.5, L: 0.5, g: 100, ml: 100 }

export const stepFor = (unit) => STEPS[unit] ?? 1
export const roundQty = (n) => Math.round(n * 100) / 100
