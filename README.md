# SuperShopping

SuperShopping es una aplicación web para gestionar el inventario del hogar y organizar las compras de forma más inteligente. La idea es tener control de lo que hay en casa, lo que falta y cuánto se va a gastar antes de salir a comprar.

---

## Demo

(En proceso)

---

## ¿Qué hace?

* Registrar productos del hogar
* Organizar todo por categorías
* Llevar control del inventario disponible
* Crear presupuestos antes de comprar
* Activar un modo compra para seguimiento en tiempo real
* Ver compras actuales mientras se está en el supermercado
* Visualizar información en un dashboard
* Modo oscuro
* Uso colaborativo con otros usuarios

No busca ser solo una lista de compras, sino una herramienta práctica para tomar mejores decisiones al momento de gastar.

---

## Modo compra

Incluye un modo pensado para usarse directamente mientras compras:

* Ver qué productos necesitas
* Registrar lo que ya vas comprando
* Mantenerte dentro del presupuesto definido
* Tener claridad en tiempo real de cuánto llevas gastado

La idea es evitar compras impulsivas y no salir con la sorpresa en caja.

---

## Tecnologías

* React + Vite  
* Material UI v9.0 (MUI)  
* Zustand (estado)  
* Supabase (base de datos y autenticación)  
* Axios  
* Recharts (gráficos)  
* Joi (validaciones)  

---

## Estructura

El proyecto está organizado por features para mantener el código limpio y escalable:

* módulos por dominio (inventario, compras, dashboard, etc.)
* hooks separados
* lógica desacoplada de la UI
* uso de estado global con Zustand

---

## Módulos principales

* Inventario: gestión de productos del hogar  
* Categorías: organización de productos  
* Compras: planificación y ejecución  
* Dashboard: visualización de datos  
* Presupuesto: control previo a la compra  
* Configuración: preferencias del usuario  

---

## Instalación

```bash
git clone <>
cd supershopping
npm install
npm run dev