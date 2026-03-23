import api, { route } from '@forge/api';

const FIELD_ID = 'customfield_12002';

export const validate = async (event) => {
  const { issue, modifiedFields } = event;
  let fieldData = null;

  try {

    if (issue && (issue.id || issue.key)) {

      const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issue.id || issue.key}?fields=${FIELD_ID}`);
      if (response.ok) {
        const data = await response.json();
        fieldData = data.fields[FIELD_ID];
      }
    } else {

      fieldData = modifiedFields?.[FIELD_ID];
    }

    if (!fieldData) {
      return {
        result: false,
        errorMessage: 'El campo "Segmento/País" es obligatorio.',
      };
    }

    const hasParent = fieldData.value != null && fieldData.value !== '';
    const hasChild = fieldData.child?.value != null && fieldData.child?.value !== '';


    if (!hasParent) {
      return {
        result: false,
        errorMessage: 'Debes completar el campo "Segmento/País" (selecciona una opción).',
      };
    }

    if (hasParent && !hasChild) {
      return {
        result: false,
        errorMessage: 'Debes seleccionar también la segunda opción en el campo "Segmento/País".',
      };
    }
    return { result: true };

  } catch (error) {
    console.error(`[Validator] Error inesperado:`, error);

    return { result: true };
  }
};