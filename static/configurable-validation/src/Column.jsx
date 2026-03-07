import React from 'react';
import { COLORS } from './utils';

/**
 * Columna de un nivel (1, 2 o 3) en la configuración: lista de ítems con acciones agregar, editar, eliminar, habilitar/deshabilitar.
 */
function Column({
  title,
  items,
  level,
  parentIds,
  selectedId,
  onSelect,
  onAdd,
  onDisable,
  onEdit,
  onDelete,
}) {
  const showAddButton = level === 1 || parentIds.length > 0;
  const sortedItems = [...items].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div
      style={{
        flex: 1,
        background: '#fff',
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 400,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.bgPanel,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, color: COLORS.text }}>{title}</h3>
        {showAddButton && (
          <button
            onClick={() => onAdd()}
            style={{
              background: COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: 3,
              padding: '4px 8px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            + Agregar
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {items.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: COLORS.textMuted,
              fontSize: 12,
            }}
          >
            {level > 1 && parentIds.length === 0
              ? 'Selecciona un nivel superior'
              : 'No hay opciones'}
          </div>
        )}
        {sortedItems.map((item) => {
          const isSelected = selectedId === item.id;
          return (
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
                background: isSelected ? COLORS.bgSelected : 'transparent',
                color: item.disabled
                  ? COLORS.disabled
                  : isSelected
                  ? COLORS.primary
                  : COLORS.text,
                border: isSelected ? `1px solid ${COLORS.primary}` : '1px solid transparent',
                transition: 'all 0.2s',
                opacity: item.disabled ? 0.7 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                    textDecoration: item.disabled ? 'line-through' : 'none',
                  }}
                >
                  {item.label}
                </span>
                {item.disabled && (
                  <span
                    style={{
                      fontSize: 10,
                      background: COLORS.bgPanel,
                      color: COLORS.textSecondary,
                      padding: '2px 6px',
                      borderRadius: 10,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    deshabilitado
                  </span>
                )}
              </div>
              <div
                style={{ display: 'flex', gap: 4, opacity: 0.6 }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
                onMouseOut={(e) => (e.currentTarget.style.opacity = 0.6)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisable(item);
                  }}
                  title={item.disabled ? 'Habilitar' : 'Deshabilitar'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.textSecondary,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {item.disabled ? '👁️‍🗨️' : '👁️'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  title="Editar"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.textSecondary,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                  title="Eliminar"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.danger,
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: '0 4px',
                  }}
                >
                  &times;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Column;
