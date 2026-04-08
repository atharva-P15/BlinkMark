import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CourseCards from '../components/CourseCards';
import WebcamCapture from '../components/WebcamCapture';
import { verifyFace } from '../api';

function MarkAttendance() {
  const webcamRef = useRef(null);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [status,         setStatus]         = useState('idle'); // idle | capturing | processing | success | error
  const [message,        setMessage]        = useState('');
  const [progress,       setProgress]       = useState(0);
  const [result,         setResult]         = useState(null);

  const openModal = (course) => {
    setSelectedCourse(course);
    setModalOpen(true);
    setStatus('idle');
    setMessage('');
    setProgress(0);
    setResult(null);
  };

  const closeModal = () => {
    if (webcamRef.current) webcamRef.current.stopCamera();
    setModalOpen(false);
    setStatus('idle');
  };

  const handleCapture = async () => {
    setStatus('capturing');
    setMessage('Look at the camera and blink once naturally…');
    setProgress(0);
    setResult(null);

    try {
      const NUM_FRAMES = 45;
      let captured = 0;

      const pInterval = setInterval(() => {
        captured += 1;
        setProgress(Math.round((captured / NUM_FRAMES) * 50));
        if (captured >= NUM_FRAMES) clearInterval(pInterval);
      }, 60);

      const frames = await webcamRef.current.captureFrames(NUM_FRAMES, 60);
      clearInterval(pInterval);
      setProgress(55);

      setStatus('processing');
      setMessage('Running anti-spoofing pipeline…');

      // Fake stage progress
      for (let i = 0; i < 5; i++) {
        setProgress(55 + (i + 1) * 8);
        await new Promise((r) => setTimeout(r, 250));
      }

      const res = await verifyFace({ frames, course: selectedCourse });
      setProgress(100);
      setStatus('success');
      setResult(res.data);
      setMessage(`Attendance marked for ${res.data.student} in ${res.data.course}`);

    } catch (e) {
      setStatus('error');
      const detail = e?.response?.data?.detail || e.message || 'Verification failed';
      setMessage(detail);
      setProgress(0);
    }
  };

  return (
    <div className="page">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="brand-dot" />
          <h1>BlinkMark</h1>
        </Link>
        <Link to="/" className="back-btn">Back to Home</Link>
      </nav>

      <h2 className="section-title">Mark Attendance</h2>
      <p className="section-subtitle">
        Select a course — the liveness pipeline will verify your identity before marking attendance.
      </p>

      <CourseCards onSelect={openModal} />

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                {selectedCourse}
              </span>
              <button
                id="modal-close-btn"
                className="modal-close"
                onClick={closeModal}
                disabled={status === 'capturing' || status === 'processing'}
              >
                ×
              </button>
            </div>

            {/* Result / message */}
            {message && (
              <div
                className={`toast toast-${
                  status === 'success' ? 'success'
                  : status === 'error' ? 'error'
                  : 'info'
                }`}
                style={{ marginBottom: 16 }}
              >
                {status === 'success' ? '✅' : status === 'error' ? '⚠️' : 'ℹ️'} {message}
              </div>
            )}

            {status !== 'success' && (
              <>
                <div className="blink-hint" style={{ marginBottom: 14 }}>
                  Click "Start Capture" then blink once during the 3-second window.
                </div>

                <WebcamCapture ref={webcamRef} showGuide={true} />

                {(status === 'capturing' || status === 'processing') && (
                  <div style={{ marginTop: 10 }}>
                    <div className="capture-status capturing">
                      {status === 'capturing' ? '📸 Capturing frames…' : '🔄 Verifying identity…'}
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <button
                  id="btn-start-capture"
                  className="btn btn-primary btn-full"
                  style={{ marginTop: 16 }}
                  onClick={handleCapture}
                  disabled={status === 'capturing' || status === 'processing'}
                >
                  {status === 'capturing' || status === 'processing'
                    ? <><span className="spinner" /> Processing…</>
                    : '📸 Start Capture'}
                </button>
              </>
            )}

            {status === 'success' && result && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>
                  {result.student}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
                  {result.course} &nbsp;·&nbsp; Match score: <strong>{(result.similarity * 100).toFixed(1)}%</strong>
                </div>
                <button
                  className="btn btn-outline"
                  style={{ marginTop: 24 }}
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MarkAttendance;
