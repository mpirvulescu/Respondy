import {useState} from 'react';

export function useAuthForm(submitFn, initial, validate) {
   const [
      fields,
      setFields,
   ] = useState(initial);
   const [
      error,
      setError,
   ] = useState('');
   const [
      loading,
      setLoading,
   ] = useState(false);

   const handleChange = (e) => {
      setFields((prev) => ({...prev, [e.target.name]: e.target.value}));
      setError('');
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      if (validate) {
         const err = validate(fields);
         if (err) {
            setError(err);
            return;
         }
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

   return {fields, error, loading, handleChange, handleSubmit};
}
