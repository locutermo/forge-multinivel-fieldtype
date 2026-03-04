import React, { useEffect, useState, useCallback, useRef } from 'react';
import { invoke, view } from '@forge/bridge';

function App() {
  const [config, setConfig] = useState({ options: [] });
  const [loading, setLoading] = useState(true);
  const [isIssueView, setIsIssueView] = useState(false);

  // Cascading lists
  const [level2List, setLevel2List] = useState([]);
  const [level3List, setLevel3List] = useState([]);

  // Selected values
  const [selectedL1, setSelectedL1] = useState('');
  const [selectedL2, setSelectedL2] = useState('');
  const [selectedL3, setSelectedL3] = useState('');

  // Keep a ref so callbacks always read the latest values
  const stateRef = useRef({ selectedL1: '', selectedL2: '', selectedL3: '' });

  const autoSubmit = useCallback(async (l1, l2, l3) => {
    try {
      await view.submit({
        level1: l1 || null,
        level2: l2 || null,
        level3: l3 || null
      });
    } catch (err) {
      console.error('Error auto-submitting field:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      invoke('getConfig'),
      view.getContext()
    ]).then(([data, ctx]) => {
      const cfg = data || { options: [] };
      setConfig(cfg);

      // Check if we are in inline issue-view edit (needs explicit save button)
      const renderCtx = ctx?.extension?.renderContext;
      setIsIssueView(renderCtx === 'issue-view');

      // Pre-populate existing value when editing
      const existingVal = ctx?.extension?.fieldValue;
      if (existingVal && existingVal.level1) {
        const l1Val = existingVal.level1;
        setSelectedL1(l1Val);
        stateRef.current.selectedL1 = l1Val;
        const l1Obj = (cfg.options || []).find(o => o.label === l1Val);
        if (l1Obj?.children) {
          setLevel2List(l1Obj.children);
          const l2Val = existingVal.level2 || '';
          setSelectedL2(l2Val);
          stateRef.current.selectedL2 = l2Val;
          const l2Obj = (l1Obj.children || []).find(o => o.label === l2Val);
          if (l2Obj?.children) {
            setLevel3List(l2Obj.children);
            setSelectedL3(existingVal.level3 || '');
            stateRef.current.selectedL3 = existingVal.level3 || '';
          }
        }
      }
      setLoading(false);
    });
  }, []);

  const handleL1Change = (e) => {
    const val = e.target.value;
    setSelectedL1(val);
    setSelectedL2('');
    setSelectedL3('');
    setLevel3List([]);
    stateRef.current = { selectedL1: val, selectedL2: '', selectedL3: '' };

    const l1Obj = (config.options || []).find(o => o.label === val);
    const children = l1Obj?.children || [];
    setLevel2List(children);

    // Auto-submit immediately if no children (leaf at level 1)
    if (children.length === 0 && !isIssueView) {
      autoSubmit(val, null, null);
    }
  };

  const handleL2Change = (e) => {
    const val = e.target.value;
    setSelectedL2(val);
    setSelectedL3('');
    stateRef.current = { ...stateRef.current, selectedL2: val, selectedL3: '' };

    const l1Obj = (config.options || []).find(o => o.label === stateRef.current.selectedL1);
    const l2Obj = (l1Obj?.children || []).find(o => o.label === val);
    const children = l2Obj?.children || [];
    setLevel3List(children);

    // Auto-submit if no children (leaf at level 2)
    if (children.length === 0 && !isIssueView) {
      autoSubmit(stateRef.current.selectedL1, val, null);
    }
  };

  const handleL3Change = (e) => {
    const val = e.target.value;
    setSelectedL3(val);
    stateRef.current = { ...stateRef.current, selectedL3: val };

    // Always auto-submit on level 3 selection (leaf)
    if (!isIssueView) {
      autoSubmit(stateRef.current.selectedL1, stateRef.current.selectedL2, val);
    }
  };

  const handleIssueViewSave = useCallback(async (e) => {
    e.preventDefault();
    await autoSubmit(selectedL1 || null, selectedL2 || null, selectedL3 || null);
  }, [selectedL1, selectedL2, selectedL3, autoSubmit]);

  const selectStyle = {
    padding: '8px',
    width: '100%',
    marginBottom: 12,
    fontSize: 14,
    border: '2px solid #dfe1e6',
    borderRadius: 4,
    background: 'white',
    cursor: 'pointer'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#5e6c84',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  };

  if (loading) return <p style={{ padding: 16 }}>Cargando opciones...</p>;

  return (
    <div style={{ padding: '8px 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <form onSubmit={handleIssueViewSave}>

        <div>
          <label style={labelStyle}>Nivel 1</label>
          <select value={selectedL1} onChange={handleL1Change} style={selectStyle}>
            <option value="">-- Seleccionar --</option>
            {(config.options || []).map(opt => (
              <option key={opt.id} value={opt.label}>{opt.label}</option>
            ))}
          </select>
        </div>

        {selectedL1 && level2List.length > 0 && (
          <div>
            <label style={labelStyle}>Nivel 2</label>
            <select value={selectedL2} onChange={handleL2Change} style={selectStyle}>
              <option value="">-- Seleccionar --</option>
              {level2List.map(opt => (
                <option key={opt.id} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {selectedL2 && level3List.length > 0 && (
          <div>
            <label style={labelStyle}>Nivel 3</label>
            <select value={selectedL3} onChange={handleL3Change} style={selectStyle}>
              <option value="">-- Seleccionar --</option>
              {level3List.map(opt => (
                <option key={opt.id} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Only show Save/Cancel in issue-view inline edit mode */}
        {isIssueView && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={!selectedL1}
              style={{
                padding: '6px 14px',
                background: selectedL1 ? '#0052CC' : '#b3d4ff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: selectedL1 ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={view.close}
              style={{ padding: '6px 14px', background: '#f4f5f7', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
            >
              Cancelar
            </button>
          </div>
        )}

      </form>
    </div>
  );
}

export default App;
