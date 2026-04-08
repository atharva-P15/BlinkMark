"""
face_pipeline.py — BlinkMark Anti-Spoofing Pipeline

Stages:
  1. Face detection via MediaPipe FaceMesh
  2. Blink detection via Eye Aspect Ratio (EAR)
  3. Texture analysis via Local Binary Pattern (LBP)
  4. Motion consistency check via landmark tracking
  5. Face embedding generation via InsightFace
"""

import cv2
import numpy as np
import mediapipe as mp
from skimage.feature import local_binary_pattern
import base64
from typing import List, Tuple, Optional

# ─── MediaPipe ────────────────────────────────────────────────────────────────
mp_face_mesh = mp.solutions.face_mesh

# ─── InsightFace (lazy-loaded to avoid slow startup) ─────────────────────────
_face_app = None


def get_face_app():
    global _face_app
    if _face_app is None:
        print("[Pipeline] Loading InsightFace model (first-time download may take a minute)...")
        from insightface.app import FaceAnalysis
        _face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        _face_app.prepare(ctx_id=0, det_size=(640, 640))
        print("[Pipeline] InsightFace loaded.")
    return _face_app


# ─── EAR Constants ────────────────────────────────────────────────────────────
# MediaPipe FaceMesh landmark indices (left and right eye)
LEFT_EYE_IDX  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_IDX = [33,  160, 158, 133, 153, 144]
EAR_CLOSE_THRESHOLD = 0.22   # below this → eye is closed
EAR_CONSEC_MIN      = 2      # min consecutive closed frames to count as blink

# ─── Texture Constants ────────────────────────────────────────────────────────
LBP_VAR_THRESHOLD = 4.0    # variance of raw LBP image; real skin > flat print

# ─── Motion Constants ─────────────────────────────────────────────────────────
MOTION_MIN_STD = 0.0008    # min std of landmark position across frames


# ─────────────────────────────────────────────────────────────────────────────
# Helper utilities
# ─────────────────────────────────────────────────────────────────────────────

def decode_frame(b64: str) -> Optional[np.ndarray]:
    """Decode a base64 JPEG string into a BGR numpy array."""
    try:
        raw = base64.b64decode(b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception:
        return None


def _landmark_pt(lm, img_w: int, img_h: int) -> np.ndarray:
    return np.array([lm.x * img_w, lm.y * img_h], dtype=np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Blink Detection (EAR)
# ─────────────────────────────────────────────────────────────────────────────

def _ear(landmarks, eye_idx: List[int], img_w: int, img_h: int) -> float:
    """Compute Eye Aspect Ratio for one eye."""
    pts = [_landmark_pt(landmarks[i], img_w, img_h) for i in eye_idx]
    A = np.linalg.norm(pts[1] - pts[5])
    B = np.linalg.norm(pts[2] - pts[4])
    C = np.linalg.norm(pts[0] - pts[3])
    return (A + B) / (2.0 * C + 1e-6)


def detect_blink(ear_sequence: List[float]) -> bool:
    """
    Detect at least one open→close→open blink in the EAR sequence.
    State machine: OPEN → CLOSING (≥ EAR_CONSEC_MIN frames) → OPEN → blink!
    """
    state = "open"
    closed_count = 0

    for ear in ear_sequence:
        if state == "open":
            if ear < EAR_CLOSE_THRESHOLD:
                state = "closing"
                closed_count = 1
        elif state == "closing":
            if ear < EAR_CLOSE_THRESHOLD:
                closed_count += 1
            else:
                if closed_count >= EAR_CONSEC_MIN:
                    return True           # open−close−open confirmed
                state = "open"
                closed_count = 0

    return False


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — LBP Texture Analysis
# ─────────────────────────────────────────────────────────────────────────────

def _extract_face_roi(frame: np.ndarray, landmarks, img_w: int, img_h: int) -> Optional[np.ndarray]:
    """Crop the face bounding box from a frame using MediaPipe landmarks."""
    xs = [lm.x * img_w for lm in landmarks]
    ys = [lm.y * img_h for lm in landmarks]
    x1 = max(0, int(min(xs)))
    x2 = min(img_w, int(max(xs)))
    y1 = max(0, int(min(ys)))
    y2 = min(img_h, int(max(ys)))
    if x2 > x1 and y2 > y1:
        return frame[y1:y2, x1:x2]
    return None


def texture_is_live(face_roi: np.ndarray) -> bool:
    """
    Real skin has rich micro-texture → high LBP variance.
    Printed/screen faces are flat → low LBP variance.
    """
    gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (64, 64))
    lbp = local_binary_pattern(gray, P=8, R=1, method='uniform')
    variance = float(np.var(lbp))
    return variance > LBP_VAR_THRESHOLD


# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — Motion Consistency
# ─────────────────────────────────────────────────────────────────────────────

def motion_is_live(landmark_sequences: List) -> bool:
    """
    A real face has micro-motions (breathing, saccades, expression).
    A rigid photo held still has near-zero landmark standard deviation.

    We check two signals:
      (a) positional std of the nose tip across frames
      (b) std of the nose-to-chin / ear-to-ear ratio across frames
          (changes with depth/perspective → non-planar = live)
    """
    if len(landmark_sequences) < 5:
        return False

    # Signal (a): nose tip position std (normalized coords)
    nose_y = np.array([seq[1].y for seq in landmark_sequences])
    nose_x = np.array([seq[1].x for seq in landmark_sequences])
    pos_std = float(np.std(nose_x) + np.std(nose_y))

    # Signal (b): proportion variance between nose−chin and ear-to-ear distance
    ratios = []
    for seq in landmark_sequences:
        nose  = np.array([seq[1].x,   seq[1].y])
        chin  = np.array([seq[152].x, seq[152].y])
        l_ear = np.array([seq[234].x, seq[234].y])
        r_ear = np.array([seq[454].x, seq[454].y])
        d_nc = np.linalg.norm(nose - chin)
        d_lr = np.linalg.norm(l_ear - r_ear)
        ratios.append(d_nc / (d_lr + 1e-6))

    ratio_std = float(np.std(ratios))

    # Pass if EITHER signal shows motion above threshold
    return (pos_std > MOTION_MIN_STD) or (ratio_std > 0.001)


# ─────────────────────────────────────────────────────────────────────────────
# Main Pipeline Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(
    frames_b64: List[str],
) -> Tuple[bool, str, Optional[np.ndarray]]:
    """
    Run the full 5-stage anti-spoofing pipeline on a list of base64 frames.

    Returns:
        (passed: bool, message: str, embedding: Optional[np.ndarray])
    """
    # ── Minimum frame guard ───────────────────────────────────────────────────
    if len(frames_b64) < 10:
        return False, "Insufficient frames — please allow 2+ seconds of capture", None

    # ── Decode frames ─────────────────────────────────────────────────────────
    frames = [decode_frame(b) for b in frames_b64]
    frames = [f for f in frames if f is not None]
    if not frames:
        return False, "Failed to decode camera frames", None

    # ── Stage 1 & 2 data collection: run FaceMesh on every frame ─────────────
    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    landmark_sequences = []   # one landmarks list per frame
    ear_sequence       = []   # one EAR value per frame
    valid_frames       = []   # frames in which face was detected

    for frame in frames:
        img_h, img_w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = face_mesh.process(rgb)
        if result.multi_face_landmarks:
            lms = result.multi_face_landmarks[0].landmark
            landmark_sequences.append(lms)
            valid_frames.append(frame)

            left_ear  = _ear(lms, LEFT_EYE_IDX,  img_w, img_h)
            right_ear = _ear(lms, RIGHT_EYE_IDX, img_w, img_h)
            ear_sequence.append((left_ear + right_ear) / 2.0)

    face_mesh.close()

    # ── Stage 1 check: consistent face detection ──────────────────────────────
    if len(valid_frames) < max(5, len(frames) // 3):
        return False, "Face not detected consistently — ensure good lighting and face the camera", None

    # ── Stage 2 check: blink detection ───────────────────────────────────────
    if not detect_blink(ear_sequence):
        return False, "Blink not detected — please blink naturally during the capture window", None

    # ── Stage 3 check: LBP texture ───────────────────────────────────────────
    mid_idx   = len(valid_frames) // 2
    mid_frame = valid_frames[mid_idx]
    mid_lms   = landmark_sequences[mid_idx]
    img_h, img_w = mid_frame.shape[:2]
    face_roi = _extract_face_roi(mid_frame, mid_lms, img_w, img_h)

    if face_roi is None or face_roi.size == 0:
        return False, "Could not extract face region for texture analysis", None

    if not texture_is_live(face_roi):
        return False, "Spoof detected: texture analysis failed (possible printed/screen image)", None

    # ── Stage 4 check: motion consistency ────────────────────────────────────
    if not motion_is_live(landmark_sequences):
        return False, "Spoof detected: no natural facial motion detected (possible static image)", None

    # ── Stage 5: generate InsightFace embedding ───────────────────────────────
    try:
        app = get_face_app()

        # Try multiple frames (from middle outward) to find a clean face
        embedding = None
        candidates = sorted(
            range(len(valid_frames)),
            key=lambda i: abs(i - len(valid_frames) // 2)
        )
        for idx in candidates:
            faces = app.get(valid_frames[idx])
            if faces:
                face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                embedding = face.embedding
                break

        if embedding is None:
            return False, "Could not generate face embedding — ensure your face is clearly visible", None

        return True, "Liveness verification passed ✓", embedding

    except Exception as e:
        return False, f"Embedding generation failed: {str(e)}", None
