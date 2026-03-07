/**
 * Utilidades y constantes para la configuración del campo multinivel (árbol de opciones por niveles).
 */

/** Colores y estilos reutilizables de la UI de configuración */
export const COLORS = {
  primary: '#0052CC',
  danger: '#EB5757',
  dangerBg: '#DE350B',
  text: '#172B4D',
  textMuted: '#6B778C',
  textSecondary: '#42526E',
  border: '#dfe1e6',
  bgPanel: '#f4f5f7',
  bgSelected: '#E6EFFC',
  disabled: '#97A0AF',
  overlay: 'rgba(9, 30, 66, 0.5)',
};

/** Estilo del input en modales */
export const INPUT_STYLE = {
  padding: '8px 12px',
  width: '100%',
  boxSizing: 'border-box',
  border: '2px solid #dfe1e6',
  borderRadius: 4,
  fontSize: 14,
};

/** Genera un id único para nuevas opciones */
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Busca un ítem en el árbol de opciones por su ruta de ids.
 * @param {Array} options - options de nivel 1 (config.options)
 * @param {string[]} ids - [id1] nivel 1, [id1, id2] nivel 2, [id1, id2, id3] nivel 3
 * @returns {object|null} El ítem encontrado o null
 */
export function findItemInTree(options, ids) {
  if (!options?.length || !ids?.length) return null;
  let current = options.find((o) => o.id === ids[0]);
  for (let i = 1; i < ids.length && current; i++) {
    current = (current.children || []).find((o) => o.id === ids[i]);
  }
  return current || null;
}

/**
 * Obtiene el array padre que contiene el ítem y el índice dentro de ese array.
 * Útil para eliminar o insertar.
 * @param {Array} options - options de nivel 1
 * @param {string[]} ids - ruta completa del ítem
 * @returns {{ parent: Array, index: number }|null}
 */
export function getParentAndIndex(options, ids) {
  if (!options?.length || !ids?.length) return null;
  if (ids.length === 1) {
    const index = options.findIndex((o) => o.id === ids[0]);
    return index === -1 ? null : { parent: options, index };
  }
  if (ids.length === 2) {
    const l1 = options.find((o) => o.id === ids[0]);
    const parent = l1?.children || [];
    const index = parent.findIndex((o) => o.id === ids[1]);
    return index === -1 ? null : { parent, index };
  }
  if (ids.length === 3) {
    const l1 = options.find((o) => o.id === ids[0]);
    const l2 = (l1?.children || []).find((o) => o.id === ids[1]);
    const parent = l2?.children || [];
    const index = parent.findIndex((o) => o.id === ids[2]);
    return index === -1 ? null : { parent, index };
  }
  return null;
}

/**
 * Devuelve el array donde debe añadirse un nuevo ítem según nivel y padres.
 * Nivel 1: options; Nivel 2: children del padre L1; Nivel 3: children del padre L2.
 * @param {Array} options - options de nivel 1
 * @param {number} level - 1, 2 o 3
 * @param {string[]} parentIndices - ids de los padres [idL1] para level 2, [idL1, idL2] para level 3
 * @returns {Array|null} Array donde hacer push del nuevo ítem, o null
 */
export function getParentArrayForAdd(options, level, parentIndices) {
  if (!options) return null;
  if (level === 1) return options;
  if (level === 2 && parentIndices?.length >= 1) {
    const l1 = options.find((o) => o.id === parentIndices[0]);
    if (!l1) return null;
    if (!l1.children) l1.children = [];
    return l1.children;
  }
  if (level === 3 && parentIndices?.length >= 2) {
    const l1 = options.find((o) => o.id === parentIndices[0]);
    const l2 = (l1?.children || []).find((o) => o.id === parentIndices[1]);
    if (!l2) return null;
    if (!l2.children) l2.children = [];
    return l2.children;
  }
  return null;
}

/** Clona en profundidad el árbol de opciones para mutar sin afectar el estado anterior */
export function cloneOptions(options) {
  return JSON.parse(JSON.stringify(options || []));
}
