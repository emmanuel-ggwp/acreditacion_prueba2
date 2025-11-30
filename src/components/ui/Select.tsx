'use client';

import React from 'react';
import ReactSelect, { Props as SelectProps } from 'react-select';

interface CustomSelectProps extends SelectProps {
  label: string;
  error?: string;
}

const Select: React.FC<CustomSelectProps> = ({ label, error, ...props }) => {
  const selectId = props.id || props.name || 'select-field';
  return (
    <div className="w-full">
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <ReactSelect
        inputId={selectId}
        styles={{
          control: (base, state) => ({
            ...base,
            borderColor: error ? '#ef4444' : state.isFocused ? '#4f46e5' : '#d1d5db',
            boxShadow: state.isFocused ? '0 0 0 1px #4f46e5' : 'none',
            '&:hover': {
              borderColor: state.isFocused ? '#4f46e5' : '#9ca3af',
            },
          }),
        }}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export { Select };
