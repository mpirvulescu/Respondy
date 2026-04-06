import {useState, useEffect} from 'react';
import LoginForm from '../components/auth/loginForm';
import RegisterForm from '../components/auth/registerForm';
import ResetPasswordForm from '../components/auth/resetPasswordForm';

export default function AuthPage() {
   const [
      tab,
      setTab,
   ] = useState('login');
   const [
      resetToken,
      setResetToken,
   ] = useState(null);

   // Check URL for reset token on mount
   useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token && window.location.pathname === '/reset-password') {
         setResetToken(token);
         setTab('reset');
      }
   }, []);

   const handleResetDone = () => {
      // Clear the URL and go back to login
      window.history.replaceState({}, '', '/');
      setResetToken(null);
      setTab('login');
   };

   if (tab === 'reset' && resetToken) {
      return (
         <div className='auth-page'>
            <div className='auth-card'>
               <ResetPasswordForm token={resetToken} onDone={handleResetDone} />
            </div>
         </div>
      );
   }

   return (
      <div className='auth-page'>
         <div className='auth-card'>
            <div className='auth-tabs' role='tablist'>
               <button
                  role='tab'
                  aria-selected={tab === 'login'}
                  className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
                  onClick={() => setTab('login')}
               >
                  Sign in
               </button>
               <button
                  role='tab'
                  aria-selected={tab === 'register'}
                  className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
                  onClick={() => setTab('register')}
               >
                  Register
               </button>
            </div>
            {tab === 'login' ? <LoginForm /> : <RegisterForm />}
         </div>
      </div>
   );
}
