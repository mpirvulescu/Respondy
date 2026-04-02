import { useState, useEffect } from 'react';
import { useAuth }             from '../../context/authContext';
import { fetchAdminStats, fetchInjectionLogs } from '../../api/dashboard';

export default function AdminDashboard() {
  const { token, logout } = useAuth();

  const [stats, setStats]       = useState({ totalUsers: 0, totalCalls: 0, callsByUser: [] });
  const [injections, setInjections] = useState([]);

  useEffect(() => {
    fetchAdminStats(token).then(setStats).catch(() => {});
    fetchInjectionLogs(token).then((d) => setInjections(d.logs ?? [])).catch(() => {});
  }, [token]);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Admin Dashboard</h1>
        <button className="dashboard__logout" onClick={logout}>Sign out</button>
      </header>

      <section className="dashboard__stats">
        <p className="dashboard__stat">Total users: <strong>{stats.totalUsers}</strong></p>
        <p className="dashboard__stat">Total API calls: <strong>{stats.totalCalls}</strong></p>
      </section>

      <section className="dashboard__users">
        <h2 className="dashboard__subtitle">Usage by user</h2>
        {stats.callsByUser.length === 0
          ? <p className="dashboard__empty">No users yet.</p>
          : (
            <table className="dashboard__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>API calls used</th>
                </tr>
              </thead>
              <tbody>
                {stats.callsByUser.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.api_calls_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </section>

      <section className="dashboard__injections">
        <h2 className="dashboard__subtitle">Prompt-injection attempts</h2>
        {injections.length === 0
          ? <p className="dashboard__empty">No flagged prompts.</p>
          : (
            <table className="dashboard__table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Input text</th>
                  <th>Classification</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {injections.map((log) => (
                  <tr key={log.id}>
                    <td>{log.user_id}</td>
                    <td className="dashboard__cell--wrap">{log.input_text}</td>
                    <td>{log.classification}</td>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </section>
    </div>
  );
}
