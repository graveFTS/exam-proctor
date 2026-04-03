import cv2
import numpy as np
import base64
import io
import os
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ── Load models on startup ──
print("Loading AI models...")

face_cascade    = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade     = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

# ✅ SAFE YOLO LOAD (ONLY ONCE)
MODEL_PATH = "yolov8n.pt"
yolo_model = YOLO(MODEL_PATH)

print("✅ Models loaded!")

# ── Banned objects ──
BANNED_OBJECTS = {
    'cell phone' : ('phone_detected',    'HIGH',     '🚫 Phone detected in frame!'),
    'book'       : ('book_detected',     'MEDIUM',   '📚 Book detected — no materials allowed!'),
    'laptop'     : ('laptop_detected',   'HIGH',     '💻 Second laptop detected!'),
    'tablet'     : ('tablet_detected',   'HIGH',     '📱 Tablet detected in frame!'),
    'remote'     : ('remote_detected',   'MEDIUM',   '📡 Remote/device detected!'),
    'earphones'  : ('earphone_detected', 'MEDIUM',   '🎧 Earphones detected!'),
    'headphones' : ('earphone_detected', 'MEDIUM',   '🎧 Headphones detected!'),
    'paper'      : ('paper_detected',    'MEDIUM',   '📄 Paper/notes detected!'),
}

# ── Session stats ──
stats = {
    'total_frames': 0,
    'total_violations': 0,
    'no_face_count': 0,
    'multi_face_count': 0,
    'object_violations': 0,
    'start_time': datetime.now().strftime('%H:%M:%S')
}

# ── Utils ──
def decode_image(b64):
    if ',' in b64:
        b64 = b64.split(',')[1]
    img = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def detect_faces(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    front = face_cascade.detectMultiScale(gray, 1.05, 4, minSize=(60, 60))
    profile = profile_cascade.detectMultiScale(gray, 1.05, 4, minSize=(60, 60))

    all_faces = list(front) if len(front) > 0 else []

    for pf in (profile if len(profile) > 0 else []):
        px, py, pw, ph = pf
        overlap = any(abs(px-fx) < 50 and abs(py-fy) < 50 for fx, fy, fw, fh in all_faces)
        if not overlap:
            all_faces.append(pf)

    return all_faces, gray

def check_eyes(gray, faces):
    if not faces:
        return False

    x, y, w, h = faces[0]
    roi = gray[y:y+h, x:x+w]
    eyes = eye_cascade.detectMultiScale(roi, 1.1, 5, minSize=(20, 20))

    return len(eyes) >= 2

def detect_objects(frame):
    try:
        # ✅ Resize for performance
        frame = cv2.resize(frame, (640, 480))

        results = yolo_model(frame, verbose=False, conf=0.40)
        detected = {}

        for r in results:
            for box in r.boxes:
                label = yolo_model.names[int(box.cls)]
                conf  = float(box.conf)

                if label not in detected or detected[label] < conf:
                    detected[label] = round(conf * 100, 1)

        return detected

    except Exception as e:
        print("YOLO ERROR:", str(e))
        return {}

# ── Routes ──
@app.route('/', methods=['GET'])
def index():
    return jsonify({'status': 'ok', 'message': 'ExamGuard AI Server is running!'})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'stats': stats, 'uptime_since': stats['start_time']})

@app.route('/analyze', methods=['POST'])
def analyze():
    violations = []
    info = {}

    try:
        data = request.get_json()

        if not data or not data.get('image'):
            return jsonify({'violations': [], 'error': 'No image'}), 400

        frame = decode_image(data['image'])
        stats['total_frames'] += 1

        # Face detection
        faces, gray = detect_faces(frame)
        count = len(faces)
        info['face_count'] = count

        if count == 0:
            violations.append({'type': 'no_face', 'severity': 'HIGH', 'message': '👤 No face detected!'})
            stats['no_face_count'] += 1

        elif count == 1:
            if not check_eyes(gray, faces):
                violations.append({'type': 'looking_away', 'severity': 'MEDIUM', 'message': '👀 Looking away from screen!'})

        elif count >= 2:
            violations.append({
                'type': 'multiple_faces',
                'severity': 'HIGH',
                'message': f'👥 {count} people detected — unauthorized person!'
            })
            stats['multi_face_count'] += 1

        # Object detection
        detected_objects = detect_objects(frame)
        info['detected_objects'] = detected_objects

        for obj, conf in detected_objects.items():
            if obj in BANNED_OBJECTS:
                vtype, severity, message = BANNED_OBJECTS[obj]

                violations.append({
                    'type': vtype,
                    'severity': severity,
                    'message': f'{message} ({conf}%)',
                    'confidence': conf
                })

                stats['object_violations'] += 1

        if violations:
            stats['total_violations'] += len(violations)

        return jsonify({
            'violations': violations,
            'info': info,
            'frame_number': stats['total_frames']
        })

    except Exception as e:
        return jsonify({'violations': [], 'error': str(e)}), 500


@app.route('/stats', methods=['GET'])
def get_stats():
    return jsonify(stats)


@app.route('/reset', methods=['POST'])
def reset_stats():
    stats.update({
        'total_frames': 0,
        'total_violations': 0,
        'no_face_count': 0,
        'multi_face_count': 0,
        'object_violations': 0,
        'start_time': datetime.now().strftime('%H:%M:%S')
    })

    return jsonify({'message': 'Reset done', 'stats': stats})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)