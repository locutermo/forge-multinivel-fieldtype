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

const EMPTY_ADD = { level: null, parentIndices: [] };
const EMPTY_EDIT = { level: null, ids: [], label: '' };
const EMPTY_DELETE = { level: null, ids: [], label: '' };
const EMPTY_DISABLE = { level: null, ids: [], label: '', currentlyDisabled: false };

function App() {
  const [config, setConfig] = useState({ options: [] });
  const [loading, setLoading] = useState(true);
  const [addState, setAddState] = useState(EMPTY_ADD);
  const [editState, setEditState] = useState(EMPTY_EDIT);
  const [deleteConfirm, setDeleteConfirm] = useState(EMPTY_DELETE);
  const [disableConfirm, setDisableConfirm] = useState(EMPTY_DISABLE);
  const [newLabel, setNewLabel] = useState('');
  const [selectedPath, setSelectedPath] = useState([null, null]); // [selectedL1Id, selectedL2Id]

  useEffect(() => {
    invoke('getConfig')
      .then((data) => setConfig(data || { options: [] }))
      .catch((err) => console.error('Error loading config:', err))
      .finally(() => setLoading(false));
  }, []);

  const saveToJira = useCallback(async (newOptions) => {
    const newConfig = { options: newOptions };
    setConfig(newConfig);
    await invoke('saveConfig', newConfig);
  }, []);

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
      parentArray.push(newItem);

      setAddState(EMPTY_ADD);
      setNewLabel('');
      await saveToJira(newOptions);
    },
    [config.options, addState, newLabel, saveToJira]
  );

  const toggleDisabled = useCallback(async () => {
    const { level, ids } = disableConfirm;
    const newOptions = cloneOptions(config.options);
    const item = findItemInTree(newOptions, ids);
    if (!item) return;
    item.disabled = !item.disabled;
    setDisableConfirm(EMPTY_DISABLE);
    await saveToJira(newOptions);
  }, [config.options, disableConfirm, saveToJira]);

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
      await saveToJira(newOptions);
    },
    [config.options, editState, saveToJira]
  );

  const removeLevel = useCallback(async () => {
    const { level, ids } = deleteConfirm;
    const newOptions = cloneOptions(config.options);
    const pair = getParentAndIndex(newOptions, ids);
    if (!pair) return;
    const { parent, index } = pair;
    parent.splice(index, 1);
    if (ids.length === 1 && selectedPath[0] === ids[0]) setSelectedPath([null, null]);
    else if (ids.length === 2 && selectedPath[1] === ids[1]) setSelectedPath([selectedPath[0], null]);
    setDeleteConfirm(EMPTY_DELETE);
    await saveToJira(newOptions);
  }, [config.options, deleteConfirm, selectedPath, saveToJira]);

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

      {addState.level !== null && (
        <Modal
          title={`Nuevo Nivel ${addState.level}`}
          onClose={() => setAddState(EMPTY_ADD)}
          onSubmit={confirmAdd}
          submitLabel="Guardar Opción"
        >
          <input
            type="text"
            placeholder="Nombre de la opción"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={INPUT_STYLE}
            autoFocus
          />
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
    </div>
  );
}

export default App;
