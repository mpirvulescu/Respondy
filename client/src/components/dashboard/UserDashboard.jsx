import { useState, useEffect } from 'react';
import { useAuth }             from '../../context/authContext';
import { fetchUserStats, fetchUserCalls, initiateCall } from '../../api/dashboard';

export default function UserDashboard() {
  const { token, logout } = useAuth();

  const [stats, setStats]     = useState({ apiCallsUsed: 0, apiCallsLimit: 20 });
  const [calls, setCalls]     = useState([]);
  const [phone, setPhone]     = useState('');
  const [goal, setGoal]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserStats(token).then(setStats).catch(() => {});
    fetchUserCalls(token).then((d) => setCalls(d.calls ?? [])).catch(() => {});
  }, [token]);

  const handleCall = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !goal.trim()) {
      setError('Phone number and goal are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await initiateCall(token, { phoneNumber: phone, goal });
      setCalls((prev) => [data.call, ...prev]);
      setStats((prev) => ({ ...prev, apiCallsUsed: prev.apiCallsUsed + 1 }));
      setPhone('');
      setGoal('');
    } catch (err) {
      setError(err.message || 'Call failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Dashboard</h1>
        <button className="dashboard__logout" onClick={logout}>Sign out</button>
      </header>

      <section className="dashboard__stats">
        <p className="dashboard__stat">
          API calls used: <strong>{stats.apiCallsUsed}</strong> / {stats.apiCallsLimit}
        </p>
      </section>

      <section className="dashboard__new-call">
        <h2 className="dashboard__subtitle">New call</h2>
        {error && <p className="dashboard__error" role="alert">{error}</p>}
        <form className="dashboard__form" onSubmit={handleCall}>
          <label className="dashboard__label">
            Phone number
            <input className="dashboard__input" type="tel" value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              placeholder="+1 555 123 4567" />
          </label>
          <label className="dashboard__label">
            Goal
            <textarea className="dashboard__textarea" value={goal}
              onChange={(e) => { setGoal(e.target.value); setError(''); }}
              placeholder="e.g. Book an appointment for Tuesday at 2 pm" rows={3} />
          </label>
          <button className="dashboard__submit" type="submit" disabled={loading}>
            {loading ? 'Calling…' : 'Place call'}
          </button>
        </form>
      </section>

      <section className="dashboard__history">
        <h2 className="dashboard__subtitle">Call history</h2>
        {calls.length === 0
          ? <p className="dashboard__empty">No calls yet.</p>
          : (
            <ul className="dashboard__call-list">
              {calls.map((c) => (
                <li key={c.id} className="dashboard__call-item">
                  <div className="dashboard__call-meta">
                    <span>{c.phone_number}</span>
                    <time>{new Date(c.created_at).toLocaleString()}</time>
                  </div>
                  <p className="dashboard__call-goal"><strong>Goal:</strong> {c.goal}</p>
                  {c.outcome && <p className="dashboard__call-outcome"><strong>Outcome:</strong> {c.outcome}</p>}
                  {c.transcript && (
                    <details className="dashboard__call-transcript">
                      <summary>Transcript</summary>
                      <pre>{c.transcript}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
