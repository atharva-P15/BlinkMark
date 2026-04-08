import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="dashboard-hero">
      {/* Logo */}
      <div className="hero-logo">
        <div className="hero-logo-icon">👁️</div>
        <span className="hero-logo-text">BlinkMark</span>
      </div>

      <p className="hero-tagline">
        Anti-spoofing face recognition attendance — secured by liveness detection
      </p>

      {/* Main navigation buttons */}
      <div className="hero-buttons">
        <Link to="/register" className="hero-btn" id="btn-register">
          <span className="btn-icon">📋</span>
          <span>Register Student</span>
          <span className="btn-arrow">›</span>
        </Link>

        <Link to="/mark-attendance" className="hero-btn" id="btn-mark-attendance">
          <span className="btn-icon">✅</span>
          <span>Mark Attendance</span>
          <span className="btn-arrow">›</span>
        </Link>

        <Link to="/teacher" className="hero-btn" id="btn-teacher-login">
          <span className="btn-icon">🎓</span>
          <span>Teacher Login</span>
          <span className="btn-arrow">›</span>
        </Link>
      </div>

      {/* Pipeline info */}
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-value">5</div>
          <div className="hero-stat-label">Pipeline Stages</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">EAR</div>
          <div className="hero-stat-label">Blink Detection</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">LBP</div>
          <div className="hero-stat-label">Texture Check</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">512d</div>
          <div className="hero-stat-label">Face Embedding</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
