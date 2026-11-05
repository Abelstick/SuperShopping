// Escala tipográfica compartida (px). `hero` son cifras de dinero; `page` el título de cada pantalla;
// `title` las secciones; `body` el texto y `meta` la información secundaria.
export const FS = { hero: 44, heroXs: 34, page: 28, pageXs: 24, dialog: 20, title: 18, body: 15, meta: 13 }

// Cifras con ancho fijo para que los importes se alineen en columna
export const NUM = { fontVariantNumeric: 'tabular-nums' }

// Cada bloque entra una sola vez, escalonado (ver .reveal en index.css)
export const reveal = (i) => ({ className: 'reveal', style: { '--i': i } })

// Alturas de la navegación persistente, compartidas por layout y barras fijas
export const CHROME = { bottomNav: 64, topBar: 56, sidebar: 264, rail: 88 }
