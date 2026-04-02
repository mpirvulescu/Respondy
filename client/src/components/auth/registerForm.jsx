import { useAuth }     from '../../context/AuthContext';
import { useAuthForm } from '../../hooks/useAuthForm';

const INITIAL = { name: '', email: '', password: '', confirm: '' };

const validate = ({ name, email, password, confirm }) => {
  if (!name || !email || !password) return 'All fields are required';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address';
  if (password.length < 8)         return 'Password must be at least 8 characters';
  if (password !== confirm)        return 'Passwords do not match';
  return null;
};

export default function RegisterForm({ onSuccess }) {
  const { register } = useAuth();
  const { fields, error, loading, handleChange, handleSubmit } = useAuthForm(
    async (f) => { await register(f); onSuccess?.(); },
    INITIAL,
    validate,
  );

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-form__title">Create account</h2>
      {error && <p className="auth-form__error" role="alert">{error}</p>}
      <label className="auth-form__label">
        Name
        <input className="auth-form__input" type="text" name="name"
          value={fields.name} onChange={handleChange} placeholder="Your name" autoComplete="name" />
      </label>
      <label className="auth-form__label">
        Email
        <input className="auth-form__input" type="email" name="email"
          value={fields.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
      </label>
      <label className="auth-form__label">
        Password
        <input className="auth-form__input" type="password" name="password"
          value={fields.password} onChange={handleChange} placeholder="Min. 8 characters" autoComplete="new-password" />
      </label>
      <label className="auth-form__label">
        Confirm password
        <input className="auth-form__input" type="password" name="confirm"
          value={fields.confirm} onChange={handleChange} placeholder="••••••••" autoComplete="new-password" />
      </label>
      <button className="auth-form__submit" type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}