// ============================================================
// src/api/dashboard.js
// Dashboard HTTP calls — mirrors the style of api/auth.js.
//
// Backend dev — implement these endpoints:
//
//   GET /api/user/stats
//     Headers: Authorization: Bearer <token>
//     Success: { apiCallsUsed: number, apiCallsLimit: number }
//
//   GET /api/user/calls
//     Headers: Authorization: Bearer <token>
//     Success: { calls: [{ id, phone_number, goal, transcript, outcome, created_at }] }
//
//   POST /api/user/calls
//     Headers: Authorization: Bearer <token>
//     Body:    { phoneNumber: string, goal: string }
//     Success: { call: { id, phone_number, goal, transcript, outcome, created_at } }
//
//   GET /api/admin/stats
//     Headers: Authorization: Bearer <token>
//     Success: { totalUsers, totalCalls, callsByUser: [{ id, name, email, api_calls_used }] }
//
//   GET /api/admin/injections
//     Headers: Authorization: Bearer <token>
//     Success: { logs: [{ id, user_id, input_text, classification, created_at }] }
// ============================================================

const BASE_URL = '/api';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── User endpoints ──────────────────────────────────────────

export async function fetchUserStats(token) {
  const res = await fetch(`${BASE_URL}/user/stats`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load stats');
  return data;
}

export async function fetchUserCalls(token) {
  const res = await fetch(`${BASE_URL}/user/calls`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load calls');
  return data;
}

export async function initiateCall(token, { phoneNumber, goal }) {
  const res = await fetch(`${BASE_URL}/user/calls`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ phoneNumber, goal }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to initiate call');
  return data;
}

// ── Admin endpoints ─────────────────────────────────────────

export async function fetchAdminStats(token) {
  const res = await fetch(`${BASE_URL}/admin/stats`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load admin stats');
  return data;
}

export async function fetchInjectionLogs(token) {
  const res = await fetch(`${BASE_URL}/admin/injections`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load injection logs');
  return data;
}
