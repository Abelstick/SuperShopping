// Aplica el modo de color al documento. Es el único escritor de `data-theme`: el tema de MUI
// (colorSchemeSelector: 'data-theme') solo define las variables CSS de cada esquema.
// Nada de React interviene al alternar: el cambio es un atributo + un recálculo de estilos.
const ATTRIBUTE = 'data-theme'
const NO_TRANSITIONS = '*,*::before,*::after{transition:none!important}'

function applyThemeMode(mode) {
  const root = document.documentElement
  if (root.getAttribute(ATTRIBUTE) === mode) return

  // Sin transiciones durante el cambio: evita animar cientos de elementos a la vez y los
  // estados intermedios mezclados. Se retira tras forzar el recálculo con el nuevo esquema.
  const guard = document.createElement('style')
  guard.textContent = NO_TRANSITIONS
  document.head.appendChild(guard)
  root.setAttribute(ATTRIBUTE, mode)
  window.getComputedStyle(root).getPropertyValue('color')
  setTimeout(() => guard.remove(), 1)
}

// Sincroniza el documento con `themeMode` del store, al arrancar y en cada cambio.
export function bindThemeModeToDocument(store) {
  applyThemeMode(store.getState().themeMode)
  return store.subscribe((state, prev) => {
    if (state.themeMode !== prev.themeMode) applyThemeMode(state.themeMode)
  })
}
