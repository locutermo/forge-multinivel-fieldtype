import React, { useEffect, useState, useCallback, useRef } from 'react';
import { invoke, view } from '@forge/bridge';

function App() {
  const [config, setConfig] = useState({ options: [] });
  const [loading, setLoading] = useState(true);
  const [isIssueView, setIsIssueView] = useState(false);

  const [level2List, setLevel2List] = useState([]);
  const [level3List, setLevel3List] = useState([]);

  const [selectedL1, setSelectedL1] = useState('');
  const [selectedL2, setSelectedL2] = useState('');
  const [selectedL3, setSelectedL3] = useState('');

  const [errors, setErrors] = useState({ l1: false, l2: false, l3: false });
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ l1: false, l2: false, l3: false });

  const l1Ref = useRef(null);
  const l2Ref = useRef(null);
  const l3Ref = useRef(null);

  const autoSubmit = useCallback(async (l1, l2, l3) => {
    const l2Required = level2List.length > 0;
    const l3Required = level3List.length > 0;

    const newErrors = {
      l1: !l1,
      l2: l2Required && !l2,
      l3: l3Required && !l3
    };

    setErrors(newErrors);
    setSubmitted(true);

    if (newErrors.l1) {
      l1Ref.current?.focus();
      return;
    }
    if (newErrors.l2) {
      l2Ref.current?.focus();
      return;
    }
    if (newErrors.l3) {
      l3Ref.current?.focus();
      return;
    }

    try {
      await view.submit({
        level1: l1,
        level2: l2 || '',
        level3: l3 || ''
      });
    } catch (err) {
      console.error('Error auto-submitting field:', err);
    }
  }, [level2List, level3List]);

  const clearSubmit = useCallback(async () => {
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

      const renderCtx = ctx?.extension?.renderContext;
      setIsIssueView(renderCtx === 'issue-view');

      const existingVal = ctx?.extension?.fieldValue;
      if (existingVal && existingVal.level1) {
        const l1Val = existingVal.level1;
        setSelectedL1(l1Val);

        const l1Obj = (cfg.options || []).find(o => o.label === l1Val);
        if (l1Obj && l1Obj.children) {
          setLevel2List(l1Obj.children);
          const l2Val = existingVal.level2 || '';
          if (l2Val) {
            setSelectedL2(l2Val);
            const l2Obj = (l1Obj.children || []).find(o => o.label === l2Val);
            if (l2Obj && l2Obj.children) {
              setLevel3List(l2Obj.children);
              const l3Val = existingVal.level3 || '';
              if (l3Val) setSelectedL3(l3Val);
            }
          }
        }
      }
    }).catch(err => {
      console.error('Error in initialization:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      try {
        if (view.resize) view.resize();
      } catch (e) { }
    };
    handleResize();
    const timer = setTimeout(handleResize, 100);
    return () => clearTimeout(timer);
  }, [loading, selectedL1, selectedL2, selectedL3, level2List, level3List]);

  const handleL1Change = (e) => {
    const val = e.target.value;
    setSelectedL1(val);
    setSelectedL2('');
    setSelectedL3('');
    setLevel3List([]);
    setTouched(t => ({ ...t, l1: true }));
    setErrors(err => ({ ...err, l1: !val, l2: false, l3: false }));

    const l1Obj = (config.options || []).find(o => o.label === val);
    const children = l1Obj?.children || [];
    setLevel2List(children);

    if (!val && !isIssueView) clearSubmit();
  };

  const handleL2Change = (e) => {
    const val = e.target.value;
    setSelectedL2(val);
    setSelectedL3('');
    setTouched(t => ({ ...t, l2: true }));
    setErrors(err => ({ ...err, l2: !val, l3: false }));

    const l1Obj = (config.options || []).find(o => o.label === selectedL1);
    const l2Obj = (l1Obj?.children || []).find(o => o.label === val);
    const children = l2Obj?.children || [];
    setLevel3List(children);

    if (!val && !isIssueView) clearSubmit();
  };

  const handleL3Change = (e) => {
    const val = e.target.value;
    setSelectedL3(val);
    setTouched(t => ({ ...t, l3: true }));
    setErrors(err => ({ ...err, l3: !val }));

    if (!isIssueView) {
      if (selectedL1 && selectedL2 && val) {
        autoSubmit(selectedL1, selectedL2, val);
      } else {
        clearSubmit();
      }
    }
  };

  const handleIssueViewSave = useCallback(async (e) => {
    if (e) e.preventDefault();
    await autoSubmit(selectedL1, selectedL2, selectedL3);
  }, [selectedL1, selectedL2, selectedL3, autoSubmit]);

  const labelStyle = {
    display: 'block',
    marginBottom: 4,
    marginLeft: 0,
    paddingLeft: 0,
    fontSize: 12,
    fontWeight: 600,
    color: '#5e6c84',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  };

  const selectStyle = (hasError) => ({
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    border: `2px solid ${hasError ? '#de350b' : '#ddd'}`,
    fontSize: 14,
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box'
  });

  const Skeleton = () => (
    <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`
        body, #root {
          margin: 0 !important;
          padding: 0 !important;
        }
        .skeleton-container { width: 100%; margin: 0; padding: 0; }
        .skeleton-label { width: 60px; height: 12px; background: #f4f5f7; margin-bottom: 8px; border-radius: 2px;
          background: linear-gradient(90deg, #f4f5f7 25%, #ebecf0 50%, #f4f5f7 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        .skeleton-select { width: 100%; height: 38px; background: #f4f5f7; border-radius: 4px; margin-bottom: 12px;
          background: linear-gradient(90deg, #f4f5f7 25%, #ebecf0 50%, #f4f5f7 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
      <div className="skeleton-label"></div>
      <div className="skeleton-select"></div>
    </div>
  );

  if (loading) return <Skeleton />;

  return (
    <>
      <style>{`
        body, #root {
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <div style={{ padding: '0px', margin: '0px', width: '100%', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <form onSubmit={handleIssueViewSave} style={{ width: '100%', margin: 0, padding: 0 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Nivel 1 <span style={{ color: '#de350b' }}>*</span></label>
            <select
              ref={l1Ref}
              value={selectedL1}
              onChange={handleL1Change}
              style={selectStyle((submitted || touched.l1) && errors.l1)}
            >
              <option value="">-- Seleccionar --</option>
              {(config.options || []).map(opt => (
                <option key={opt.id || opt.label} value={opt.label}>{opt.label}</option>
              ))}
            </select>
            {(submitted || touched.l1) && errors.l1 && (
              <p style={{ color: '#de350b', fontSize: 11, margin: '4px 0 0 0' }}>Este campo es obligatorio</p>
            )}
          </div>

          {selectedL1 && level2List.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Nivel 2 <span style={{ color: '#de350b' }}>*</span></label>
              <select
                ref={l2Ref}
                value={selectedL2}
                onChange={handleL2Change}
                style={selectStyle((submitted || touched.l2) && errors.l2)}
              >
                <option value="">-- Seleccionar --</option>
                {level2List.map(opt => (
                  <option key={opt.id || opt.label} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              {(submitted || touched.l2) && errors.l2 && (
                <p style={{ color: '#de350b', fontSize: 11, margin: '4px 0 0 0' }}>Este campo es obligatorio</p>
              )}
            </div>
          )}

          {selectedL2 && level3List.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Nivel 3 <span style={{ color: '#de350b' }}>*</span></label>
              <select
                ref={l3Ref}
                value={selectedL3}
                onChange={handleL3Change}
                style={selectStyle((submitted || touched.l3) && errors.l3)}
              >
                <option value="">-- Seleccionar --</option>
                {level3List.map(opt => (
                  <option key={opt.id || opt.label} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              {(submitted || touched.l3) && errors.l3 && (
                <p style={{ color: '#de350b', fontSize: 11, margin: '4px 0 0 0' }}>Este campo es obligatorio</p>
              )}
            </div>
          )}

          {isIssueView && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="submit" style={{ padding: '6px 14px', background: '#0052CC', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Guardar</button>
              <button type="button" onClick={() => view.close()} style={{ padding: '6px 14px', background: '#f4f5f7', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Cancelar</button>
            </div>
          )}
        </form>
      </div>
    </>
  );
}

export default App;
