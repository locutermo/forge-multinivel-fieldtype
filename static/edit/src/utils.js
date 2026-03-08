/**
 * Utilidades y constantes compartidas para el campo multinivel.
 */

/** Colores y estilos reutilizables */
export const COLORS = {
  error: '#de350b',
  label: '#5e6c84',
  primary: '#0052CC',
  skeleton: '#f4f5f7',
  skeletonAlt: '#ebecf0',
};

/** Estilo base para las etiquetas de los selects */
export const LABEL_STYLE = {
  display: 'block',
  marginBottom: 4,
  marginLeft: 0,
  paddingLeft: 0,
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.label,
  letterSpacing: '0.01em',
};

/** Estilos para el componente Select de Atlaskit */
export const SELECT_STYLES = {
  container: (base) => ({ ...base, width: 'auto' }),
  // Necesario para que el dropdown flote SOBRE el contenido cuando usa menuPortalTarget
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  // Necesario para que el dropdown flote SOBRE el contenido en position=absolute
  menu: (base) => ({ ...base, zIndex: 9999, position: 'absolute' }),
  menuList: (base) => ({ ...base, maxHeight: 200 }),
};

/**
 * Convierte una opción de configuración en el formato { label, value } del Select.
 * @param {{ label: string, id?: string }} opt - Opción de la config
 * @returns {{ label: string, value: string }}
 */
export function toSelectOption(opt) {
  return { label: opt.label, value: opt.id || opt.label };
}

/**
 * Filtra opciones deshabilitadas y las convierte al formato del Select.
 * @param {Array} options - Lista de opciones (puede ser null/undefined)
 * @returns {Array<{ label: string, value: string }>}
 */
export function formatOptions(options) {
  return (options || []).filter((opt) => !opt.disabled).map(toSelectOption);
}

/**
 * Obtiene el estado inicial (selecciones y listas de niveles) a partir de la
 * configuración y del valor guardado en el contexto.
 *
 * El campo ahora es de tipo `string`. El valor guardado es un string plano con
 * el formato "Nivel1 - Nivel2 - Nivel3". Por retrocompatibilidad también
 * aceptamos el formato antiguo de objeto { level1, level2, level3 }.
 *
 * @param {{ options: Array }} config - Configuración del campo
 * @param {string | { level1?: string, level2?: string, level3?: string } | null} existingVal - Valor actual del campo
 * @returns {{ selectedL1, selectedL2, selectedL3, level2List, level3List } | null} Estado a restaurar o null
 */
export function getInitialSelectionState(config, existingVal) {
  if (!existingVal) return null;

  // --- Normalización del valor ---
  // Si el valor es un string (nuevo formato), lo partimos por " - ".
  // Si es un objeto (formato legado), usamos sus propiedades directamente.
  let level1, level2, level3;
  if (typeof existingVal === 'string') {
    const parts = existingVal.split(' - ');
    level1 = parts[0] || '';
    level2 = parts[1] || '';
    level3 = parts[2] || '';
  } else {
    level1 = existingVal.level1 || '';
    level2 = existingVal.level2 || '';
    level3 = existingVal.level3 || '';
  }

  if (!level1) return null;

  const options = config?.options || [];
  const l1Obj = options.find((o) => o.label === level1);
  if (!l1Obj || l1Obj.disabled) return null;

  const l1Option = toSelectOption(l1Obj);
  const l2Children = (l1Obj.children || []).filter((c) => !c.disabled);

  if (l2Children.length === 0) {
    return { selectedL1: l1Option, selectedL2: null, selectedL3: null, level2List: [], level3List: [] };
  }

  const l2Obj = (l1Obj.children || []).find((o) => o.label === level2);
  if (!l2Obj || l2Obj.disabled) {
    return { selectedL1: l1Option, selectedL2: null, selectedL3: null, level2List: l2Children, level3List: [] };
  }

  const l2Option = toSelectOption(l2Obj);
  const l3Children = (l2Obj.children || []).filter((c) => !c.disabled);

  if (l3Children.length === 0) {
    return {
      selectedL1: l1Option,
      selectedL2: l2Option,
      selectedL3: null,
      level2List: l2Children,
      level3List: [],
    };
  }

  const l3Obj = (l2Obj.children || []).find((o) => o.label === level3);
  const l3Option = l3Obj && !l3Obj.disabled ? toSelectOption(l3Obj) : null;

  return {
    selectedL1: l1Option,
    selectedL2: l2Option,
    selectedL3: l3Option,
    level2List: l2Children,
    level3List: l3Children,
  };
}
