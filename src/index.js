import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';
import api, { route } from '@forge/api';

const resolver = new Resolver();

/**
 * Derives a stable storage key for this particular field context.
 * The field ID comes from the extension context so each field instance
 * gets its own isolated configuration in the KV store.
 */
const getFieldId = (context) => {
  return context?.extension?.field?.id
    || context?.extension?.fieldId
    || context?.extension?.contextId
    || 'global';
};

/**
 * getConfig – Returns the saved configuration for this field instance.
 * The stored object looks like: { projectKey: "SD", options: [ ... ] }
 * If nothing is stored yet, returns sensible defaults so the frontend can
 * detect a "first-time setup" scenario by checking if projectKey is empty.
 */
resolver.define('getConfig', async ({ context }) => {
  const fieldId = getFieldId(context);
  console.log('[getConfig] fieldId:', fieldId, '| context.extension:', JSON.stringify(context?.extension));
  return await kvs.get(`config-field-${fieldId}`) || { projectKey: '', options: [] };
});

/**
 * saveConfig – Persists the full configuration object for this field instance.
 * The payload from the frontend must include both `projectKey` and `options`.
 * Example payload: { projectKey: "SD", options: [...] }
 */
resolver.define('saveConfig', async ({ payload, context }) => {
  const fieldId = getFieldId(context);
  console.log('[saveConfig] fieldId:', fieldId, '| projectKey:', payload?.projectKey);
  await kvs.set(`config-field-${fieldId}`, payload);
});

/**
 * getContext – Devuelve el contexto completo de la extensión tal como lo ve el backend.
 *
 * Cuando el campo se abre desde el portal de JSM, el contexto de extensión incluye
 * información del tipo de solicitud activo (requestTypeId). En el frontend del editor
 * (edit/src/App.js) usamos este dato para filtrar las opciones de Nivel 1: sólo se
 * muestran las que tienen el mismo requestTypeId que el del formulario actual.
 *
 * Ejemplo de campos útiles del contexto de portal:
 *   context.extension.requestTypeId  → id del tipo de solicitud activo
 *   context.extension.renderContext  → "portal-create", "issue-view", etc.
 */
resolver.define('getContext', async ({ context }) => {
  const fieldId = getFieldId(context);
  console.log('[getContext] fieldId:', fieldId, '| extension:', JSON.stringify(context?.extension));
  // Devolvemos el objeto extension completo para que el frontend pueda
  // inspeccionar cualquier campo que necesite (renderContext, requestTypeId, etc.)
  return context?.extension || {};
});


/**
 * getRequestTypes – Fetches all request types for a given JSM project.
 *
 * The JSM REST API accepts the project key directly as a service desk
 * identifier, so we can call the endpoint in a single request without
 * needing to first resolve the numeric service desk ID.
 *
 * Reference: https://developer.atlassian.com/cloud/jira/service-desk/rest/intro/#project-identifiers
 *
 * Returns an array of { id, name, description } objects, or an empty array
 * if the project key is not found or the app has no access.
 */
resolver.define('getRequestTypes', async ({ payload }) => {
  const { projectKey } = payload;

  if (!projectKey || !projectKey.trim()) {
    console.warn('[getRequestTypes] No projectKey provided');
    return [];
  }

  try {
    // The JSM API allows using the project key directly as the service desk ID
    // in the URL path, so no lookup step is required.
    const response = await api
      .asApp()
      .requestJira(route`/rest/servicedeskapi/servicedesk/${projectKey.trim()}/requesttype`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getRequestTypes] Failed to fetch request types:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    const requestTypes = data?.values || [];

    console.log('[getRequestTypes] Fetched', requestTypes.length, 'request types for project:', projectKey);

    // Return a clean, minimal list for the frontend Select component.
    return requestTypes.map((rt) => ({
      id: rt.id,
      name: rt.name,
      description: rt.description || '',
    }));

  } catch (err) {
    console.error('[getRequestTypes] Unexpected error:', err);
    return [];
  }
});

export const resolvers = resolver.getDefinitions();
