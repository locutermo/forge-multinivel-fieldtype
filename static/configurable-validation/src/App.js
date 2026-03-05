import React, { useEffect, useState, useCallback } from 'react';
import { invoke, view } from '@forge/bridge';

const generateId = () => Math.random().toString(36).substr(2, 9);

function App() {
  const [config, setConfig] = useState({ options: [] });
  const [loading, setLoading] = useState(true);
  const [addState, setAddState] = useState({ level: null, parentIndices: [] });
  const [editState, setEditState] = useState({ level: null, ids: [], label: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ level: null, ids: [], label: '' });
  const [disableConfirm, setDisableConfirm] = useState({ level: null, ids: [], label: '', currentlyDisabled: false });
  const [newLabel, setNewLabel] = useState('');
  const [selectedPath, setSelectedPath] = useState([null, null]); // [selectedL1Id, selectedL2Id]

  useEffect(() => {
    invoke('getConfig').then((data) => {
      setConfig(data || { options: [] });
      setLoading(false);
    });
  }, []);

  const saveToJira = useCallback(async (newOptions) => {
    const newConfig = { options: newOptions };
    setConfig(newConfig);
    await invoke('saveConfig', newConfig);
  }, []);

  const confirmAdd = async (e) => {
    e.preventDefault();
    const addedLabel = newLabel.trim();
    if (!addedLabel) return;
    const { level, parentIndices } = addState;
    const newOptions = JSON.parse(JSON.stringify(config.options || []));

    if (level === 1) {
      newOptions.push({ id: generateId(), label: addedLabel, children: [] });
    } else if (level === 2) {
      const parent = newOptions.find(o => o.id === parentIndices[0]);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push({ id: generateId(), label: addedLabel, children: [] });
      }
    } else if (level === 3) {
      const l1 = newOptions.find(o => o.id === parentIndices[0]);
      if (l1) {
        const l2 = l1.children.find(o => o.id === parentIndices[1]);
        if (l2) {
          l2.children = l2.children || [];
          l2.children.push({ id: generateId(), label: addedLabel });
        }
      }
    }

    setAddState({ level: null, parentIndices: [] });
    setNewLabel('');
    await saveToJira(newOptions);
  };

  const toggleDisabled = async () => {
    const { level, ids } = disableConfirm;
    const newOptions = JSON.parse(JSON.stringify(config.options || []));
    let item = null;

    if (level === 1) {
      item = newOptions.find(o => o.id === ids[0]);
    } else if (level === 2) {
      const l1 = newOptions.find(o => o.id === ids[0]);
      if (l1) {
        item = l1.children.find(o => o.id === ids[1]);
      }
    } else if (level === 3) {
      const l1 = newOptions.find(o => o.id === ids[0]);
      if (l1) {
        const l2 = l1.children.find(o => o.id === ids[1]);
        if (l2) {
          item = l2.children.find(o => o.id === ids[2]);
        }
      }
    }

    if (item) {
      item.disabled = !item.disabled;
      setDisableConfirm({ level: null, ids: [], label: '', currentlyDisabled: false });
      await saveToJira(newOptions);
    }
  };

  const confirmEdit = async (e) => {
    e.preventDefault();
    const updatedLabel = editState.label.trim();
    if (!updatedLabel) return;
    const { level, ids } = editState;
    const newOptions = JSON.parse(JSON.stringify(config.options || []));

    if (level === 1) {
      const item = newOptions.find(o => o.id === ids[0]);
      if (item) item.label = updatedLabel;
    } else if (level === 2) {
      const l1 = newOptions.find(o => o.id === ids[0]);
      if (l1) {
        const l2 = l1.children.find(o => o.id === ids[1]);
        if (l2) l2.label = updatedLabel;
      }
    } else if (level === 3) {
      const l1 = newOptions.find(o => o.id === ids[0]);
      if (l1) {
        const l2 = l1.children.find(o => o.id === ids[1]);
        if (l2) {
          const l3 = l2.children.find(o => o.id === ids[2]);
          if (l3) l3.label = updatedLabel;
        }
      }
    }

    setEditState({ level: null, ids: [], label: '' });
    await saveToJira(newOptions);
  };

  const removeLevel = async () => {
    const { level, ids } = deleteConfirm;
    const newOptions = JSON.parse(JSON.stringify(config.options || []));
    if (level === 1) {
      const idx = newOptions.findIndex(o => o.id === ids[0]);
      if (idx !== -1) {
        newOptions.splice(idx, 1);
        if (selectedPath[0] === ids[0]) setSelectedPath([null, null]);
      }
    } else if (level === 2) {
      const l1 = newOptions.find(o => o.id === ids[0]);
      if (l1) {
        const idx = l1.children.findIndex(o => o.id === ids[1]);
        if (idx !== -1) {
          l1.children.splice(idx, 1);
          if (selectedPath[1] === ids[1]) setSelectedPath([selectedPath[0], null]);
        }
      }
    } else if (level === 3) {
      const l1 = newOptions.find(o => o.id === ids[0]);
      if (l1) {
        const l2 = l1.children.find(o => o.id === ids[1]);
        if (l2) {
          const idx = l2.children.findIndex(o => o.id === ids[2]);
          if (idx !== -1) l2.children.splice(idx, 1);
        }
      }
    }
    setDeleteConfirm({ level: null, ids: [], label: '' });
    await saveToJira(newOptions);
  };

  const Skeleton = () => (
    <div className="skeleton-container" style={{ padding: 16 }}>
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
      `}</style>
    </div>
  );

  if (loading) return <Skeleton />;

  const l1Selected = config.options.find(o => o.id === selectedPath[0]);
  const l2Options = l1Selected ? (l1Selected.children || []) : [];
  const l2Selected = l2Options.find(o => o.id === selectedPath[1]);
  const l3Options = l2Selected ? (l2Selected.children || []) : [];

  const Column = ({ title, items, level, parentIds, selectedId, onSelect }) => (
    <div style={{
      flex: 1,
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #dfe1e6',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 400,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #dfe1e6',
        background: '#f4f5f7',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#172B4D' }}>{title}</h3>
        <button
          onClick={() => { setAddState({ level, parentIndices: parentIds }); setNewLabel(''); }}
          style={{
            background: '#0052CC',
            color: 'white',
            border: 'none',
            borderRadius: 3,
            padding: '4px 8px',
            fontSize: 12,
            cursor: 'pointer',
            display: (level === 1 || parentIds.length > 0) ? 'block' : 'none'
          }}
        >
          + Agregar
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {items.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#6B778C', fontSize: 12 }}>
            {level > 1 && parentIds.length === 0 ? 'Selecciona un nivel superior' : 'No hay opciones'}
          </div>
        )}
        {[...items].sort((a, b) => a.label.localeCompare(b.label)).map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect && onSelect(item.id)}
            style={{
              padding: '10px 12px',
              margin: '2px 0',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: selectedId === item.id ? '#E6EFFC' : 'transparent',
              color: item.disabled ? '#97A0AF' : (selectedId === item.id ? '#0052CC' : '#172B4D'),
              border: selectedId === item.id ? '1px solid #0052CC' : '1px solid transparent',
              transition: 'all 0.2s',
              opacity: item.disabled ? 0.7 : 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
              <span style={{
                fontSize: 13,
                fontWeight: selectedId === item.id ? 600 : 400,
                textDecoration: item.disabled ? 'line-through' : 'none'
              }}>
                {item.label}
              </span>
              {item.disabled && (
                <span style={{
                  fontSize: 10,
                  background: '#F4F5F7',
                  color: '#42526E',
                  padding: '2px 6px',
                  borderRadius: 10,
                  whiteSpace: 'nowrap'
                }}>
                  deshabilitado
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, opacity: 0.6 }} onMouseOver={(e) => e.currentTarget.style.opacity = 1} onMouseOut={(e) => e.currentTarget.style.opacity = 0.6}>
              <button
                onClick={(e) => { e.stopPropagation(); setDisableConfirm({ level, ids: [...parentIds, item.id], label: item.label, currentlyDisabled: item.disabled }); }}
                title={item.disabled ? "Habilitar" : "Deshabilitar"}
                style={{ background: 'none', border: 'none', color: '#42526E', cursor: 'pointer', fontSize: 13 }}
              >
                {item.disabled ? '👁️‍🗨️' : '👁️'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditState({ level, ids: [...parentIds, item.id], label: item.label }); }}
                title="Editar"
                style={{ background: 'none', border: 'none', color: '#42526E', cursor: 'pointer', fontSize: 13 }}
              >
                ✏️
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ level, ids: [...parentIds, item.id], label: item.label }); }}
                title="Eliminar"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EB5757',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '0 4px'
                }}
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const Modal = ({ title, children, onClose, onSubmit, submitLabel }) => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9, 30, 66, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: 'white', padding: 24, borderRadius: 8, width: 400, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>{title}</h3>
        <form onSubmit={onSubmit}>
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer', background: 'none', border: 'none', color: '#42526E', fontWeight: 500 }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer', background: submitLabel === 'Eliminar' ? '#DE350B' : '#0052CC', color: 'white', border: 'none', borderRadius: 4, fontWeight: 500 }}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, background: '#FAFBFC', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' }}>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: '#172B4D', fontSize: 24, fontWeight: 500 }}>Configuración de Triple Cascada</h2>
        <p style={{ margin: '4px 0 0 0', color: '#6B778C' }}>Gestiona las opciones de tu campo multinivel</p>
      </header>

      {addState.level !== null && (
        <Modal
          title={`Nuevo Nivel ${addState.level}`}
          onClose={() => setAddState({ level: null, parentIndices: [] })}
          onSubmit={confirmAdd}
          submitLabel="Guardar Opción"
        >
          <input
            type="text"
            placeholder="Nombre de la opción"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={{ padding: '8px 12px', width: '100%', boxSizing: 'border-box', border: '2px solid #dfe1e6', borderRadius: 4, fontSize: 14 }}
            autoFocus
          />
        </Modal>
      )}

      {editState.level !== null && (
        <Modal
          title={`Editar Nivel ${editState.level}`}
          onClose={() => setEditState({ level: null, ids: [], label: '' })}
          onSubmit={confirmEdit}
          submitLabel="Guardar Cambios"
        >
          <input
            type="text"
            value={editState.label}
            onChange={(e) => setEditState({ ...editState, label: e.target.value })}
            style={{ padding: '8px 12px', width: '100%', boxSizing: 'border-box', border: '2px solid #dfe1e6', borderRadius: 4, fontSize: 14 }}
            autoFocus
          />
        </Modal>
      )}

      {deleteConfirm.level !== null && (
        <Modal
          title="¿Confirmar eliminación?"
          onClose={() => setDeleteConfirm({ level: null, ids: [], label: '' })}
          onSubmit={(e) => { e.preventDefault(); removeLevel(); }}
          submitLabel="Eliminar"
        >
          <p style={{ margin: 0, color: '#172B4D' }}>
            ¿Estás seguro de que deseas eliminar <strong>{deleteConfirm.label}</strong>?
          </p>
          <p style={{ marginTop: 8, color: '#DE350B', fontSize: 12 }}>
            Esta acción eliminará también todas las opciones hijas asociadas.
          </p>
        </Modal>
      )}

      {disableConfirm.level !== null && (
        <Modal
          title={disableConfirm.currentlyDisabled ? "¿Habilitar opción?" : "¿Deshabilitar opción?"}
          onClose={() => setDisableConfirm({ level: null, ids: [], label: '', currentlyDisabled: false })}
          onSubmit={(e) => { e.preventDefault(); toggleDisabled(); }}
          submitLabel={disableConfirm.currentlyDisabled ? "Habilitar" : "Deshabilitar"}
        >
          <p style={{ margin: 0, color: '#172B4D' }}>
            ¿Estás seguro de que deseas {disableConfirm.currentlyDisabled ? 'habilitar' : 'deshabilitar'} <strong>{disableConfirm.label}</strong>?
          </p>
          {!disableConfirm.currentlyDisabled && (
            <p style={{ marginTop: 8, color: '#6B778C', fontSize: 12 }}>
              Esta opción dejará de estar disponible para ser seleccionada en el campo, pero se mantendrá en las incidencias donde ya fue seleccionada.
            </p>
          )}
        </Modal>
      )}

      <div style={{ display: 'flex', gap: 20 }}>
        <Column
          title="Nivel 1"
          items={config.options || []}
          level={1}
          parentIds={[]}
          selectedId={selectedPath[0]}
          onSelect={(id) => setSelectedPath([id, null])}
        />
        <Column
          title="Nivel 2"
          items={l2Options}
          level={2}
          parentIds={selectedPath[0] ? [selectedPath[0]] : []}
          selectedId={selectedPath[1]}
          onSelect={(id) => setSelectedPath([selectedPath[0], id])}
        />
        <Column
          title="Nivel 3"
          items={l3Options}
          level={3}
          parentIds={selectedPath[0] && selectedPath[1] ? [selectedPath[0], selectedPath[1]] : []}
          selectedId={null}
        />
      </div>
    </div>
  );
}

export default App;
