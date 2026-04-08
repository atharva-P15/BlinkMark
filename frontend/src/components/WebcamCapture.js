import React, { useRef, useState, useEffect } from 'react';

/**
 * WebcamCapture — Reusable webcam component with frame capture.
 *
 * Ref API:
 *   captureFrames(numFrames, intervalMs) → Promise<string[]>  (base64 frames)
 *   stopCamera()
 */
const WebcamCapture = React.forwardRef(function WebcamCapture(
  { width = 640, height = 480, showGuide = true },
  ref
) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream = null;
    navigator.mediaDevices
      .getUserMedia({ video: { width, height, facingMode: 'user' }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch((err) => setError('Camera access denied: ' + err.message));

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [width, height]);

  React.useImperativeHandle(ref, () => ({
    captureFrames(numFrames = 40, intervalMs = 60) {
      return new Promise((resolve, reject) => {
        if (!videoRef.current || !canvasRef.current) {
          return reject(new Error('Camera not ready'));
        }
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width  = video.videoWidth  || width;
        canvas.height = video.videoHeight || height;
        const ctx    = canvas.getContext('2d');
        const frames = [];

        const interval = setInterval(() => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          frames.push(dataUrl.split(',')[1]); // strip data:image/jpeg;base64,

          if (frames.length >= numFrames) {
            clearInterval(interval);
            resolve(frames);
          }
        }, intervalMs);
      });
    },

    stopCamera() {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    },
  }));

  if (error) {
    return (
      <div className="webcam-container" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="toast toast-error" style={{ margin: 0 }}>🚫 {error}</div>
      </div>
    );
  }

  return (
    <div className="webcam-container">
      <video ref={videoRef} autoPlay muted playsInline className="webcam-video" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {showGuide && ready && (
        <div className="webcam-overlay">
          <div className="webcam-frame-guide" />
        </div>
      )}
    </div>
  );
});

export default WebcamCapture;
