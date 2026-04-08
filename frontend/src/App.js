import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import MarkAttendance from './pages/MarkAttendance';
import TeacherLogin from './pages/TeacherLogin';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mark-attendance" element={<MarkAttendance />} />
          <Route path="/teacher" element={<TeacherLogin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
