import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import WebcamCapture from '../components/WebcamCapture';
import { registerStudent } from '../api';

const STAGES = [
  { key: 'face',    label: 'Face Detection',       icon: '🔍' },
  { key: 'blink',   label: 'Blink Verification',   icon: '👁️' },
  { key: 'texture', label: 'Texture Analysis',      icon: '🔬' },
  { key: 'motion',  label: 'Motion Consistency',    icon: '🎯' },
  { key: 'embed',   label: 'Embedding Generation',  icon: '🧬' },
];

function Register() {
  const webcamRef = useRef(null);

  const [name,   setName]   = useState('');
  const [class_, setClass_] = useState('');
  const [prn,    setPrn]    = useState('');

  const [status,      setStatus]      = useState('idle'); // idle | capturing | processing | success | error
  const [message,     setMessage]     = useState('');
  const [progress,    setProgress]    = useState(0);
  const [activeStage, setActiveStage] = useState(-1);

  const validate = () => {
    if (!name.trim())   return 'Name is required';
    if (!class_.trim()) return 'Class is required';
    if (!prn.trim())    return 'PRN is required';
    return null;
  };

  const handleCapture = async () => {
    const err = validate();
    if (err) { setMessage(err); setStatus('error'); return; }

    setStatus('capturing');
    setMessage('Look at the camera and blink once naturally…');
    setActiveStage(-1);
    setProgress(0);

    try {
      // Capture ~45 frames over ~2.7 seconds (45 × 60ms)
      const NUM_FRAMES = 45;
      let captured = 0;

      // Simulate progress while capturing
      const progressInterval = setInterval(() => {
        captured += 1;
        setProgress(Math.round((captured / NUM_FRAMES) * 50)); // first 50% = capture
        if (captured >= NUM_FRAMES) clearInterval(progressInterval);
      }, 60);

      const frames = await webcamRef.current.captureFrames(NUM_FRAMES, 60);
      clearInterval(progressInterval);
      setProgress(50);

      // Send to backend
      setStatus('processing');
      setMessage('Running liveness pipeline…');

      // Animate stages
      for (let i = 0; i < STAGES.length; i++) {
        setActiveStage(i);
        setProgress(50 + Math.round(((i + 1) / STAGES.length) * 45));
        await new Promise((r) => setTimeout(r, 300));
      }

      const res = await registerStudent({
        name:   name.trim(),
        class_: class_.trim(),
        prn:    prn.trim(),
        frames,
      });

      setProgress(100);
      setActiveStage(STAGES.length); // all passed
      setStatus('success');
      setMessage(res.data.message || 'Student registered successfully!');

    } catch (e) {
      setStatus('error');
      setActiveStage(-1);
      const detail = e?.response?.data?.detail || e.message || 'Registration failed';
      setMessage(detail);
    }
  };

  const stageClass = (idx) => {
    if (status === 'success') return 'stage passed';
    if (status === 'error' && idx === activeStage) return 'stage failed';
    if (status === 'error' && idx < activeStage) return 'stage passed';
    if (idx === activeStage) return 'stage active';
    if (idx < activeStage) return 'stage passed';
    return 'stage';
  };

  const stageIcon = (idx, stage) => {
    if (status === 'success') return '✅';
    if (status === 'error' && idx === activeStage) return '❌';
    if (status === 'error' && idx < activeStage) return '✅';
    if (idx === activeStage) return '⏳';
    if (idx < activeStage) return '✅';
    return stage.icon;
  };

  const isCapturing = status === 'capturing' || status === 'processing';

  return (
    <div className="page">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="brand-dot" />
          <h1>BlinkMark</h1>
        </Link>
        <Link to="/" className="back-btn">Back to Home</Link>
      </nav>

      <h2 className="section-title">Register Student</h2>
      <p className="section-subtitle">
        Capture your face + fill details to enroll. Liveness is verified before saving.
      </p>

      {message && (
        <div
          className={`toast toast-${
            status === 'success' ? 'success' : status === 'error' ? 'error' : 'info'
          }`}
          style={{ width: '100%', maxWidth: 960 }}
        >
          {status === 'success' ? '✅' : status === 'error' ? '⚠️' : 'ℹ️'} {message}
        </div>
      )}

      <div className="register-layout">
        {/* ── Left: Webcam ── */}
        <div>
          <div className="blink-hint">
            When you click "Capture Face", please blink once naturally during the 3-second window.
          </div>

          <WebcamCapture ref={webcamRef} showGuide={true} />

          {isCapturing && (
            <div style={{ marginTop: 12 }}>
              <div className="capture-status capturing">
                {status === 'capturing' ? '📸 Capturing frames…' : '🔄 Analysing…'}
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Pipeline stages */}
          <div className="pipeline-stages" style={{ marginTop: 20 }}>
            {STAGES.map((stage, idx) => (
              <div key={stage.key} className={stageClass(idx)}>
                <span className="stage-icon">{stageIcon(idx, stage)}</span>
                <span className="stage-name">Stage {idx + 1}: {stage.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div className="card" style={{ alignSelf: 'flex-start' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              className="form-input"
              placeholder="e.g. Arjun Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCapturing}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-class">Class / Division</label>
            <input
              id="reg-class"
              className="form-input"
              placeholder="e.g. TE-A"
              value={class_}
              onChange={(e) => setClass_(e.target.value)}
              disabled={isCapturing}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-prn">PRN Number</label>
            <input
              id="reg-prn"
              className="form-input"
              placeholder="e.g. 2021XXXXX"
              value={prn}
              onChange={(e) => setPrn(e.target.value)}
              disabled={isCapturing}
            />
          </div>

          <button
            id="btn-capture-face"
            className="btn btn-primary btn-full"
            onClick={handleCapture}
            disabled={isCapturing || status === 'success'}
            style={{ marginTop: 8 }}
          >
            {isCapturing
              ? <><span className="spinner" /> Processing…</>
              : status === 'success'
              ? '✅ Registered!'
              : '📸 Capture Face'}
          </button>

          {status === 'success' && (
            <Link
              to="/"
              className="btn btn-outline btn-full"
              style={{ marginTop: 12, display: 'flex' }}
            >
              ← Back to Home
            </Link>
          )}

          <p style={{ marginTop: 18, fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Your face embedding is stored securely. No raw images are saved.
            Attendance can only be marked after liveness verification.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
