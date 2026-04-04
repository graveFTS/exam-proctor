import cv2
import numpy as np
import base64
import io
import os
import threading
import time
import requests
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ══════════════════════════════════════════
# YOLO — load once at startup in background
# ══════════════════════════════════════════
yolo_model   = None
yolo_ready   = False
yolo_lock    = threading.Lock()

def load_yolo_background():
    global yolo_model, yolo_ready
    try:
        print("[AI] Loading YOLO in background...")
        from ultralytics import YOLO
        import torch
        # ✅ Force weights_only=False to fix PyTorch 2.6 issue
        original_load = torch.load
        def patched_load(*args, **kwargs):
            kwargs.setdefault('weights_only', False)
            return original_load(*args, **kwargs)
        torch.load = patched_load
        with yolo_lock:
            yolo_model = YOLO('yolov8n.pt')
            yolo_ready = True
        torch.load = original_load
        print("[AI] ✅ YOLO ready!")
    except Exception as e:
        print(f"[AI] ❌ YOLO load failed: {e}")

# Load YOLO in background so server starts instantly
threading.Thread(target=load_yolo_background, daemon=True).start()

# ══════════════════════════════════════════
# OpenCV cascades — fast, always available
# ══════════════════════════════════════════
face_cascade    = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade     = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
print("[AI] ✅ OpenCV cascades loaded!")

# ══════════════════════════════════════════
# Banned objects config
# ══════════════════════════════════════════
BANNED_OBJECTS = {
    'cell phone' : ('phone_detected',    'HIGH',   '🚫 Phone detected in frame!'),
    'book'       : ('book_detected',     'MEDIUM', '📚 Book detected — no materials allowed!'),
    'laptop'     : ('laptop_detected',   'HIGH',   '💻 Second laptop detected!'),
    'tablet'     : ('tablet_detected',   'HIGH',   '📱 Tablet detected in frame!'),
    'remote'     : ('remote_detected',   'MEDIUM', '📡 Remote/device detected!'),
    'earphones'  : ('earphone_detected', 'MEDIUM', '🎧 Earphones detected!'),
    'headphones' : ('earphone_detected', 'MEDIUM', '🎧 Headphones detected!'),
    'paper'      : ('paper_detected',    'MEDIUM', '📄 Paper/notes detected!'),
}

# ══════════════════════════════════════════
# Stats
# ══════════════════════════════════════════
stats = {
    'total_frames'    : 0,
    'total_violations': 0,
    'no_face_count'   : 0,
    'multi_face_count': 0,
    'object_violations': 0,
    'yolo_runs'       : 0,
    'start_time'      : datetime.now().strftime('%H:%M:%S')
}

# ── Run YOLO every 3rd frame to save memory/CPU ──
frame_counter = 0

# ══════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════
def decode_image(b64):
    if ',' in b64:
        b64 = b64.split(',')[1]
    img = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')
    # ✅ Resize to small frame — saves RAM
    img = img.resize((320, 240), Image.LANCZOS)
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def detect_faces(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    front   = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(40, 40))
    profile = profile_cascade.detectMultiScale(gray, 1.1, 4, minSize=(40, 40))
    all_faces = list(front) if len(front) > 0 else []
    for pf in (profile if len(profile) > 0 else []):
        px, py, pw, ph = pf
        overlap = any(abs(px - fx) < 50 and abs(py - fy) < 50 for fx, fy, fw, fh in all_faces)
        if not overlap:
            all_faces.append(pf)
    return all_faces, gray

def check_eyes(gray, faces):
    if not faces: return True  # assume ok if can't check
    x, y, w, h = faces[0]
    roi  = gray[y:y+h, x:x+w]
    eyes = eye_cascade.detectMultiScale(roi, 1.1, 3, minSize=(15, 15))
    return len(eyes) >= 1

def detect_objects_yolo(frame):
    """Only runs if YOLO is ready — never blocks"""
    if not yolo_ready:
        return {}
    try:
        with yolo_lock:
            results = yolo_model(frame, verbose=False, conf=0.40, imgsz=320)
        detected = {}
        for r in results:
            for box in r.boxes:
                label = yolo_model.names[int(box.cls)]
                conf  = float(box.conf)
                if label not in detected or detected[label] < conf:
                    detected[label] = round(conf * 100, 1)
        return detected
    except Exception as e:
        print(f"[AI] YOLO run error: {e}")
        return {}

# ══════════════════════════════════════════
# Routes
# ══════════════════════════════════════════
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'ok',
        'message': 'ExamGuard AI running!',
        'yolo_ready': yolo_ready,
        'frames_processed': stats['total_frames']
    })

@app.route('/ping', methods=['GET'])
def ping():
    return 'pong', 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'yolo_ready': yolo_ready,
        'stats': stats,
        'uptime_since': stats['start_time']
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    global frame_counter
    violations = []
    info = {}

    try:
        data = request.get_json(force=True, silent=True)
        if not data or not data.get('image'):
            return jsonify({'violations': [], 'error': 'No image'}), 400

        frame = decode_image(data['image'])
        stats['total_frames'] += 1
        frame_counter += 1

        # ── 1. Face Detection (always runs — fast) ──
        faces, gray = detect_faces(frame)
        count = len(faces)
        info['face_count'] = count

        if count == 0:
            violations.append({
                'type': 'no_face', 'severity': 'HIGH',
                'message': '👤 No face detected — please look at screen!'
            })
            stats['no_face_count'] += 1
        elif count == 1:
            if not check_eyes(gray, faces):
                violations.append({
                    'type': 'looking_away', 'severity': 'MEDIUM',
                    'message': '👀 Looking away from screen!'
                })
        elif count >= 2:
            violations.append({
                'type': 'multiple_faces', 'severity': 'HIGH',
                'message': f'👥 {count} people detected — unauthorized person!'
            })
            stats['multi_face_count'] += 1

        # ── 2. Object Detection — only every 3rd frame ──
        info['yolo_ready'] = yolo_ready
        if yolo_ready and frame_counter % 3 == 0:
            detected_objects = detect_objects_yolo(frame)
            info['detected_objects'] = detected_objects
            stats['yolo_runs'] += 1
            for obj, conf in detected_objects.items():
                if obj in BANNED_OBJECTS:
                    vtype, severity, message = BANNED_OBJECTS[obj]
                    violations.append({
                        'type': vtype, 'severity': severity,
                        'message': f'{message} ({conf}%)',
                        'confidence': conf
                    })
                    stats['object_violations'] += 1
        else:
            info['detected_objects'] = {}
            if not yolo_ready:
                info['yolo_status'] = 'loading'

        if violations:
            stats['total_violations'] += len(violations)

        print(f"[AI] Frame {stats['total_frames']} — faces:{count} violations:{len(violations)} yolo:{'✅' if yolo_ready else '⏳'}")

        return jsonify({
            'violations': violations,
            'info': info,
            'frame_number': stats['total_frames']
        })

    except Exception as e:
        print(f"[AI] ❌ ERROR: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'violations': [], 'error': str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    return jsonify({**stats, 'yolo_ready': yolo_ready})

@app.route('/reset', methods=['POST'])
def reset_stats():
    global frame_counter
    frame_counter = 0
    stats.update({
        'total_frames': 0, 'total_violations': 0,
        'no_face_count': 0, 'multi_face_count': 0,
        'object_violations': 0, 'yolo_runs': 0,
        'start_time': datetime.now().strftime('%H:%M:%S')
    })
    return jsonify({'message': 'Reset done', 'stats': stats})

# ══════════════════════════════════════════
# Keep-alive ping every 14 mins
# ══════════════════════════════════════════
def keep_alive():
    time.sleep(90)
    url = os.environ.get('RENDER_EXTERNAL_URL', '')
    if not url:
        print("[AI] No RENDER_EXTERNAL_URL — keep-alive disabled")
        return
    print(f"[AI] Keep-alive → pinging {url}/ping every 14 mins")
    while True:
        try:
            requests.get(f"{url}/ping", timeout=10)
            print("[AI] ✅ Keep-alive ping OK")
        except Exception as e:
            print(f"[AI] Keep-alive failed: {e}")
        time.sleep(14 * 60)

threading.Thread(target=keep_alive, daemon=True).start()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"[AI] Starting on port {port}")
    app.run(host='0.0.0.0', port=port, threaded=True)