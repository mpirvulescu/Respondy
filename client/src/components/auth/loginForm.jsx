import {useState} from 'react';
import {useAuth} from '../../context/authContext';
import {useAuthForm} from '../../hooks/useAuthForm';
import {forgotPassword} from '../../api/auth';

const INITIAL = {email: '', password: ''};

const validate = ({email, password}) => {
   if (!email || !password) return 'Email and password are required';
   if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address';
   return null;
};

export default function LoginForm({onSuccess}) {
   const {login} = useAuth();
   const {fields, error, loading, handleChange, handleSubmit} = useAuthForm(
      async (f) => {
         await login(f);
         onSuccess?.();
      },
      INITIAL,
      validate,
   );

   const [
      resetMsg,
      setResetMsg,
   ] = useState('');
   const [
      resetError,
      setResetError,
   ] = useState('');
   const [
      resetLoading,
      setResetLoading,
   ] = useState(false);

   const handleForgot = async () => {
      setResetMsg('');
      setResetError('');

      if (!fields.email || !/\S+@\S+\.\S+/.test(fields.email)) {
         setResetError('Enter your email address above first');
         return;
      }

      setResetLoading(true);
      try {
         const data = await forgotPassword(fields.email);
         setResetMsg(data.message);
      } catch (err) {
         setResetError(err.message);
      } finally {
         setResetLoading(false);
      }
   };

   return (
      <form className='auth-form' onSubmit={handleSubmit} noValidate>
         <h2 className='auth-form__title'>Sign in</h2>
         {error && (
            <p className='auth-form__error' role='alert'>
               {error}
            </p>
         )}
         {resetError && (
            <p className='auth-form__error' role='alert'>
               {resetError}
            </p>
         )}
         {resetMsg && (
            <p className='auth-form__success' role='status'>
               {resetMsg}
            </p>
         )}
         <label className='auth-form__label'>
            Email
            <input
               className='auth-form__input'
               type='email'
               name='email'
               value={fields.email}
               onChange={handleChange}
               placeholder='you@example.com'
               autoComplete='email'
            />
         </label>
         <label className='auth-form__label'>
            Password
            <input
               className='auth-form__input'
               type='password'
               name='password'
               value={fields.password}
               onChange={handleChange}
               placeholder='••••••••'
               autoComplete='current-password'
            />
         </label>
         <button className='auth-form__submit' type='submit' disabled={loading}>
            {loading ? 'Signing in\u2026' : 'Sign in'}
         </button>
         <button
            className='auth-form__link'
            type='button'
            onClick={handleForgot}
            disabled={resetLoading}
         >
            {resetLoading ? 'Sending\u2026' : 'Forgot password?'}
         </button>
      </form>
   );
}
