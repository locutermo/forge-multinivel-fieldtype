import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { invoke, view } from '@forge/bridge';
import '@atlaskit/css-reset';
import LevelSelect from './LevelSelect';
import { formatOptions, getInitialSelectionState, COLORS } from './utils';

/** Skeleton de carga mientras se obtiene config y contexto */
function Skeleton() {
  return (
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
}

function App() {
  const [config, setConfig] = useState({ options: [] });
  const [loading, setLoading] = useState(true);
  const [isIssueView, setIsIssueView] = useState(false);
  const [level2List, setLevel2List] = useState([]);
  const [level3List, setLevel3List] = useState([]);
  const [selectedL1, setSelectedL1] = useState(null);
  const [selectedL2, setSelectedL2] = useState(null);
  const [selectedL3, setSelectedL3] = useState(null);
  const [errors, setErrors] = useState({ l1: false, l2: false, l3: false });
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ l1: false, l2: false, l3: false });
  const [menuOpen, setMenuOpen] = useState(false);

  const l1Ref = useRef(null);
  const l2Ref = useRef(null);
  const l3Ref = useRef(null);

  const resizeView = useCallback(() => {
    try {
      if (view.resize) view.resize();
    } catch (e) {}
  }, []);

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    resizeView();
  }, [resizeView]);

  const autoSubmit = useCallback(
    async (l1, l2, l3) => {
      const l2Required = level2List.length > 0;
      const l3Required = level3List.length > 0;
      const newErrors = {
        l1: !l1,
        l2: l2Required && !l2,
        l3: l3Required && !l3,
      };
      setErrors(newErrors);
      setSubmitted(true);

      if (newErrors.l1) return l1Ref.current?.focus();
      if (newErrors.l2) return l2Ref.current?.focus();
      if (newErrors.l3) return l3Ref.current?.focus();

      try {
        await view.submit({
          level1: l1.label,
          level2: l2 ? l2.label : '',
          level3: l3 ? l3.label : '',
        });
      } catch (err) {
        console.error('Error auto-submitting field:', err);
      }
    },
    [level2List, level3List]
  );

  const clearSubmit = useCallback(async () => {
    try {
      await view.submit(null);
    } catch (err) {
      console.error('Error clearing field:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([invoke('getConfig'), view.getContext()])
      .then(([data, ctx]) => {
        const cfg = data || { options: [] };
        setConfig(cfg);
        setIsIssueView(ctx?.extension?.renderContext === 'issue-view');

        const initial = getInitialSelectionState(cfg, ctx?.extension?.fieldValue);
        if (initial) {
          setSelectedL1(initial.selectedL1);
          setSelectedL2(initial.selectedL2);
          setSelectedL3(initial.selectedL3);
          setLevel2List(initial.level2List);
          setLevel3List(initial.level3List);
        }
      })
      .catch((err) => console.error('Error in initialization:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    resizeView();
    const t = setTimeout(resizeView, 100);
    return () => clearTimeout(t);
  }, [loading, selectedL1, selectedL2, selectedL3, level2List, level3List, menuOpen, resizeView]);

  const handleL1Change = useCallback(
    (option) => {
      setSelectedL1(option);
      setSelectedL2(null);
      setSelectedL3(null);
      setLevel3List([]);
      setTouched((t) => ({ ...t, l1: true }));
      setErrors((e) => ({ ...e, l1: !option, l2: false, l3: false }));

      const l1Obj = (config.options || []).find((o) => (o.id || o.label) === option?.value);
      setLevel2List(l1Obj?.children || []);

      if (!option && !isIssueView) clearSubmit();
    },
    [config.options, isIssueView, clearSubmit]
  );

  const handleL2Change = useCallback(
    (option) => {
      setSelectedL2(option);
      setSelectedL3(null);
      setTouched((t) => ({ ...t, l2: true }));
      setErrors((e) => ({ ...e, l2: !option, l3: false }));

      const l1Obj = (config.options || []).find((o) => (o.id || o.label) === selectedL1?.value);
      const l2Obj = (l1Obj?.children || []).find((o) => (o.id || o.label) === option?.value);
      setLevel3List(l2Obj?.children || []);

      if (!option && !isIssueView) clearSubmit();
    },
    [config.options, selectedL1, isIssueView, clearSubmit]
  );

  const handleL3Change = useCallback(
    (option) => {
      setSelectedL3(option);
      setTouched((t) => ({ ...t, l3: true }));
      setErrors((e) => ({ ...e, l3: !option }));

      if (!isIssueView) {
        if (selectedL1 && selectedL2 && option) {
          autoSubmit(selectedL1, selectedL2, option);
        } else if (!option) {
          clearSubmit();
        }
      }
    },
    [selectedL1, selectedL2, isIssueView, autoSubmit, clearSubmit]
  );

  const handleIssueViewSave = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      await autoSubmit(selectedL1, selectedL2, selectedL3);
    },
    [selectedL1, selectedL2, selectedL3, autoSubmit]
  );

  const l1Options = useMemo(() => formatOptions(config.options), [config.options]);
  const l2Options = useMemo(() => formatOptions(level2List), [level2List]);
  const l3Options = useMemo(() => formatOptions(level3List), [level3List]);

  const levelSelectProps = (key) => ({
    touched: touched[key],
    submitted,
    error: errors[key],
    onMenuOpen: openMenu,
    onMenuClose: () => setMenuOpen(false),
  });

  if (loading) return <Skeleton />;

  return (
    <>
      <style>{`
        body, #root { margin: 0 !important; padding: 0 !important; overflow: visible !important; }
        .form-container {
          padding: 0; margin: 0; width: 100%;
          display: flex; flex-direction: column; align-items: flex-start;
          padding-bottom: ${menuOpen ? '80px' : '0'};
          overflow: visible !important;
          transition: padding-bottom 0.2s ease-out;
        }
      `}</style>
      <div
        className="form-container"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        <form
          onSubmit={handleIssueViewSave}
          style={{
            width: '100%',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <LevelSelect
            label="Nivel 1"
            options={l1Options}
            value={selectedL1}
            onChange={handleL1Change}
            selectRef={l1Ref}
            {...levelSelectProps('l1')}
          />

          {selectedL1 && level2List.length > 0 && (
            <LevelSelect
              label="Nivel 2"
              options={l2Options}
              value={selectedL2}
              onChange={handleL2Change}
              selectRef={l2Ref}
              {...levelSelectProps('l2')}
            />
          )}

          {selectedL2 && level3List.length > 0 && (
            <LevelSelect
              label="Nivel 3"
              options={l3Options}
              value={selectedL3}
              onChange={handleL3Change}
              selectRef={l3Ref}
              {...levelSelectProps('l3')}
            />
          )}

          {isIssueView && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                type="submit"
                style={{
                  padding: '6px 14px',
                  background: COLORS.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => view.close()}
                style={{
                  padding: '6px 14px',
                  background: '#f4f5f7',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
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
