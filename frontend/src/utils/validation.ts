import * as yup from 'yup';

// Lead validation schema
export const leadValidationSchema = yup.object({
  url: yup
    .string()
    .url('Please enter a valid URL')
    .required('URL is required'),
  companyName: yup
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name cannot exceed 100 characters')
    .required('Company name is required'),
  domain: yup
    .string()
    .min(3, 'Domain must be at least 3 characters')
    .max(100, 'Domain cannot exceed 100 characters')
    .matches(
      /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
      'Please enter a valid domain (e.g., example.com)'
    )
    .required('Domain is required'),
  industry: yup
    .string()
    .min(2, 'Industry must be at least 2 characters')
    .max(50, 'Industry cannot exceed 50 characters')
    .required('Industry is required'),
  campaignId: yup
    .string()
    .required('Campaign is required'),
  status: yup
    .string()
    .oneOf(['RAW', 'SCORED', 'QUALIFIED', 'DELIVERED', 'REJECTED'], 'Invalid status')
    .default('RAW'),
  assignedToId: yup
    .string()
    .optional(),
  assignedTeamId: yup
    .string()
    .optional()
});

// Validation helper function
export const validateField = async (
  schema: yup.ObjectSchema<any>,
  field: string,
  value: any
): Promise<string | null> => {
  try {
    await schema.validateAt(field, { [field]: value });
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return error.message;
    }
    return 'Validation error';
  }
};

// Real-time validation helper
export const validateForm = async (
  schema: yup.ObjectSchema<any>,
  values: any
): Promise<{ [key: string]: string }> => {
  try {
    await schema.validate(values, { abortEarly: false });
    return {};
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: { [key: string]: string } = {};
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return errors;
    }
    return { general: 'Validation error' };
  }
}; 