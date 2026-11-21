import { HttpError } from './errors.js';

export function validateBody(rules) {
  return (req, res, next) => {
    const errors = [];
    const allowedFields = new Set(Object.keys(rules));
    for (const field of Object.keys(req.body || {})) {
      if (!allowedFields.has(field)) errors.push(`${field} is not an accepted field`);
    }
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body?.[field];
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      if (value === undefined || value === null || value === '') continue;
      if (rule.type === 'string' && (typeof value !== 'string' || !value.trim())) errors.push(`${field} must be a non-empty string`);
      if (rule.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < (rule.min ?? 0) || (rule.integer && !Number.isInteger(Number(value))))) errors.push(`${field} must be a ${rule.integer ? 'whole number' : 'number'}${rule.min !== undefined ? ` greater than or equal to ${rule.min}` : ''}`);
      if (rule.type === 'enum' && !rule.values.includes(value)) errors.push(`${field} must be one of: ${rule.values.join(', ')}`);
      if (rule.type === 'array') {
        if (!Array.isArray(value) || (rule.minLength && value.length < rule.minLength)) errors.push(`${field} must be a list${rule.minLength ? ` with at least ${rule.minLength} item(s)` : ''}`);
        else if (rule.items === 'string' && value.some(item => typeof item !== 'string' || !item.trim())) errors.push(`${field} must contain only non-empty text items`);
      }
      if (rule.type === 'date' && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) errors.push(`${field} must be a valid date in YYYY-MM-DD format`);
      if (rule.type === 'phone' && (typeof value !== 'string' || !/^[+()\-\s\d]{7,20}$/.test(value))) errors.push(`${field} must be a valid phone number`);
      if (rule.type === 'email' && (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) errors.push(`${field} must be a valid email address`);
    }
    if (errors.length) return next(new HttpError(400, 'Validation failed', errors));
    next();
  };
}

export function validateId(req, res, next) {
  if (!/^[a-zA-Z0-9_-]+$/.test(req.params.id || '')) return next(new HttpError(400, 'Invalid resource ID'));
  next();
}
