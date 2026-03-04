import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

// Helper: extracts field ID safely from any context (edit, contextConfig, etc.)
const getFieldId = (context) => {
    // In contextConfig context the structure is extension.field.id
    // In some contexts it may come as extension.fieldId or extension.contextId
    return context?.extension?.field?.id
        || context?.extension?.fieldId
        || context?.extension?.contextId
        || 'global';
};

// === RESOLVERS (BACKEND) ===
resolver.define('getConfig', async ({ context }) => {
    const fieldId = getFieldId(context);
    console.log('[getConfig] fieldId:', fieldId, '| context.extension:', JSON.stringify(context?.extension));
    return await storage.get(`config-field-${fieldId}`) || { options: [] };
});

resolver.define('saveConfig', async ({ payload, context }) => {
    const fieldId = getFieldId(context);
    console.log('[saveConfig] fieldId:', fieldId);
    await storage.set(`config-field-${fieldId}`, payload);
});

export const resolvers = resolver.getDefinitions();
