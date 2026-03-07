import React from 'react';
import Select from '@atlaskit/select';
import { LABEL_STYLE, SELECT_STYLES, COLORS } from './utils';

function LevelSelect({
  label,
  options,
  value,
  onChange,
  selectRef,
  error,
  touched,
  submitted,
  onMenuOpen,
  onMenuClose,
}) {
  const showError = (submitted || touched) && error;

  return (
    <div style={{ marginBottom: 12, width: '100%' }}>
      <label style={LABEL_STYLE}>
        {label} <span style={{ color: COLORS.error }}>*</span>
      </label>
      <Select
        ref={selectRef}
        options={options}
        value={value}
        onChange={onChange}
        onFocus={onMenuOpen}
        onMenuOpen={onMenuOpen}
        onMenuClose={onMenuClose}
        placeholder="-- Seleccionar --"
        isClearable
        styles={SELECT_STYLES}
        menuPosition="absolute"
        menuPlacement="bottom"
        menuShouldScrollIntoView={false}
        maxMenuHeight={200}
        appearance={showError ? 'error' : 'default'}
      />
      {showError && (
        <p style={{ color: COLORS.error, fontSize: 11, margin: '4px 0 0 0' }}>
          Este campo es obligatorio
        </p>
      )}
    </div>
  );
}

export default LevelSelect;
