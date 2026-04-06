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
//     Body:    { to: string, goal: string }
//     Success: { callSid, status, goal, guardEnabled }
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
   if (!res.ok)
      throw new Error(data.message || data.error || 'Failed to load stats');
   return data;
}

export async function fetchUserCalls(token) {
   const res = await fetch(`${BASE_URL}/user/calls`, {
      headers: authHeaders(token),
   });
   const data = await res.json();
   if (!res.ok)
      throw new Error(data.message || data.error || 'Failed to load calls');
   return data;
}

export async function initiateCall(token, {to, goal}) {
   const res = await fetch(`${BASE_URL}/user/calls`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({to, goal}),
   });
   const data = await res.json();
   if (!res.ok)
      throw new Error(data.message || data.error || 'Failed to initiate call');
   return data;
}

// ── Admin endpoints ─────────────────────────────────────────

export async function fetchAdminStats(token) {
   const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: authHeaders(token),
   });
   const data = await res.json();
   if (!res.ok)
      throw new Error(
         data.message || data.error || 'Failed to load admin stats',
      );
   return data;
}

export async function fetchInjectionLogs(token) {
   const res = await fetch(`${BASE_URL}/admin/injections`, {
      headers: authHeaders(token),
   });
   const data = await res.json();
   if (!res.ok)
      throw new Error(
         data.message || data.error || 'Failed to load injection logs',
      );
   return data;
}

export async function fetchSystemPrompt(token) {
   const res = await fetch(`${BASE_URL}/admin/system-prompt`, {
      headers: authHeaders(token),
   });
   const data = await res.json();
   if (!res.ok)
      throw new Error(
         data.message || data.error || 'Failed to load system prompt',
      );
   return data;
}

export async function updateSystemPrompt(token, systemPrompt) {
   const res = await fetch(`${BASE_URL}/admin/system-prompt`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({systemPrompt}),
   });
   const data = await res.json();
   if (!res.ok)
      throw new Error(
         data.message || data.error || 'Failed to update system prompt',
      );
   return data;
}
