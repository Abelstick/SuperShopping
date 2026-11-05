// Estado de un gasto frente a su límite. Es el único lugar que define los umbrales:
// desde 80 % avisa ("cerca del límite") y por encima de 100 % está excedido.
export const NEAR_LIMIT_RATIO = 0.8

export function budgetStatus(spent, limit) {
  const hasLimit = Number(limit) > 0
  const ratio = hasLimit ? Number(spent || 0) / Number(limit) : 0
  const over = hasLimit && ratio > 1
  const near = hasLimit && !over && ratio >= NEAR_LIMIT_RATIO
  return {
    hasLimit,
    ratio,
    over,
    near,
    pct: Math.round(ratio * 100),
    remaining: hasLimit ? Number(limit) - Number(spent || 0) : 0,
  }
}
