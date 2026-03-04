import React, { useEffect, useState, useCallback } from 'react';
import { invoke, view } from '@forge/bridge';

const generateId = () => Math.random().toString(36).substr(2, 9);

function App() {
  const [config, setConfig] = useState({ options: [] });
  const [loading, setLoading] = useState(true);
  const [addState, setAddState] = useState({ level: null, parentIndices: [] });
  const [newLabel, setNewLabel] = useState('');

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
    const newOptions = [...(config.options || [])];

    if (level === 1) {
      newOptions.push({ id: generateId(), label: addedLabel, children: [] });
    } else if (level === 2) {
      newOptions[parentIndices[0]].children = newOptions[parentIndices[0]].children || [];
      newOptions[parentIndices[0]].children.push({ id: generateId(), label: addedLabel, children: [] });
    } else if (level === 3) {
      const l2 = newOptions[parentIndices[0]].children[parentIndices[1]];
      l2.children = l2.children || [];
      l2.children.push({ id: generateId(), label: addedLabel });
    }

    setAddState({ level: null, parentIndices: [] });
    setNewLabel('');
    await saveToJira(newOptions);
  };

  const removeLevel = async (level, indices) => {
    const newOptions = [...config.options];
    if (level === 1) newOptions.splice(indices[0], 1);
    else if (level === 2) newOptions[indices[0]].children.splice(indices[1], 1);
    else if (level === 3) newOptions[indices[0]].children[indices[1]].children.splice(indices[2], 1);
    await saveToJira(newOptions);
  };

  if (loading) return <p>Cargando configuración...</p>;

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2>Configuración de Triple Cascada</h2>

      {addState.level !== null && (
        <div style={{ background: '#f4f5f7', padding: 12, marginBottom: 12, borderRadius: 4 }}>
          <p><strong>Agregando Nivel {addState.level}</strong></p>
          <form onSubmit={confirmAdd}>
            <input
              type="text"
              placeholder="Nombre de la opción"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{ padding: 8, width: 300, marginRight: 8 }}
              autoFocus
            />
            <button type="submit" style={{ padding: '8px 16px', marginRight: 8, cursor: 'pointer', background: '#0052CC', color: 'white', border: 'none', borderRadius: 4 }}>
              Guardar
            </button>
            <button type="button" onClick={() => setAddState({ level: null, parentIndices: [] })} style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {addState.level === null && (
        <div>
          <button
            onClick={() => { setAddState({ level: 1, parentIndices: [] }); setNewLabel(''); }}
            style={{ padding: '8px 16px', marginBottom: 12, background: '#0052CC', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            + Agregar Nivel 1
          </button>

          {config.options?.map((l1, i1) => (
            <div key={l1.id} style={{ borderLeft: '3px solid #0052CC', paddingLeft: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong>{l1.label}</strong>
                <button onClick={() => { setAddState({ level: 2, parentIndices: [i1] }); setNewLabel(''); }} style={{ fontSize: 12, padding: '2px 8px', cursor: 'pointer' }}>+ L2</button>
                <button onClick={() => removeLevel(1, [i1])} style={{ fontSize: 12, padding: '2px 8px', color: 'red', cursor: 'pointer' }}>✕ Eliminar</button>
              </div>
              {l1.children?.map((l2, i2) => (
                <div key={l2.id} style={{ borderLeft: '2px dashed #79E2F2', paddingLeft: 16, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#006644' }}>{l2.label}</span>
                    <button onClick={() => { setAddState({ level: 3, parentIndices: [i1, i2] }); setNewLabel(''); }} style={{ fontSize: 12, padding: '2px 8px', cursor: 'pointer' }}>+ L3</button>
                    <button onClick={() => removeLevel(2, [i1, i2])} style={{ fontSize: 12, padding: '2px 8px', color: 'red', cursor: 'pointer' }}>✕ Eliminar</button>
                  </div>
                  {l2.children?.map((l3, i3) => (
                    <div key={l3.id} style={{ paddingLeft: 16, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#403294' }}>{l3.label}</span>
                      <button onClick={() => removeLevel(3, [i1, i2, i3])} style={{ fontSize: 12, padding: '2px 8px', color: 'red', cursor: 'pointer' }}>✕ Eliminar</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
