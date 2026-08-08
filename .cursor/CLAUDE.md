# CLAUDE.md

## Proyecto

**SuperShopping** — app web para gestionar el inventario del hogar y organizar
compras de forma inteligente. No es solo una lista de compras: ayuda a saber
qué hay en casa, qué falta y cuánto se va a gastar antes de salir a comprar.

Incluye un **Modo Compra** en tiempo real (multi-usuario, con locks de
productos para evitar que dos personas compren lo mismo) y soporte
**colaborativo por workspace** (varios usuarios comparten un mismo hogar).

## Stack

- **React 19** + **Vite 7**
- **MUI v9** (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`) + Emotion
- **Zustand** — estado global
- **Supabase** (`@supabase/supabase-js`) — auth, Postgres, RLS, realtime
- **React Router 7**
- **Axios** — llamadas HTTP adicionales
- **Recharts** — gráficos del dashboard
- **Joi** — validación de formularios/datos
- **notistack** — notificaciones toast
- **date-fns** / **dayjs** — manejo de fechas
- **vite-plugin-pwa** + **workbox-window** — soporte PWA
- Fuente: **Inter** (`@fontsource/inter`)
- **Node 20.x**

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run lint` — eslint
- `npm run preview` — preview del build
- `npm run generate-icons` — genera iconos PWA (pwa-assets-generator)

## Estructura del proyecto

Organizado por features (no por tipo de archivo):

```
src/
├── modules/
│   ├── inventory/       # Gestión de productos del hogar
│   ├── categories/      # Organización de productos
│   ├── shopping/        # Planificación y ejecución de compras (Modo Compra)
│   ├── dashboard/       # Visualización de datos (Recharts)
│   ├── budget/          # Presupuesto previo a la compra
│   └── settings/        # Preferencias del usuario
├── hooks/               # Lógica desacoplada de la UI
└── components/          # Componentes reutilizables
```

## Base de datos (Supabase / Postgres)

Modelo **multi-tenant por `workspace_id`**: casi todas las tablas de negocio
cuelgan de un `workspace` (un hogar/grupo de usuarios). Esquema completo abajo.

### Entidades principales y relaciones

```
workspaces (1) ──< workspace_members >── (N) auth.users
workspaces (1) ──< workspace_invitations
workspaces (1) ──< activity_logs
workspaces (1) ──< profiles                 (perfil = 1 fila por usuario auth)

workspaces (1) ──< categories
workspaces (1) ──< products >── categories (N:1)
products   (1) ──< product_history

workspaces (1) ──< budgets
budgets    (1) ──< budget_items >── products (N:1, opcional)
                 budget_items  >── categories (N:1, opcional)

budgets    (1) ──< shopping_sessions        (una sesión de "Modo Compra" activa)
shopping_sessions (1) ──< shopping_participants (usuarios conectados en vivo)
shopping_sessions (1) ──< product_locks         (lock de item mientras alguien lo compra)
product_locks     >── budget_items (N:1)

budgets    (1) ──< purchases                (compra ya ejecutada/cerrada)
purchases  (1) ──< purchase_items >── products (N:1, opcional)
                  purchase_items  >── budget_items (N:1, opcional)
                  purchase_items  >── categories (N:1, opcional)

workspace_stats  → VIEW agregada (member_count, product_count, budget_count,
                    purchase_count, total_spent) por workspace
```

### Flujo de negocio

1. Un `workspace` agrupa usuarios (`workspace_members`) que comparten inventario.
2. `products` vive en el inventario del hogar, con `current_quantity` /
   `min_quantity` (para alertas de stock bajo — ver roadmap).
3. Se arma un `budget` con `budget_items` (productos a comprar + precio estimado).
4. Al salir a comprar se abre una `shopping_session` ligada al `budget`:
   - `shopping_participants` = quién está conectado en esa sesión.
   - `product_locks` = evita que dos personas compren el mismo `budget_item`
     a la vez (colaboración en tiempo real, probablemente vía Supabase Realtime).
5. Al cerrar la sesión, se genera un `purchase` con sus `purchase_items`
   (precio real pagado, quién lo compró, si es de uso compartido `is_household`).
6. `product_history` y `activity_logs` llevan auditoría de cambios.

### DDL completo (schema `public`)

```sql
CREATE TABLE activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE budget_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL,
  product_id uuid,
  product_name text NOT NULL,
  quantity numeric DEFAULT 1,
  estimated_price numeric,
  unit text DEFAULT 'unidad'::text,
  category_id uuid,
  notes text,
  is_checked boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  store text,
  date date,
  target_amount numeric,
  status text DEFAULT 'draft'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#2196F3'::text,
  icon text DEFAULT 'Category'::text,
  aisle text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE product_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  changes jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE product_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  budget_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  locked_at timestamp with time zone DEFAULT now()
);

CREATE TABLE products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  category_id uuid,
  name text NOT NULL,
  description text,
  unit text DEFAULT 'unidad'::text,
  current_quantity numeric DEFAULT 0,
  min_quantity numeric DEFAULT 0,
  barcode text,
  image_url text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE purchase_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  budget_item_id uuid,
  product_id uuid,
  product_name text NOT NULL,
  brand text,
  quantity numeric DEFAULT 1,
  unit_price numeric,
  total_price numeric,
  unit text DEFAULT 'unidad'::text,
  category_id uuid,
  purchased_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  session_id uuid,
  is_household boolean NOT NULL DEFAULT true
);

CREATE TABLE purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  budget_id uuid,
  session_id uuid,
  name text NOT NULL,
  store text,
  date date DEFAULT CURRENT_DATE,
  total_amount numeric DEFAULT 0,
  executed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE shopping_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now()
);

CREATE TABLE shopping_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  status text DEFAULT 'active'::text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_by uuid
);

CREATE TABLE workspace_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor'::text,
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'::text),
  status text NOT NULL DEFAULT 'pending'::text,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  joined_at timestamp with time zone DEFAULT now()
);

-- VIEW agregada, no es tabla base
CREATE TABLE workspace_stats (
  workspace_id uuid,
  workspace_name text,
  member_count bigint,
  product_count bigint,
  budget_count bigint,
  purchase_count bigint,
  total_spent numeric
);

CREATE TABLE workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

> Nota: este export no incluye FKs, índices ni RLS policies explícitas
> (se generó desde `information_schema.columns`). Las relaciones de arriba
> están inferidas por convención de nombres (`*_id`). Si se necesita el
> detalle exacto de constraints/policies, regenerar con
> `npx supabase db dump --schema public -f estructura_completa.sql`.

## Convenciones

- [Completar: naming de componentes, dónde van los hooks de Supabase,
  patrón de manejo de errores, convenciones de estado con Zustand, etc.]

## No tocar

- [Completar: archivos o carpetas sensibles que Claude no debe modificar]

## Diseño / UI

Este proyecto usa el skill **Impeccable** (`pbakaus/impeccable`) para mejoras
visuales guiadas. Comandos disponibles dentro de Claude Code:

- `/impeccable audit [zona]` — encuentra problemas visuales
- `/impeccable polish [zona]` — pulido final
- `/impeccable critique` — revisión de diseño completa
- `/impeccable distill` — elimina complejidad visual innecesaria

Preferir pedidos acotados por módulo (ej. `/impeccable polish el dashboard`)
en vez de rediseños globales de una sola vez.