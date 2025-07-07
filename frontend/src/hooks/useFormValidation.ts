import { useState, useCallback } from 'react';
import { ObjectSchema } from 'yup';
import { validateField, validateForm } from '../utils/validation';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface ValidationErrors {
  [key: string]: string;
}

interface UseFormValidationReturn {
  errors: ValidationErrors;
  isValid: boolean;
  validateField: (name: string, value: unknown) => string | null;
  validateForm: (data: Record<string, unknown>) => boolean;
  reset: () => void;
}

interface UseFormValidationProps<T extends Record<string, any>> {
  schema: ObjectSchema<T>;
  initialValues: T;
}

interface ValidationState<T extends Record<string, any>> {
  values: T;
  errors: { [key: string]: string };
  touched: { [key: string]: boolean };
  isValid: boolean;
  isSubmitting: boolean;
}

export const useFormValidation = <T extends Record<string, any>>({
  schema,
  initialValues
}: UseFormValidationProps<T>) => {
  const [state, setState] = useState<ValidationState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: false,
    isSubmitting: false
  });

  // Validate a single field
  const validateSingleField = useCallback(
    async (field: keyof T, value: any) => {
      try {
        await validateField(schema, field as string, value);
        return null;
      } catch (error) {
        if (error instanceof Error) {
          return error.message;
        }
        return 'Validation error';
      }
    },
    [schema]
  );

  // Handle field change with validation
  const handleChange = useCallback(
    async (field: keyof T, value: any) => {
      const newValues = { ...state.values, [field]: value };
      const newTouched = { ...state.touched, [field]: true };
      
      // Validate the field
      const fieldError = await validateSingleField(field, value);
      const newErrors = { ...state.errors };
      
      if (fieldError) {
        newErrors[field as string] = fieldError;
      } else {
        delete newErrors[field as string];
      }

      setState(prev => ({
        ...prev,
        values: newValues,
        touched: newTouched,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      }));
    },
    [state.values, state.errors, state.touched, validateSingleField]
  );

  // Handle field blur
  const handleBlur = useCallback(
    async (field: keyof T) => {
      const value = state.values[field];
      const fieldError = await validateSingleField(field, value);
      
      setState(prev => {
        const newErrors = { ...prev.errors };
        if (fieldError) {
          newErrors[field as string] = fieldError;
        } else {
          delete newErrors[field as string];
        }
        
        return {
          ...prev,
          touched: { ...prev.touched, [field as string]: true },
          errors: newErrors
        };
      });
    },
    [state.values, validateSingleField]
  );

  // Validate entire form
  const validateAll = useCallback(async () => {
    const errors = await validateForm(schema, state.values);
    setState(prev => ({
      ...prev,
      errors,
      isValid: Object.keys(errors).length === 0
    }));
    return errors;
  }, [schema, state.values]);

  // Set form as submitting
  const setSubmitting = useCallback((submitting: boolean) => {
    setState(prev => ({ ...prev, isSubmitting: submitting }));
  }, []);

  // Reset form
  const reset = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isValid: false,
      isSubmitting: false
    });
  }, [initialValues]);

  // Set values
  const setValues = useCallback((values: Partial<T>) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, ...values }
    }));
  }, []);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isValid: state.isValid,
    isSubmitting: state.isSubmitting,
    handleChange,
    handleBlur,
    validateAll,
    setSubmitting,
    reset,
    setValues
  };
}; 