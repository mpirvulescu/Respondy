import { useAuth }     from '../../context/authContext';
import { useAuthForm } from '../../hooks/useAuthForm';

const INITIAL = { email: '', password: '' };

const validate = ({ email, password }) => {
  if (!email || !password)          return 'Email and password are required';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address';
  return null;
};

export default function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const { fields, error, loading, handleChange, handleSubmit } = useAuthForm(
    async (f) => { await login(f); onSuccess?.(); },
    INITIAL,
    validate,
  );

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-form__title">Sign in</h2>
      {error && <p className="auth-form__error" role="alert">{error}</p>}
      <label className="auth-form__label">
        Email
        <input className="auth-form__input" type="email" name="email"
          value={fields.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
      </label>
      <label className="auth-form__label">
        Password
        <input className="auth-form__input" type="password" name="password"
          value={fields.password} onChange={handleChange} placeholder="••••••••" autoComplete="current-password" />
      </label>
      <button className="auth-form__submit" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}