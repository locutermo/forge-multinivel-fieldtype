import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { invoke, view } from '@forge/bridge';
import Select from '@atlaskit/select';
import '@atlaskit/css-reset';

function App() {
  const [config, setConfig] = useState({ options: [] });
  const [loading, setLoading] = useState(true);
  const [isIssueView, setIsIssueView] = useState(false);

  const [level2List, setLevel2List] = useState([]);
  const [level3List, setLevel3List] = useState([]);

  // Selected values (Objects for @atlaskit/select compatibility)
  const [selectedL1, setSelectedL1] = useState(null);
  const [selectedL2, setSelectedL2] = useState(null);
  const [selectedL3, setSelectedL3] = useState(null);

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
        level1: l1.label,
        level2: l2 ? l2.label : '',
        level3: l3 ? l3.label : ''
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
        const l1Obj = (cfg.options || []).find(o => o.label === l1Val);
        // Only restore selection if the option is not disabled
        if (l1Obj && !l1Obj.disabled) {
          const l1Option = { label: l1Obj.label, value: l1Obj.id || l1Obj.label };
          setSelectedL1(l1Option);

          const l2Enabled = (l1Obj.children || []).filter(c => !c.disabled);
          if (l2Enabled.length > 0) {
            setLevel2List(l2Enabled);
            const l2Val = existingVal.level2 || '';
            const l2Obj = (l1Obj.children || []).find(o => o.label === l2Val);
            if (l2Obj && !l2Obj.disabled) {
              const l2Option = { label: l2Obj.label, value: l2Obj.id || l2Obj.label };
              setSelectedL2(l2Option);

              const l3Enabled = (l2Obj.children || []).filter(c => !c.disabled);
              if (l3Enabled.length > 0) {
                setLevel3List(l3Enabled);
                const l3Val = existingVal.level3 || '';
                const l3Obj = (l2Obj.children || []).find(o => o.label === l3Val);
                if (l3Obj && !l3Obj.disabled) {
                  const l3Option = { label: l3Obj.label, value: l3Obj.id || l3Obj.label };
                  setSelectedL3(l3Option);
                }
              }
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

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      try {
        if (view.resize) view.resize();
      } catch (e) { }
    };
    handleResize();
    const timer = setTimeout(handleResize, 100);
    return () => clearTimeout(timer);
  }, [loading, selectedL1, selectedL2, selectedL3, level2List, level3List, menuOpen]);

  const handleL1Change = (option) => {
    setSelectedL1(option);
    setSelectedL2(null);
    setSelectedL3(null);
    setLevel3List([]);
    setTouched(t => ({ ...t, l1: true }));
    setErrors(err => ({ ...err, l1: !option, l2: false, l3: false }));

    const l1Obj = (config.options || []).find(o => (o.id || o.label) === option?.value);
    const children = l1Obj?.children || [];
    setLevel2List(children);

    if (!option && !isIssueView) clearSubmit();
  };

  const handleL2Change = (option) => {
    setSelectedL2(option);
    setSelectedL3(null);
    setTouched(t => ({ ...t, l2: true }));
    setErrors(err => ({ ...err, l2: !option, l3: false }));

    const l1Obj = (config.options || []).find(o => (o.id || o.label) === selectedL1?.value);
    const l2Obj = (l1Obj?.children || []).find(o => (o.id || o.label) === option?.value);
    const children = l2Obj?.children || [];
    setLevel3List(children);

    if (!option && !isIssueView) clearSubmit();
  };

  const handleL3Change = (option) => {
    setSelectedL3(option);
    setTouched(t => ({ ...t, l3: true }));
    setErrors(err => ({ ...err, l3: !option }));

    if (!isIssueView) {
      if (selectedL1 && selectedL2 && option) {
        autoSubmit(selectedL1, selectedL2, option);
      } else if (!option) {
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

  const selectStyles = {
    container: (base) => ({
      ...base,
      width: 'auto'

    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  // Only show options that are not disabled; disabled options are hidden from the form
  const formatOptions = (options) => {
    return (options || []).filter(opt => !opt.disabled).map(opt => ({ label: opt.label, value: opt.id || opt.label }));
  };

  const l1Options = useMemo(() => formatOptions(config.options), [config.options]);
  const l2Options = useMemo(() => formatOptions(level2List), [level2List]);
  const l3Options = useMemo(() => formatOptions(level3List), [level3List]);

  const Skeleton = () => (
    <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`
        body, #root { margin: 0 !important; padding: 0 !important; }
        .skeleton-container { width: 100%; margin: 0; padding: 0; }
        .skeleton-label { width: 60px; height: 12px; background: #f4f5f7; margin-bottom: 8px; border-radius: 2px;
          background: linear-gradient(90deg, #f4f5f7 25%, #ebecf0 50%, #f4f5f7 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        .skeleton-select { width: auto; height: 38px; background: #f4f5f7; border-radius: 4px; margin-bottom: 12px;
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
          overflow: visible !important;
        }
        .form-container {
          padding: 0px;
          margin: 0px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-bottom: ${menuOpen ? '80px' : '0px'};
          overflow: visible !important;
          transition: padding-bottom 0.2s ease-out;
        }
      `}</style>
      <div className="form-container" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <form onSubmit={handleIssueViewSave} style={{ width: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ marginBottom: 12, width: '100%' }}>
            <label style={labelStyle}>Nivel 1 <span style={{ color: '#de350b' }}>*</span></label>
            <Select
              ref={l1Ref}
              options={l1Options}
              value={selectedL1}
              onChange={handleL1Change}
              onFocus={() => {
                setMenuOpen(true);
                if (view.resize) view.resize();
              }}
              onMenuOpen={() => {
                setMenuOpen(true);
                if (view.resize) view.resize();
              }}
              onMenuClose={() => setMenuOpen(false)}
              placeholder="-- Seleccionar --"
              isClearable
              styles={selectStyles}
              menuPosition="absolute"
              menuPlacement="bottom"
              menuShouldScrollIntoView={false}
              maxMenuHeight={200}
              appearance={((submitted || touched.l1) && errors.l1) ? 'error' : 'default'}
            />
            {(submitted || touched.l1) && errors.l1 && (
              <p style={{ color: '#de350b', fontSize: 11, margin: '4px 0 0 0' }}>Este campo es obligatorio</p>
            )}
          </div>

          {selectedL1 && level2List.length > 0 && (
            <div style={{ marginBottom: 12, width: '100%' }}>
              <label style={labelStyle}>Nivel 2 <span style={{ color: '#de350b' }}>*</span></label>
              <Select
                ref={l2Ref}
                options={l2Options}
                value={selectedL2}
                onChange={handleL2Change}
                onFocus={() => {
                  setMenuOpen(true);
                  if (view.resize) view.resize();
                }}
                onMenuOpen={() => {
                  setMenuOpen(true);
                  if (view.resize) view.resize();
                }}
                onMenuClose={() => setMenuOpen(false)}
                placeholder="-- Seleccionar --"
                isClearable
                styles={selectStyles}
                menuPosition="absolute"
                menuPlacement="bottom"
                menuShouldScrollIntoView={false}
                maxMenuHeight={200}
                appearance={((submitted || touched.l2) && errors.l2) ? 'error' : 'default'}
              />
              {(submitted || touched.l2) && errors.l2 && (
                <p style={{ color: '#de350b', fontSize: 11, margin: '4px 0 0 0' }}>Este campo es obligatorio</p>
              )}
            </div>
          )}

          {selectedL2 && level3List.length > 0 && (
            <div style={{ marginBottom: 12, width: '100%' }}>
              <label style={labelStyle}>Nivel 3 <span style={{ color: '#de350b' }}>*</span></label>
              <Select
                ref={l3Ref}
                options={l3Options}
                value={selectedL3}
                onChange={handleL3Change}
                onFocus={() => {
                  setMenuOpen(true);
                  if (view.resize) view.resize();
                }}
                onMenuOpen={() => {
                  setMenuOpen(true);
                  if (view.resize) view.resize();
                }}
                onMenuClose={() => setMenuOpen(false)}
                placeholder="-- Seleccionar --"
                isClearable
                styles={selectStyles}
                menuPosition="absolute"
                menuPlacement="bottom"
                menuShouldScrollIntoView={false}
                maxMenuHeight={200}
                appearance={((submitted || touched.l3) && errors.l3) ? 'error' : 'default'}
              />
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
