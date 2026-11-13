export const ROLE_LABELS = { owner: 'Propietario', admin: 'Administrador', editor: 'Editor', viewer: 'Lector' }

// Roles que se pueden asignar o invitar (el propietario es uno solo y se transfiere)
export const ASSIGNABLE_ROLES = ['admin', 'editor', 'viewer']

// Propietario, administrador o editor: gestionan inventario, presupuestos y compras
export const canEditRole = (role) => ['owner', 'admin', 'editor'].includes(role)

// Propietario o administrador: miembros, invitaciones, datos del hogar y eliminar contenido
export const canManageRole = (role) => ['owner', 'admin'].includes(role)

// Validación de email al salir del campo (formato básico)
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
