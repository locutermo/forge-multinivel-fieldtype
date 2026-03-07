import React from 'react';
import { COLORS } from './utils';

/**
 * Modal reutilizable para formularios de la configuración (añadir, editar, eliminar, habilitar/deshabilitar).
 */
function Modal({ title, children, onClose, onSubmit, submitLabel }) {
  const isDanger = submitLabel === 'Eliminar';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: COLORS.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          width: 400,
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0' }}>{title}</h3>
        <form onSubmit={onSubmit}>
          {children}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                color: COLORS.textSecondary,
                fontWeight: 500,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: isDanger ? COLORS.dangerBg : COLORS.primary,
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Modal;
