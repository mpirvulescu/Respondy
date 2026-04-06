import {useState} from 'react';
import {resetPassword} from '../../api/auth';

export default function ResetPasswordForm({token, onDone}) {
   const [
      password,
      setPassword,
   ] = useState('');
   const [
      confirm,
      setConfirm,
   ] = useState('');
   const [
      error,
      setError,
   ] = useState('');
   const [
      success,
      setSuccess,
   ] = useState('');
   const [
      loading,
      setLoading,
   ] = useState(false);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      if (!password || !confirm) {
         setError('Both fields are required');
         return;
      }
      if (password.length < 8) {
         setError('Password must be at least 8 characters');
         return;
      }
      if (password !== confirm) {
         setError('Passwords do not match');
         return;
      }

      setLoading(true);
      try {
         const data = await resetPassword(token, password);
         setSuccess(data.message);
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   };

   return (
      <form className='auth-form' onSubmit={handleSubmit} noValidate>
         <h2 className='auth-form__title'>Reset password</h2>
         {error && (
            <p className='auth-form__error' role='alert'>
               {error}
            </p>
         )}
         {success ? (
            <>
               <p className='auth-form__success' role='status'>
                  {success}
               </p>
               <button
                  className='auth-form__link'
                  type='button'
                  onClick={onDone}
               >
                  Back to sign in
               </button>
            </>
         ) : (
            <>
               <label className='auth-form__label'>
                  New password
                  <input
                     className='auth-form__input'
                     type='password'
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     placeholder='Min. 8 characters'
                     autoComplete='new-password'
                  />
               </label>
               <label className='auth-form__label'>
                  Confirm password
                  <input
                     className='auth-form__input'
                     type='password'
                     value={confirm}
                     onChange={(e) => setConfirm(e.target.value)}
                     placeholder='••••••••'
                     autoComplete='new-password'
                  />
               </label>
               <button
                  className='auth-form__submit'
                  type='submit'
                  disabled={loading}
               >
                  {loading ? 'Resetting\u2026' : 'Reset password'}
               </button>
               <button
                  className='auth-form__link'
                  type='button'
                  onClick={onDone}
               >
                  Back to sign in
               </button>
            </>
         )}
      </form>
   );
}
