# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas que llevan una casa y quieren tener control de lo que hay en casa y de lo que van a comprar. Los usan solos o en grupo: un mismo hogar (workspace) lo comparten varios miembros. Dos escenas reales: en casa revisando qué falta y cuánto gastar antes de salir, y en el súper con el móvil en la mano (Modo Compra).

(Inferido del README y del pedido de rediseño; sin entrevista de producto separada.)

## Product Purpose

Gestionar el inventario del hogar y organizar las compras: saber qué hay en casa, qué falta y cuánto se va a gastar antes de salir a comprar. No es solo una lista de compras. Éxito: el usuario decide qué comprar y cuánto gastar sin sorpresas en caja.

## Positioning

Une inventario doméstico, presupuesto previo a la compra y compra en tiempo real multiusuario (con bloqueo de productos para que dos personas no compren lo mismo) en un solo lugar compartido por hogar.

## Operating Context

Dominio financiero / inventario / compras. Moneda en soles (S/). Interfaz en español. Uso desde escritorio y móvil (PWA). Modo claro y oscuro ya existen y se conservan.

## Capabilities and Constraints

- Stack: React 19, Vite, MUI v9, Zustand, Supabase, Recharts, notistack. Se mantiene MUI como base.
- Módulos: Dashboard, Inventario, Presupuestos, Compras, Modo Compra, Análisis, Hogares (workspaces), Perfil.
- Estados de stock existentes: agotado (cantidad <= mínimo), en riesgo (cantidad hasta 2x el mínimo), saludable.
- Restricción del rediseño: fidelidad funcional total. No se eliminan campos, botones, filtros, columnas ni validaciones; no se inventa lógica de negocio, cálculos ni estados; los textos de negocio se mantienen literales salvo aprobación explícita.
- Sin estado de error expuesto por los stores hoy: las acciones de carga devuelven `{ error }` pero no lo guardan.

## Product Principles

1. Lo que falta en casa es lo primero que se ve.
2. El dinero se lee con precisión: cifras tabulares, moneda siempre visible.
3. El color nunca es el único portador de estado.
4. Igual arquitectura de información en escritorio y móvil.

## Accessibility & Inclusion

Contraste mínimo 4.5:1 en texto normal, foco visible y todo operable por teclado, áreas táctiles de 44x44px en móvil, respeto de prefers-reduced-motion.
