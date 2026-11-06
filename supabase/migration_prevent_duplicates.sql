-- Impide duplicados en Modo Compra desde la base de datos.
--
-- Garantiza dos reglas que la app ya respeta, pero que por sí sola no puede asegurar
-- con varios dispositivos o con mala conexión:
--   * Un producto del presupuesto solo puede estar una vez en el carrito de cada compra.
--   * Un presupuesto solo puede tener una compra activa a la vez.
--
-- Ejecutar una vez en el SQL Editor de Supabase, por pasos.

-- ---------------------------------------------------------------------------
-- PASO 1 (solo lectura): revisa qué se va a corregir antes de seguir.
-- ---------------------------------------------------------------------------

-- Productos repetidos en una misma compra, con el estado de esa compra.
-- Si la compra ya está finalizada, su stock se corrige solo, pero el total guardado NO:
-- después de limpiar, revísalo con "Ajustar total" en el detalle de la compra.
SELECT pi.session_id, ss.status, pi.purchase_id, pi.product_name,
       COUNT(*) AS copias, array_agg(pi.total_price ORDER BY pi.created_at) AS importes
  FROM purchase_items pi
  JOIN shopping_sessions ss ON ss.id = pi.session_id
 WHERE pi.budget_item_id IS NOT NULL
 GROUP BY pi.session_id, ss.status, pi.purchase_id, pi.budget_item_id, pi.product_name
HAVING COUNT(*) > 1
 ORDER BY pi.session_id;

-- Presupuestos con más de una compra activa
SELECT budget_id, COUNT(*) AS compras_activas
  FROM shopping_sessions
 WHERE status = 'active'
 GROUP BY budget_id
HAVING COUNT(*) > 1;

-- ---------------------------------------------------------------------------
-- PASO 2: limpia y crea los índices. Es una sola transacción: si algo falla, no cambia nada.
-- ---------------------------------------------------------------------------
BEGIN;

-- Conserva la copia más reciente: es la que tiene el último precio que se ingresó.
-- OJO: elimina filas de forma definitiva. Revisa antes el resultado del paso 1.
DELETE FROM purchase_items
 WHERE id IN (
   SELECT id
     FROM (
       SELECT id,
              ROW_NUMBER() OVER (
                PARTITION BY session_id, budget_item_id
                ORDER BY created_at DESC, id DESC
              ) AS rn
         FROM purchase_items
        WHERE session_id IS NOT NULL AND budget_item_id IS NOT NULL
     ) ranked
    WHERE rn > 1
 );

-- De las compras activas repetidas, sigue activa la que tiene más productos (a igualdad, la más
-- reciente). Las demás pasan a 'cancelled': sus filas no se borran y ya no se podían abrir desde la app.
UPDATE shopping_sessions
   SET status = 'cancelled'
 WHERE id IN (
   SELECT id
     FROM (
       SELECT ss.id,
              ROW_NUMBER() OVER (
                PARTITION BY ss.budget_id
                ORDER BY (SELECT COUNT(*) FROM purchase_items pi WHERE pi.session_id = ss.id) DESC,
                         ss.started_at DESC
              ) AS rn
         FROM shopping_sessions ss
        WHERE ss.status = 'active'
     ) ranked
    WHERE rn > 1
 );

CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_items_session_budget_item
  ON purchase_items (session_id, budget_item_id)
  WHERE session_id IS NOT NULL AND budget_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shopping_sessions_active_budget
  ON shopping_sessions (budget_id)
  WHERE status = 'active';

COMMIT;
