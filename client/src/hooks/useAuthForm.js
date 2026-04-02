// ============================================================
// src/hooks/useAuthForm.js
// Reusable hook for auth form state, validation, and submission.
// Used by both LoginForm and RegisterForm.
// ============================================================
 
import { useState } from 'react';
 
/**
 * @param {Function} submitFn  - async fn called with form fields on submit
 * @param {Object}   initial   - initial field values
 * @param {Function} validate  - optional (fields) => errorString | null
 */
export function useAuthForm(submitFn, initial, validate) {
  const [fields, setFields]   = useState(initial);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
 
  const handleChange = (e) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate) {
      const err = validate(fields);
      if (err) { setError(err); return; }
    }
    setLoading(true);
    try {
      await submitFn(fields);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
 
  return { fields, error, loading, handleChange, handleSubmit };
}