import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { teacherLogin, teacherRegister, getStudents, getAttendance, getDefaulters } from '../api';

// ─── Auth Form ────────────────────────────────────────────────────────────────
function AuthForm({ onLogin }) {
  const [mode,     setMode]     = useState('login');  // 'login' | 'register'
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState(null); // { type, text }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === 'register') {
        await teacherRegister({ name, email, password });
        setMsg({ type: 'success', text: 'Registered! Please log in.' });
        setMode('login');
      } else {
        const res = await teacherLogin({ email, password });
        localStorage.setItem('teacher_token', res.data.access_token);
        localStorage.setItem('teacher_name',  res.data.name);
        onLogin(res.data.name);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Authentication failed';
      setMsg({ type: 'error', text: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>🎓</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>
          Teacher Portal
        </div>
        <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: 4 }}>
          Manage students, attendance & defaulters
        </div>
      </div>

      {/* Toggle */}
      <div className="auth-toggle">
        <button
          id="tab-login"
          className={`auth-toggle-btn ${mode === 'login' ? 'active' : ''}`}
          onClick={() => setMode('login')}
          type="button"
        >
          Login
        </button>
        <button
          id="tab-register"
          className={`auth-toggle-btn ${mode === 'register' ? 'active' : ''}`}
          onClick={() => setMode('register')}
          type="button"
        >
          Register
        </button>
      </div>

      {msg && (
        <div className={`toast toast-${msg.type}`} style={{ marginBottom: 16 }}>
          {msg.type === 'success' ? '✅' : '⚠️'} {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label" htmlFor="t-name">Full Name</label>
            <input
              id="t-name" className="form-input" placeholder="Dr. Jane Smith"
              value={name} onChange={(e) => setName(e.target.value)} required
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="t-email">Email</label>
          <input
            id="t-email" type="email" className="form-input" placeholder="teacher@college.edu"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="t-password">Password</label>
          <input
            id="t-password" type="password" className="form-input" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
        </div>
        <button
          id="btn-auth-submit"
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading}
          style={{ marginTop: 6 }}
        >
          {loading ? <><span className="spinner" /> {mode === 'login' ? 'Logging in…' : 'Registering…'}</> : mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>
    </div>
  );
}

// ─── Dashboard Panels ────────────────────────────────────────────────────────
function Dashboard({ teacherName, onLogout }) {
  const [activeTab,   setActiveTab]   = useState('students');
  const [students,    setStudents]    = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [defaulters,  setDefaulters]  = useState([]);
  const [loading,     setLoading]     = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, d] = await Promise.all([getStudents(), getAttendance(), getDefaulters()]);
      setStudents(s.data);
      setAttendance(a.data);
      setDefaulters(d.data);
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700 }}>
            Welcome, {teacherName} 👋
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: 2 }}>
            {students.length} students &nbsp;·&nbsp; {attendance.length} attendance records &nbsp;·&nbsp; {defaulters.length} defaulters
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="btn-refresh"
            className="btn btn-outline"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : '🔄'} Refresh
          </button>
          <button
            id="btn-logout"
            className="btn btn-outline"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          id="tab-students"
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          📋 Registered Students
          <span className="badge badge-purple">{students.length}</span>
        </button>
        <button
          id="tab-attendance"
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          ✅ Attendance Records
          <span className="badge badge-cyan">{attendance.length}</span>
        </button>
        <button
          id="tab-defaulters"
          className={`tab-btn ${activeTab === 'defaulters' ? 'active' : ''}`}
          onClick={() => setActiveTab('defaulters')}
        >
          ⚠️ Defaulters
          <span className="badge badge-red">{defaulters.length}</span>
        </button>
      </div>

      {/* ── Panel 1: Students ── */}
      {activeTab === 'students' && (
        <div className="card">
          <div className="panel-header">
            <span className="panel-title">Registered Students</span>
            <span className="panel-count">{students.length} total</span>
          </div>
          {students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-msg">No students registered yet.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>PRN</th>
                    <th>Class</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s._id}>
                      <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td><strong>{s.name}</strong></td>
                      <td><span className="badge badge-purple">{s.prn}</span></td>
                      <td>{s.class_}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>
                        {s.registered_at ? new Date(s.registered_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Panel 2: Attendance ── */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="panel-header">
            <span className="panel-title">Attendance Records</span>
            <span className="panel-count">{attendance.length} records</span>
          </div>
          {attendance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-msg">No attendance records yet.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.name}</strong></td>
                      <td><span className="badge badge-cyan">{r.course}</span></td>
                      <td>{r.date}</td>
                      <td style={{ color: 'var(--text-2)' }}>{r.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Panel 3: Defaulters ── */}
      {activeTab === 'defaulters' && (
        <div className="card">
          <div className="panel-header">
            <span className="panel-title">Defaulters (below 75%)</span>
            <span className="panel-count">{defaulters.length} students</span>
          </div>
          {defaulters.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <div className="empty-msg">No defaulters — all students are above 75% attendance!</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>PRN</th>
                    <th>Class</th>
                    <th>Attendance</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.map((d, i) => (
                    <tr key={i}>
                      <td><strong>{d.name}</strong></td>
                      <td><span className="badge badge-red">{d.prn}</span></td>
                      <td>{d.class_}</td>
                      <td style={{ color: 'var(--error)', fontWeight: 600 }}>
                        {d.attendance_percentage}%
                      </td>
                      <td style={{ minWidth: 180 }}>
                        <div className="pct-bar">
                          <div className="pct-bar-track">
                            <div
                              className="pct-bar-fill"
                              style={{ width: `${Math.min(d.attendance_percentage, 100)}%` }}
                            />
                          </div>
                          <span className="pct-label">{d.attendance_percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
function TeacherLogin() {
  const savedName  = localStorage.getItem('teacher_name');
  const savedToken = localStorage.getItem('teacher_token');

  const [loggedIn,     setLoggedIn]     = useState(!!(savedToken && savedName));
  const [teacherName,  setTeacherName]  = useState(savedName || '');

  const handleLogin = (name) => {
    setTeacherName(name);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_name');
    setLoggedIn(false);
    setTeacherName('');
  };

  return (
    <div className="page">
      <nav className="navbar" style={{ maxWidth: loggedIn ? 1100 : 400 }}>
        <Link to="/" className="navbar-brand">
          <span className="brand-dot" />
          <h1>BlinkMark</h1>
        </Link>
        <Link to="/" className="back-btn">Back to Home</Link>
      </nav>

      {loggedIn ? (
        <Dashboard teacherName={teacherName} onLogout={handleLogout} />
      ) : (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <AuthForm onLogin={handleLogin} />
        </div>
      )}
    </div>
  );
}

export default TeacherLogin;
