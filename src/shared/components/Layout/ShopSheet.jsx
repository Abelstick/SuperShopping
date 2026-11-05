import { useEffect, useMemo, useState } from 'react'
import { Box, Button, ButtonBase, Dialog, DialogTitle, Skeleton, Typography } from '@mui/material'
import { ChevronRight, ReceiptLongRounded, ShoppingCartRounded } from '@mui/icons-material'
import { FS } from '@/theme/tokens'
import { fmtDate, fmtMoney } from '@/shared/utils/format'
import { useBudgetStore } from '@/features/budgets/store/budgetStore'
import { BudgetMeter, StatusPill } from '@/shared/components/ui'
import { usePurchaseStore } from '@/features/purchases/store/purchaseStore'

// Elegir qué comprar: lista los presupuestos activos e indica cuál tiene una compra en curso.
// La ruta /shopping/new retoma la sesión activa del presupuesto si existe, así que no hay riesgo de duplicarla.
export default function ShopSheet({ open, onClose, workspace, activeSessions, onNavigate }) {
  const { budgets, fetchBudgets } = useBudgetStore()
  const { purchases, fetchPurchases } = usePurchaseStore()
  const [loading, setLoading] = useState(false)
  const workspaceId = workspace?.id

  useEffect(() => {
    if (!open || !workspaceId) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marca el inicio de la carga al abrir la hoja
    setLoading(true)
    Promise.all([fetchBudgets(workspaceId), fetchPurchases(workspaceId)])
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, workspaceId, fetchBudgets, fetchPurchases])

  const isEditor = ['owner', 'editor'].includes(workspace?.my_role)
  const active = useMemo(() => budgets.filter((b) => b.status === 'active'), [budgets])
  const inProgress = useMemo(() => new Set(activeSessions.map((s) => s.budget_id)), [activeSessions])
  const spentById = useMemo(() => {
    const map = {}
    purchases.forEach((p) => { if (p.budget_id) map[p.budget_id] = (map[p.budget_id] || 0) + (p.total_amount || 0) })
    return map
  }, [purchases])

  const go = (path) => { onClose(); onNavigate(path) }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>¿Qué vas a comprar?</DialogTitle>
      <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
        {loading && active.length === 0 ? (
          [1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={84} sx={{ borderRadius: '12px' }} />)
        ) : active.length === 0 ? (
          <Box sx={{ py: 3, px: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5 }}>
            <ReceiptLongRounded sx={{ fontSize: 32, color: 'text.secondary' }} />
            <Box>
              <Typography sx={{ fontSize: FS.body, fontWeight: 700 }}>Sin presupuestos activos</Typography>
              <Typography sx={{ fontSize: FS.body, color: 'text.secondary' }}>Crea o activa un presupuesto para empezar a comprar.</Typography>
            </Box>
            <Button variant="contained" onClick={() => go('/budgets')}>Ver presupuestos</Button>
          </Box>
        ) : (
          <>
            {!isEditor && (
              <Typography sx={{ fontSize: FS.body, color: 'text.secondary', px: 0.5 }}>
                Tu rol en este hogar es de solo lectura: puedes ver los presupuestos, pero no iniciar una compra.
              </Typography>
            )}
            {active.map((b) => {
              const meta = [b.store, b.date ? fmtDate(b.date) : null].filter(Boolean).join(' · ')
              const resume = inProgress.has(b.id)
              return (
                <ButtonBase
                  key={b.id}
                  onClick={() => go(isEditor ? `/shopping/new?budgetId=${b.id}` : `/budgets/${b.id}`)}
                  sx={{ display: 'block', width: '100%', textAlign: 'left', p: 1.5, borderRadius: '12px', border: 1, borderColor: resume ? 'primary.main' : 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }} noWrap>{b.name}</Typography>
                      {meta && <Typography sx={{ fontSize: FS.meta, color: 'text.secondary' }} noWrap>{meta}</Typography>}
                    </Box>
                    {resume && <StatusPill tone="brand" icon={ShoppingCartRounded}>En curso</StatusPill>}
                    <ChevronRight sx={{ color: 'text.secondary', flexShrink: 0 }} />
                  </Box>
                  {b.target_amount > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <BudgetMeter spent={spentById[b.id] || 0} limit={b.target_amount} spentLabel={`Límite ${fmtMoney(b.target_amount)}`} />
                    </Box>
                  )}
                </ButtonBase>
              )
            })}
          </>
        )}
      </Box>
    </Dialog>
  )
}
