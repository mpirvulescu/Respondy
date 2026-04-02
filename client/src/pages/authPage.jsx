import { useState }  from 'react';
import LoginForm     from '../components/auth/loginForm';
import RegisterForm  from '../components/auth/registerForm';

export default function AuthPage(/* { onSuccess } */) {
  const [tab, setTab] = useState('login');

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'login'}
            className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => setTab('login')}>Sign in</button>
          <button role="tab" aria-selected={tab === 'register'}
            className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => setTab('register')}>Register</button>
        </div>
        {tab === 'login' ? <LoginForm /* onSuccess={onSuccess} */ /> : <RegisterForm /* onSuccess={onSuccess} */ />}
      </div>
    </div>
  );
}