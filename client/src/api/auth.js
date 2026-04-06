// ============================================================
// src/api/auth.js
// All auth HTTP calls live here.
//
// Backend dev - implement these 3 endpoints:
//
//   POST /api/auth/register
//     Body:    { name, email, password }
//     Success: { user: { id, name, email }, token: string }
//     Error:   { message: string }
//
//   POST /api/auth/login
//     Body:    { email, password }
//     Success: { user: { id, name, email }, token: string }
//     Error:   { message: string }
//
//   POST /api/auth/logout
//     Headers: Authorization: Bearer <token>
//     Success: { message: string }
//     Error:   { message: string }
// ============================================================

const BASE_URL = '/api/auth'; // TODO (backend): confirm base path

export async function registerUser({name, email, password}) {
   const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, email, password}),
   });
   const data = await res.json();
   if (!res.ok) throw new Error(data.message || 'Registration failed');
   return data; // { user, token }
}

export async function loginUser({email, password}) {
   const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password}),
   });
   const data = await res.json();
   if (!res.ok) throw new Error(data.message || 'Login failed');
   return data; // { user, token }
}

export async function forgotPassword(email) {
   const res = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email}),
   });
   const data = await res.json();
   if (!res.ok) throw new Error(data.message || 'Request failed');
   return data;
}

export async function resetPassword(token, password) {
   const res = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token, password}),
   });
   const data = await res.json();
   if (!res.ok) throw new Error(data.message || 'Reset failed');
   return data;
}

export async function logoutUser(token) {
   const res = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`},
   });
   const data = await res.json();
   if (!res.ok) throw new Error(data.message || 'Logout failed');
   return data;
}
