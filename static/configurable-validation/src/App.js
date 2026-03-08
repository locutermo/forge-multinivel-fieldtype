import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import Column from './Column';
import Modal from './Modal';
import {
  generateId,
  cloneOptions,
  findItemInTree,
  getParentAndIndex,
  getParentArrayForAdd,
  COLORS,
  INPUT_STYLE,
} from './utils';

/** Skeleton de carga mientras se obtiene la configuración */
function Skeleton() {
  return (
    <div className="skeleton-container" style={{ padding: 0 }}>
      <div className="skeleton-title"></div>
      <div className="skeleton-grid">
        <div className="skeleton-col"></div>
        <div className="skeleton-col"></div>
        <div className="skeleton-col"></div>
      </div>
      <style>{`
        .skeleton-title { width: 300px; height: 32px; background: #f4f5f7; margin-bottom: 24px; border-radius: 4px; animation: shimmer 1.5s infinite; }
        .skeleton-grid { display: flex; gap: 16px; }
        .skeleton-col { flex: 1; height: 400px; background: #f4f5f7; border-radius: 8px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        body, #root { margin: 0 !important; padding: 0 !important; }
      `}</style>
    </div>
  );
}

/** Estilo compartido para el select nativo de tipos de solicitud */
const SELECT_STYLE = {
  ...INPUT_STYLE,
  marginTop: 12,
  appearance: 'none',
  background: 'white url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%236B778C\' d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E") no-repeat right 8px center',
  cursor: 'pointer',
};

const EMPTY_ADD = { level: null, parentIndices: [] };
const EMPTY_EDIT = { level: null, ids: [], label: '' };
const EMPTY_DELETE = { level: null, ids: [], label: '' };
const EMPTY_DISABLE = { level: null, ids: [], label: '', currentlyDisabled: false };

function App() {
  // La configuración guardada en KV: { projectKey: string, options: [] }
  const [config, setConfig] = useState({ projectKey: '', options: [] });
  const [loading, setLoading] = useState(true);

  // Estado del formulario de agregar/editar/eliminar opciones
  const [addState, setAddState] = useState(EMPTY_ADD);
  const [editState, setEditState] = useState(EMPTY_EDIT);
  const [deleteConfirm, setDeleteConfirm] = useState(EMPTY_DELETE);
  const [disableConfirm, setDisableConfirm] = useState(EMPTY_DISABLE);
  const [newLabel, setNewLabel] = useState('');

  // Navegación de columnas (qué L1/L2 está seleccionado)
  const [selectedPath, setSelectedPath] = useState([null, null]);

  // ── Estado del proyecto JSM ─────────────────────────────────────────────────

  /** Valor del input de clave del proyecto (puede diferir del guardado mientras se edita) */
  const [projectKeyInput, setProjectKeyInput] = useState('');
  /** Indica si se está guardando la clave del proyecto */
  const [savingProjectKey, setSavingProjectKey] = useState(false);
  /** Lista de tipos de solicitud del proyecto JSM configurado */
  const [requestTypes, setRequestTypes] = useState([]);
  /** Indica si se están cargando los tipos de solicitud */
  const [loadingRequestTypes, setLoadingRequestTypes] = useState(false);
  /** Tipo de solicitud seleccionado en el modal de Nivel 1 */
  const [selectedRequestTypeId, setSelectedRequestTypeId] = useState('');

  // ── Carga inicial ────────────────────────────────────────────────────────────

  useEffect(() => {
    invoke('getConfig')
      .then((data) => {
        const safeData = data || { projectKey: '', options: [] };
        setConfig(safeData);
        setProjectKeyInput(safeData.projectKey || '');
        // Si ya hay una clave guardada, pre-cargamos los tipos de solicitud.
        if (safeData.projectKey) {
          fetchRequestTypes(safeData.projectKey);
        }
      })
      .catch((err) => console.error('Error loading config:', err))
      .finally(() => setLoading(false));
  }, []);

  /**
   * Llama al resolver backend para obtener los tipos de solicitud del proyecto JSM.
   * El resolver usa la clave directamente como identificador en la URL de la API.
   */
  const fetchRequestTypes = async (projectKey) => {
    if (!projectKey) return;
    setLoadingRequestTypes(true);
    try {
      const types = await invoke('getRequestTypes', { projectKey });
      setRequestTypes(types || []);
    } catch (err) {
      console.error('Error fetching request types:', err);
      setRequestTypes([]);
    } finally {
      setLoadingRequestTypes(false);
    }
  };

  // ── Persistencia ─────────────────────────────────────────────────────────────

  /**
   * Guarda la configuración completa en KV (projectKey + opciones del árbol).
   * Actualiza el estado local inmediatamente para que la UI responda sin espera.
   */
  const saveToJira = useCallback(async (nextProjectKey, newOptions) => {
    const newConfig = { projectKey: nextProjectKey, options: newOptions };
    setConfig(newConfig);
    await invoke('saveConfig', newConfig);
  }, []);

  /**
   * Guarda solo la clave del proyecto JSM y recarga los tipos de solicitud.
   * Se llama al pulsar el botón "Guardar" de la sección de configuración.
   */
  const handleSaveProjectKey = async (e) => {
    e.preventDefault();
    const trimmed = projectKeyInput.trim();
    if (!trimmed) return;
    setSavingProjectKey(true);
    try {
      await saveToJira(trimmed, config.options || []);
      await fetchRequestTypes(trimmed);
    } finally {
      setSavingProjectKey(false);
    }
  };

  // ── Acciones sobre opciones ──────────────────────────────────────────────────

  const confirmAdd = useCallback(
    async (e) => {
      e.preventDefault();
      const addedLabel = newLabel.trim();
      if (!addedLabel) return;
      const { level, parentIndices } = addState;
      const newOptions = cloneOptions(config.options);
      const parentArray = getParentArrayForAdd(newOptions, level, parentIndices);
      if (!parentArray) return;

      const newItem =
        level === 3
          ? { id: generateId(), label: addedLabel }
          : { id: generateId(), label: addedLabel, children: [] };

      // Para Nivel 1, guardamos el id y nombre del tipo de solicitud seleccionado.
      if (level === 1 && selectedRequestTypeId) {
        const rt = requestTypes.find((r) => String(r.id) === String(selectedRequestTypeId));
        newItem.requestTypeId = rt?.id || null;
        newItem.requestTypeName = rt?.name || null;
      }

      parentArray.push(newItem);
      setAddState(EMPTY_ADD);
      setNewLabel('');
      setSelectedRequestTypeId('');
      await saveToJira(config.projectKey, newOptions);
    },
    [config.options, config.projectKey, addState, newLabel, selectedRequestTypeId, requestTypes, saveToJira]
  );

  const toggleDisabled = useCallback(async () => {
    const { ids } = disableConfirm;
    const newOptions = cloneOptions(config.options);
    const item = findItemInTree(newOptions, ids);
    if (!item) return;
    item.disabled = !item.disabled;
    setDisableConfirm(EMPTY_DISABLE);
    await saveToJira(config.projectKey, newOptions);
  }, [config.options, config.projectKey, disableConfirm, saveToJira]);

  const confirmEdit = useCallback(
    async (e) => {
      e.preventDefault();
      const updatedLabel = editState.label.trim();
      if (!updatedLabel) return;
      const newOptions = cloneOptions(config.options);
      const item = findItemInTree(newOptions, editState.ids);
      if (!item) return;
      item.label = updatedLabel;
      setEditState(EMPTY_EDIT);
      await saveToJira(config.projectKey, newOptions);
    },
    [config.options, config.projectKey, editState, saveToJira]
  );

  const removeLevel = useCallback(async () => {
    const { ids } = deleteConfirm;
    const newOptions = cloneOptions(config.options);
    const pair = getParentAndIndex(newOptions, ids);
    if (!pair) return;
    const { parent, index } = pair;
    parent.splice(index, 1);
    if (ids.length === 1 && selectedPath[0] === ids[0]) setSelectedPath([null, null]);
    else if (ids.length === 2 && selectedPath[1] === ids[1]) setSelectedPath([selectedPath[0], null]);
    setDeleteConfirm(EMPTY_DELETE);
    await saveToJira(config.projectKey, newOptions);
  }, [config.options, config.projectKey, deleteConfirm, selectedPath, saveToJira]);

  if (loading) return <Skeleton />;

  const options = config.options || [];
  const l1Selected = options.find((o) => o.id === selectedPath[0]);
  const l2Options = l1Selected ? l1Selected.children || [] : [];
  const l2Selected = l2Options.find((o) => o.id === selectedPath[1]);
  const l3Options = l2Selected ? l2Selected.children || [] : [];

  const columnProps = (level, items, parentIds, selectedId, onSelect) => ({
    title: `Nivel ${level}`,
    items,
    level,
    parentIds,
    selectedId,
    onSelect,
    onAdd: () => {
      setAddState({ level, parentIndices: parentIds });
      setNewLabel('');
      setSelectedRequestTypeId('');
    },
    onDisable: (item) =>
      setDisableConfirm({
        level,
        ids: [...parentIds, item.id],
        label: item.label,
        currentlyDisabled: item.disabled,
      }),
    onEdit: (item) =>
      setEditState({ level, ids: [...parentIds, item.id], label: item.label }),
    onDelete: (item) =>
      setDeleteConfirm({ level, ids: [...parentIds, item.id], label: item.label }),
  });

  return (
    <div
      style={{
        padding: 24,
        background: '#FAFBFC',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: COLORS.text, fontSize: 24, fontWeight: 500 }}>
          Configuración de Triple Cascada
        </h2>
        <p style={{ margin: '4px 0 0 0', color: COLORS.textMuted }}>
          Gestiona las opciones de tu campo multinivel
        </p>
      </header>

      {/* ── Sección de configuración del proyecto JSM ───────────────────────────
          Siempre visible para que el administrador pueda cambiar el proyecto.
          Si aún no se ha configurado, muestra un aviso de primera configuración. */}
      <div
        style={{
          background: config.projectKey ? '#EAF2FF' : '#FFFAE6',
          border: `1px solid ${config.projectKey ? '#B3D4FF' : '#FFE380'}`,
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
        }}
      >
        {!config.projectKey && (
          <p style={{ margin: '0 0 12px 0', color: '#172B4D', fontWeight: 500 }}>
            ⚙️ Configuración inicial requerida
          </p>
        )}
        <p style={{ margin: '0 0 10px 0', color: COLORS.textSecondary, fontSize: 13 }}>
          {config.projectKey
            ? <>Proyecto JSM activo: <strong>{config.projectKey}</strong>{' '}
                {!loadingRequestTypes && requestTypes.length > 0 &&
                  <span style={{ color: COLORS.textMuted }}>({requestTypes.length} tipos de solicitud cargados)</span>
                }
              </>
            : 'Ingresa la clave del proyecto JSM para habilitar el selector de tipos de solicitud en Nivel 1.'}
        </p>
        <form onSubmit={handleSaveProjectKey} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Clave del proyecto (ej. SD, HELP, IT)"
            value={projectKeyInput}
            onChange={(e) => setProjectKeyInput(e.target.value.toUpperCase())}
            style={{ ...INPUT_STYLE, width: 260, marginTop: 0 }}
          />
          <button
            type="submit"
            disabled={savingProjectKey || !projectKeyInput.trim()}
            style={{
              padding: '8px 16px',
              background: savingProjectKey || !projectKeyInput.trim() ? COLORS.disabled : COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: savingProjectKey || !projectKeyInput.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {savingProjectKey ? 'Guardando...' : 'Guardar'}
          </button>
          {loadingRequestTypes && (
            <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Cargando tipos...</span>
          )}
          {!loadingRequestTypes && config.projectKey && requestTypes.length === 0 && (
            <span style={{ color: COLORS.dangerBg, fontSize: 13 }}>
              No se encontraron tipos de solicitud para "{config.projectKey}"
            </span>
          )}
        </form>
      </div>

      {/* ── Modales de agregar / editar / eliminar / habilitar ───────────────── */}

      {addState.level !== null && (
        <Modal
          title={`Nuevo Nivel ${addState.level}`}
          onClose={() => {
            setAddState(EMPTY_ADD);
            setSelectedRequestTypeId('');
          }}
          onSubmit={confirmAdd}
          submitLabel="Guardar Opción"
        >
          {/* Input de nombre – aplica a todos los niveles */}
          <input
            type="text"
            placeholder="Nombre de la opción"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={INPUT_STYLE}
            autoFocus
          />

          {/* Selector de tipo de solicitud – solo para Nivel 1 */}
          {addState.level === 1 && (
            <div style={{ marginTop: 12 }}>
              <label
                style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 4 }}
              >
                Tipo de solicitud JSM asociado
              </label>
              {loadingRequestTypes ? (
                <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 13 }}>Cargando tipos de solicitud...</p>
              ) : requestTypes.length > 0 ? (
                <select
                  value={selectedRequestTypeId}
                  onChange={(e) => setSelectedRequestTypeId(e.target.value)}
                  style={SELECT_STYLE}
                >
                  <option value="">— Selecciona un tipo de solicitud —</option>
                  {requestTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={{ margin: 0, color: COLORS.dangerBg, fontSize: 13 }}>
                  {config.projectKey
                    ? `No hay tipos disponibles para "${config.projectKey}". Verifica el proyecto.`
                    : 'Configura primero la clave del proyecto JSM.'}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}

      {editState.level !== null && (
        <Modal
          title={`Editar Nivel ${editState.level}`}
          onClose={() => setEditState(EMPTY_EDIT)}
          onSubmit={confirmEdit}
          submitLabel="Guardar Cambios"
        >
          <input
            type="text"
            value={editState.label}
            onChange={(e) => setEditState({ ...editState, label: e.target.value })}
            style={INPUT_STYLE}
            autoFocus
          />
        </Modal>
      )}

      {deleteConfirm.level !== null && (
        <Modal
          title="¿Confirmar eliminación?"
          onClose={() => setDeleteConfirm(EMPTY_DELETE)}
          onSubmit={(e) => {
            e.preventDefault();
            removeLevel();
          }}
          submitLabel="Eliminar"
        >
          <p style={{ margin: 0, color: COLORS.text }}>
            ¿Estás seguro de que deseas eliminar <strong>{deleteConfirm.label}</strong>?
          </p>
          <p style={{ marginTop: 8, color: COLORS.dangerBg, fontSize: 12 }}>
            Esta acción eliminará también todas las opciones hijas asociadas.
          </p>
        </Modal>
      )}

      {disableConfirm.level !== null && (
        <Modal
          title={
            disableConfirm.currentlyDisabled ? '¿Habilitar opción?' : '¿Deshabilitar opción?'
          }
          onClose={() => setDisableConfirm(EMPTY_DISABLE)}
          onSubmit={(e) => {
            e.preventDefault();
            toggleDisabled();
          }}
          submitLabel={disableConfirm.currentlyDisabled ? 'Habilitar' : 'Deshabilitar'}
        >
          <p style={{ margin: 0, color: COLORS.text }}>
            ¿Estás seguro de que deseas{' '}
            {disableConfirm.currentlyDisabled ? 'habilitar' : 'deshabilitar'}{' '}
            <strong>{disableConfirm.label}</strong>?
          </p>
          {!disableConfirm.currentlyDisabled && (
            <p style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 12 }}>
              Esta opción dejará de estar disponible para ser seleccionada en el campo, pero se
              mantendrá en las incidencias donde ya fue seleccionada.
            </p>
          )}
        </Modal>
      )}

      {/* ── Columnas de opciones por nivel ──────────────────────────────────────
          Solo se muestran una vez que el administrador ha guardado la clave del
          proyecto JSM. Sin ella no se pueden asociar tipos de solicitud a los
          niveles, así que bloqueamos el acceso hasta tener esa configuración. */}
      {config.projectKey && !loadingRequestTypes && requestTypes.length > 0 ? (
        <div style={{ display: 'flex', gap: 20 }}>
          <Column
            {...columnProps(1, options, [], selectedPath[0], (id) => setSelectedPath([id, null]))}
          />
          <Column
            {...columnProps(
              2,
              l2Options,
              selectedPath[0] ? [selectedPath[0]] : [],
              selectedPath[1],
              (id) => setSelectedPath([selectedPath[0], id])
            )}
          />
          <Column
            {...columnProps(
              3,
              l3Options,
              selectedPath[0] && selectedPath[1] ? [selectedPath[0], selectedPath[1]] : [],
              null,
              undefined
            )}
          />
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: COLORS.textMuted,
            background: '#F4F5F7',
            borderRadius: 8,
            border: `1px dashed ${COLORS.border}`,
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: COLORS.textSecondary }}>
            ⚙️ Configura el proyecto JSM primero
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: 13 }}>
            Ingresa la clave del proyecto y pulsa <strong>Guardar</strong> para habilitar las opciones de configuración.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
