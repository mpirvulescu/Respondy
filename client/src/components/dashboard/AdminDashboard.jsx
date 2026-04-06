import { useState, useEffect, useMemo } from 'react';
import { useAuth }                      from '../../context/authContext';
import { fetchAdminStats, fetchInjectionLogs } from '../../api/dashboard';

function StatusBadge({ status }) {
  const s = (status || 'pending').toLowerCase().replace(/\s+/g, '-');
  return <span className={`status-badge status-badge--${s}`}>{status || 'Pending'}</span>;
}

function RoleBadge({ role }) {
  const r = (role || 'user').toLowerCase();
  return <span className={`badge--role badge--role-${r}`}>{r}</span>;
}

const TABS = [
  { id: 'overview', label: 'Overview',  icon: '\u{1F4CA}' },
  { id: 'users',    label: 'Users',     icon: '\u{1F465}' },
  { id: 'calls',    label: 'Calls',     icon: '\u{1F4DE}' },
  { id: 'security', label: 'Security',  icon: '\u{1F6E1}\uFE0F' },
];

export default function AdminDashboard() {
  const { token, user, logout } = useAuth();

  const [stats, setStats]           = useState({ totalUsers: 0, totalCalls: 0, callsByUser: [] });
  const [injections, setInjections] = useState([]);
  const [activeTab, setActiveTab]   = useState('overview');

  useEffect(() => {
    fetchAdminStats(token).then(setStats).catch(() => {});
    fetchInjectionLogs(token).then((d) => setInjections(d.logs ?? [])).catch(() => {});
  }, [token]);

  const callCounts = useMemo(() => {
    const counts = { completed: 0, failed: 0, pending: 0, inProgress: 0, total: 0 };
    if (stats.callsByUser) {
      for (const u of stats.callsByUser) {
        counts.total += u.api_calls_used || 0;
      }
    }
    counts.total = stats.totalCalls || counts.total;
    return counts;
  }, [stats]);

  const allCalls = useMemo(() => {
    return stats.callsByUser?.flatMap((u) =>
      (u.calls || []).map((c) => ({ ...c, userName: u.name, userEmail: u.email }))
    ) || [];
  }, [stats]);

  return (
    <>
      {/* ── Nav Bar ── */}
      <nav className="nav-bar">
        <div className="nav-logo">
          <span className="nav-logo__icon">&#128222;</span>
          Respondy
          <span className="badge--admin">Admin</span>
        </div>
        <div className="nav-actions">
          <span className="nav-user">{user?.name || user?.email}</span>
          <button className="btn btn--outline" onClick={logout}>Sign out</button>
        </div>
      </nav>

      <div className="dashboard">
        {/* ── Page Header ── */}
        <div className="page-header">
          <h1 className="page-header__title">Admin Dashboard</h1>
          <p className="page-header__subtitle">Monitor platform usage and security</p>
        </div>

        {/* ── Stats Grid (4 cards) ── */}
        <div className="stats-grid stats-grid--4col section">
          <div className="card stat-card">
            <div className="stat-card__icon stat-card__icon--purple">&#128101;</div>
            <div className="stat-card__value">{stats.totalUsers}</div>
            <div className="stat-card__label">Total Users</div>
          </div>
          <div className="card stat-card">
            <div className="stat-card__icon stat-card__icon--blue">&#9889;</div>
            <div className="stat-card__value">{stats.totalCalls}</div>
            <div className="stat-card__label">Total Calls</div>
          </div>
          <div className="card stat-card">
            <div className="stat-card__icon stat-card__icon--green">&#10004;&#65039;</div>
            <div className="stat-card__value">{callCounts.completed}</div>
            <div className="stat-card__label">Completed</div>
          </div>
          <div className="card stat-card">
            <div className="stat-card__icon stat-card__icon--red">&#128737;&#65039;</div>
            <div className="stat-card__value">{injections.length}</div>
            <div className="stat-card__label">Injections Blocked</div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab${activeTab === t.id ? ' tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        <div className={`tab-panel${activeTab === 'overview' ? ' tab-panel--active' : ''}`}>
          <div className="overview-grid">
            {/* Call Status Breakdown */}
            <div className="card">
              <div className="card__header">
                <div className="card__title">Call Status Breakdown</div>
              </div>
              <div className="card__content">
                {[
                  { label: 'Completed',   color: 'green',  count: callCounts.completed },
                  { label: 'Failed',      color: 'red',    count: callCounts.failed },
                  { label: 'Pending',     color: 'yellow', count: callCounts.pending },
                  { label: 'In Progress', color: 'blue',   count: callCounts.inProgress },
                ].map((row) => (
                  <div key={row.label} className="breakdown-row">
                    <div className="breakdown-row__left">
                      <span className={`summary-row__dot summary-row__dot--${row.color}`}></span>
                      {row.label}
                    </div>
                    <div className="breakdown-row__right">
                      <div className="breakdown-row__bar">
                        <div
                          className={`breakdown-row__bar-fill breakdown-row__bar-fill--${row.color}`}
                          style={{ width: `${callCounts.total > 0 ? (row.count / callCounts.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="breakdown-row__count">{row.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Summary */}
            <div className="card">
              <div className="card__header">
                <div className="card__title">Security Summary</div>
              </div>
              <div className="card__content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="alert alert--danger">
                  <span className="alert__icon">&#9888;&#65039;</span>
                  <div className="alert__text">
                    <div className="alert__title">{injections.length} Injection Attempt{injections.length !== 1 ? 's' : ''}</div>
                    <div className="alert__description">All attempts have been logged and blocked</div>
                  </div>
                </div>
                <div className="alert alert--success">
                  <span className="alert__icon">&#128737;&#65039;</span>
                  <div className="alert__text">
                    <div className="alert__title">Prompt Guard Active</div>
                    <div className="alert__description">ProtectAI/deberta-v3-base-prompt-injection-v2</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ��─ Users Tab ── */}
        <div className={`tab-panel${activeTab === 'users' ? ' tab-panel--active' : ''}`}>
          <div className="card">
            <div className="card__content--flush">
              {stats.callsByUser.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">&#128101;</div>
                  <div className="empty-state__title">No users yet</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>API Calls</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.callsByUser.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="table__user-cell">
                              <span className="table__user-name">{u.name}</span>
                              <span className="table__user-email">{u.email}</span>
                            </div>
                          </td>
                          <td><RoleBadge role={u.role} /></td>
                          <td>
                            <div className="mini-bar">
                              <div className="mini-bar__track">
                                <div
                                  className="mini-bar__fill"
                                  style={{ width: `${Math.min((u.api_calls_used / 20) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="mini-bar__text">{u.api_calls_used}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Calls Tab ── */}
        <div className={`tab-panel${activeTab === 'calls' ? ' tab-panel--active' : ''}`}>
          <div className="card">
            <div className="card__content--flush">
              {allCalls.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">&#128222;</div>
                  <div className="empty-state__title">No calls recorded</div>
                  <div className="empty-state__text">Calls will appear here once users start making them</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Phone</th>
                        <th>Goal</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCalls.map((c, i) => (
                        <tr key={c.id || i}>
                          <td>{c.phone_number || c.to || '—'}</td>
                          <td className="table__cell--wrap">{c.goal || '—'}</td>
                          <td><StatusBadge status={c.status} /></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Security Tab ���─ */}
        <div className={`tab-panel${activeTab === 'security' ? ' tab-panel--active' : ''}`}>
          {injections.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div className="empty-state__icon" style={{ color: '#22c55e' }}>&#128737;&#65039;</div>
                <div className="empty-state__title">No injection attempts detected</div>
                <div className="empty-state__text">The platform is clean.</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="card__description" style={{ marginBottom: 16 }}>
                {injections.length} prompt injection attempt{injections.length !== 1 ? 's' : ''} detected
              </div>
              {injections.map((log) => (
                <div key={log.id} className="injection-card">
                  <div className="injection-card__header">
                    <span className="status-badge status-badge--failed">{log.classification || 'INJECTION'}</span>
                    {log.score != null && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                        Score: {log.score}
                      </span>
                    )}
                  </div>
                  <div className="injection-card__text">{log.input_text}</div>
                  <div className="injection-card__meta">
                    User #{log.user_id} &middot; {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
