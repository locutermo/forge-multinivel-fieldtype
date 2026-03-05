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

  // Validation errors
  const [errors, setErrors] = useState({ l1: false, l2: false, l3: false });
  const [submitted, setSubmitted] = useState(false);
  // Track which levels have been touched
  const [touched, setTouched] = useState({ l1: false, l2: false, l3: false });

  // Keep a ref so callbacks always read the latest values
  const stateRef = useRef({ selectedL1: '', selectedL2: '', selectedL3: '' });

  const autoSubmit = useCallback(async (l1, l2, l3) => {
    // Validar que los tres niveles estén completos
    const newErrors = { l1: !l1, l2: !l2, l3: !l3 };
    setErrors(newErrors);
    setSubmitted(true);
    if (!l1 || !l2 || !l3) return;
    try {
      await view.submit({
        level1: l1,
        level2: l2,
        level3: l3
      });
    } catch (err) {
      console.error('Error auto-submitting field:', err);
    }
  }, []);

  const clearSubmit = useCallback(async () => {
    // Borrar cualquier valor previo enviado a Forge
    try {
      await view.submit(null);
    } catch (err) {
      console.error('Error clearing field:', err);
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
    setTouched(t => ({ ...t, l1: true }));
    setErrors(err => ({ ...err, l1: !val, l2: false, l3: false }));

    const l1Obj = (config.options || []).find(o => o.label === val);
    const children = l1Obj?.children || [];
    setLevel2List(children);

    // Si el usuario deselecciona, borrar valor previo de Forge
    if (!val && !isIssueView) clearSubmit();
  };

  const handleL2Change = (e) => {
    const val = e.target.value;
    setSelectedL2(val);
    setSelectedL3('');
    stateRef.current = { ...stateRef.current, selectedL2: val, selectedL3: '' };
    setTouched(t => ({ ...t, l2: true }));
    setErrors(err => ({ ...err, l2: !val, l3: false }));

    const l1Obj = (config.options || []).find(o => o.label === stateRef.current.selectedL1);
    const l2Obj = (l1Obj?.children || []).find(o => o.label === val);
    const children = l2Obj?.children || [];
    setLevel3List(children);

    // Si el usuario deselecciona, borrar valor previo de Forge
    if (!val && !isIssueView) clearSubmit();
  };

  const handleL3Change = (e) => {
    const val = e.target.value;
    setSelectedL3(val);
    stateRef.current = { ...stateRef.current, selectedL3: val };
    setTouched(t => ({ ...t, l3: true }));
    setErrors(err => ({ ...err, l3: !val }));

    if (!isIssueView) {
      if (stateRef.current.selectedL1 && stateRef.current.selectedL2 && val) {
        // Los tres niveles completos: auto-submit
        autoSubmit(stateRef.current.selectedL1, stateRef.current.selectedL2, val);
      } else {
        // El usuario quitó el valor: borrar en Forge
        clearSubmit();
      }
    }
  };

  const handleIssueViewSave = useCallback(async (e) => {
    e.preventDefault();
    await autoSubmit(selectedL1 || null, selectedL2 || null, selectedL3 || null);
  }, [selectedL1, selectedL2, selectedL3, autoSubmit]);

  const selectStyle = {
    //padding: '8px',
    width: '100%',
    marginBottom: 12,
    fontSize: 14,
    border: '2px solid #dfe1e6',
    borderRadius: 4,
    background: 'white',
    cursor: 'pointer'
  };

  const labelStyle = {
    display: 'flex',
    marginLeft: 0,
    paddingLeft: 0,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#5e6c84',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  };

  const Skeleton = () => (
    <div className="skeleton-container">
      <div className="skeleton-label"></div>
      <div className="skeleton-select"></div>
      <style>{`
        .skeleton-container {
          padding: 0px;
          width: 100%;
        }
        .skeleton-label {
          width: 60px;
          height: 12px;
          background: #f4f5f7;
          margin-bottom: 8px;
          border-radius: 2px;
          background: linear-gradient(90deg, #f4f5f7 25%, #ebecf0 50%, #f4f5f7 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-select {
          width: 100%;
          height: 38px;
          background: #f4f5f7;
          border-radius: 4px;
          margin-bottom: 12px;
          background: linear-gradient(90deg, #f4f5f7 25%, #ebecf0 50%, #f4f5f7 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );

  if (loading) return <Skeleton />;

  // Advertencia cuando el campo está incompleto (modo portal)
  const isIncomplete = selectedL1 && (!selectedL2 || (level3List.length > 0 && !selectedL3));

  return (
    <>
      <style>{`
        body, #root {
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <div style={{ padding: '0px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <form onSubmit={handleIssueViewSave}>

          {isIncomplete && (
            <div style={{
              background: '#fffae6',
              border: '1px solid #ff991f',
              borderRadius: 4,
              padding: '8px 12px',
              marginBottom: 10,
              fontSize: 12,
              color: '#974F0C',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              ⚠️ Debes completar los tres niveles antes de enviar el formulario.
            </div>
          )}
          <div>
            <label style={labelStyle}>Nivel 1 <span style={{ color: '#de350b' }}>*</span></label>
            <select
              value={selectedL1}
              onChange={handleL1Change}
              style={{ ...selectStyle, border: (touched.l1 && errors.l1) ? '2px solid #de350b' : '2px solid #dfe1e6' }}
            >
              <option value="">-- Seleccionar --</option>
              {(config.options || []).filter(opt => !opt.disabled || opt.label === selectedL1).map(opt => (
                <option key={opt.id} value={opt.label}>{opt.label}</option>
              ))}
            </select>
            {touched.l1 && errors.l1 && (
              <p style={{ color: '#de350b', fontSize: 11, margin: '-8px 0 8px 0' }}>Este campo es obligatorio</p>
            )}
          </div>

          {selectedL1 && level2List.length > 0 && (
            <div>
              <label style={labelStyle}>Nivel 2 <span style={{ color: '#de350b' }}>*</span></label>
              <select
                value={selectedL2}
                onChange={handleL2Change}
                style={{ ...selectStyle, border: (touched.l2 && errors.l2) ? '2px solid #de350b' : '2px solid #dfe1e6' }}
              >
                <option value="">-- Seleccionar --</option>
                {level2List.filter(opt => !opt.disabled || opt.label === selectedL2).map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              {touched.l2 && errors.l2 && (
                <p style={{ color: '#de350b', fontSize: 11, margin: '-8px 0 8px 0' }}>Este campo es obligatorio</p>
              )}
            </div>
          )}

          {selectedL2 && level3List.length > 0 && (
            <div>
              <label style={labelStyle}>Nivel 3 <span style={{ color: '#de350b' }}>*</span></label>
              <select
                value={selectedL3}
                onChange={handleL3Change}
                style={{ ...selectStyle, border: (touched.l3 && errors.l3) ? '2px solid #de350b' : '2px solid #dfe1e6' }}
              >
                <option value="">-- Seleccionar --</option>
                {level3List.filter(opt => !opt.disabled || opt.label === selectedL3).map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              {touched.l3 && errors.l3 && (
                <p style={{ color: '#de350b', fontSize: 11, margin: '-8px 0 8px 0' }}>Este campo es obligatorio</p>
              )}
            </div>
          )}

          {isIssueView && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={!selectedL1 || !selectedL2 || !selectedL3}
                style={{
                  padding: '6px 14px',
                  background: (selectedL1 && selectedL2 && selectedL3) ? '#0052CC' : '#b3d4ff',
                  color: 'white', border: 'none', borderRadius: 4,
                  cursor: (selectedL1 && selectedL2 && selectedL3) ? 'pointer' : 'not-allowed',
                  fontWeight: 600, fontSize: 14
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
    </>
  );
}

export default App;