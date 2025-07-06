import React from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  touched?: boolean;
  children: React.ReactNode;
  required?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  touched,
  children,
  required = false
}) => {
  const showError = error && touched;

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {showError && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormField; 