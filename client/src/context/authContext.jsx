import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser, registerUser, logoutUser } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));

  const saveSession = useCallback(({ user, token }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials);
    saveSession(data);
    return data;
  }, [saveSession]);

  const register = useCallback(async (details) => {
    const data = await registerUser(details);
    saveSession(data);
    return data;
  }, [saveSession]);

  const logout = useCallback(async () => {
    if (token) await logoutUser(token).catch(() => {});
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}