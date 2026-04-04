# ⬡ ExamGuard — AI-Powered Online Exam Proctoring System

![ExamGuard](https://img.shields.io/badge/ExamGuard-AI%20Proctoring-00ff9d?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![Python](https://img.shields.io/badge/Python-Flask-3776AB?style=for-the-badge&logo=python)

> A full-stack AI-powered online exam proctoring system that monitors students in real-time using face detection and object detection to ensure exam integrity.

---

## 📸 Features

- 🎥 **Real-Time Webcam Monitoring** — Live webcam feed during exams
- 👤 **Face Detection** — Detects no face, multiple faces, and looking away
- 📵 **Object Detection** — Detects phones, books, laptops, earphones, tablets and more
- ⚠️ **Live Violation Alerts** — Instant notifications during exam
- 📊 **Session Stats** — Frames analyzed, violation count, severity breakdown
- 🔐 **Role-Based Access** — Separate dashboards for Admin and Student
- 📝 **Exam Management** — Admin can create, edit, delete exams with MCQ questions
- 📅 **Student Dashboard** — Live clock, calendar, exam list, violation log, exam rules
- 🔔 **Real-Time Socket Alerts** — Violations pushed to student instantly via Socket.IO
- 📜 **Exam Rules Page** — DO and DON'T guide for students before exam

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router, Socket.IO Client |
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | MongoDB Atlas |
| **Authentication** | JWT (JSON Web Tokens) |
| **AI Engine** | Python, Flask, OpenCV, YOLOv8 (Google Colab) |
| **Tunnel** | Cloudflare Tunnel (for Colab → Render connection) |
| **Deployment** | Vercel (Frontend), Render (Backend) |

---

## 📁 Project Structure

```
exam-proctor/
├── backend/                    # Node.js + Express API
│   ├── models/
│   │   ├── User.js             # User schema (student/admin)
│   │   ├── Exam.js             # Exam + questions schema
│   │   └── Violation.js        # Violation log schema
│   ├── routes/
│   │   ├── auth.js             # Register / Login
│   │   ├── exam.js             # Exam CRUD (admin only for create/edit/delete)
│   │   ├── violations.js       # Violation history
│   │   └── proctor.js          # AI bridge (forwards frames to Colab)
│   ├── server.js               # Main Express + Socket.IO server
│   ├── package.json
│   └── .env                    # Environment variables (not in repo)
│
├── frontend/                   # React Application
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── pages/
│       │   ├── Login.js            # Login + Register page
│       │   ├── StudentDashboard.js # Student home (exams, violations, calendar, rules)
│       │   ├── AdminDashboard.js   # Admin home (create/manage exams, view violations)
│       │   └── ExamRoom.js         # Live exam with AI proctoring
│       ├── components/
│       │   ├── Webcam.js           # Webcam monitor component
│       │   ├── Notifications.js    # Violation alert notifications
│       │   └── Timer.js            # Exam countdown timer
│       ├── App.js                  # Routes + role-based navigation
│       ├── api.js                  # Axios instance + backend URL
│       └── index.js
│
├── colab_proctoring.ipynb      # Google Colab AI server (run locally)
├── .gitignore
└── README.md
```

---

## ⚙️ How It Works

```
Student Webcam
     │
     ▼ (every 4 seconds)
React Frontend (ExamRoom.js)
     │  compress image (480px, 70% quality)
     ▼
Node.js Backend (/api/proctor/analyze)
     │  forward to AI server
     ▼
Python Flask (Google Colab via Cloudflare Tunnel)
     │  ┌─────────────────────────────┐
     │  │  1. Face Detection (OpenCV) │
     │  │  2. Object Detection (YOLO) │
     │  └─────────────────────────────┘
     │  return violations
     ▼
Node.js Backend
     │  save to MongoDB + emit Socket.IO alert
     ▼
React Frontend
     │  show notification instantly
     ▼
Student sees ⚠️ violation alert
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free)
- Google Colab (for AI server)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/exam-proctor.git
cd exam-proctor
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/examproctor?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_here
PORT=5000
AI_API=https://your-cloudflare-url.trycloudflare.com
```

Start the backend:

```bash
npm start
```

Backend runs on `http://localhost:5000`

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
REACT_APP_BACKEND_URL=http://localhost:5000
NODE_OPTIONS=--openssl-legacy-provider
```

Start the frontend:

```bash
npm start
```

Frontend runs on `http://localhost:3000`

### 4. Start AI Server (Google Colab)

1. Open `colab_proctoring.ipynb` in [Google Colab](https://colab.research.google.com)
2. Run **Cell 1** (install dependencies — once per session)
3. Run **Cell 2** (starts Flask + Cloudflare tunnel)
4. Copy the Cloudflare URL from the output
5. Update `AI_API` in `backend/.env` with the new URL
6. Restart backend

---

## 🌐 Deployment

### Frontend → Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Set **Root Directory** to `frontend`
4. Add Environment Variable:
   ```
   REACT_APP_BACKEND_URL = https://your-backend.onrender.com
   NODE_OPTIONS = --openssl-legacy-provider
   ```
5. Deploy

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Settings:

   | Field | Value |
   |---|---|
   | Root Directory | `backend` |
   | Runtime | `Node` |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Instance Type | `Free` |

4. Add Environment Variables:

   | Key | Value |
   |---|---|
   | `MONGO_URI` | Your MongoDB Atlas URI |
   | `JWT_SECRET` | Your JWT secret key |
   | `AI_API` | Your Cloudflare tunnel URL (update each Colab session) |
   | `BACKEND_URL` | `https://your-backend.onrender.com` |
   | `PORT` | `5000` |

5. Deploy

> ⚠️ **Important:** Every time you start a new Google Colab session, you get a new Cloudflare URL. Update `AI_API` in Render's environment variables each time.

---

## 👤 Roles & Permissions

### 👨‍🎓 Student
- View available exams
- Take exams with live AI proctoring
- View own violation history
- View exam rules and guidelines
- View calendar and upcoming exams

### 👨‍💼 Admin
- Create, edit, delete exams
- Add MCQ questions with correct answers
- View all student violations
- Cannot take exams

---

## 🤖 AI Detection Capabilities

| Detection | Method | Severity |
|---|---|---|
| No face visible | OpenCV Haar Cascade | HIGH |
| Multiple people | OpenCV Haar Cascade | HIGH |
| Looking away | OpenCV Eye Detection | MEDIUM |
| Phone detected | YOLOv8 | HIGH |
| Book detected | YOLOv8 | MEDIUM |
| Laptop detected | YOLOv8 | HIGH |
| Tablet detected | YOLOv8 | HIGH |
| Earphones detected | YOLOv8 | MEDIUM |
| Paper/notes detected | YOLOv8 | MEDIUM |
| Remote detected | YOLOv8 | MEDIUM |

---

## 🔒 Environment Variables

### Backend `.env`
```env
MONGO_URI=          # MongoDB Atlas connection string
JWT_SECRET=         # Random secret string for JWT signing
PORT=               # Server port (default: 5000)
AI_API=             # Cloudflare tunnel URL from Google Colab
BACKEND_URL=        # Your Render backend URL (for keep-alive ping)
```

### Frontend `.env`
```env
REACT_APP_BACKEND_URL=    # Your Render or localhost backend URL
NODE_OPTIONS=             # --openssl-legacy-provider (for Node 18+)
```

---

## 📦 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |

### Exams
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/exam` | Get all exams | All |
| GET | `/api/exam/:id` | Get single exam | All |
| POST | `/api/exam` | Create exam | Admin |
| PUT | `/api/exam/:id` | Update exam | Admin |
| DELETE | `/api/exam/:id` | Delete exam | Admin |
| POST | `/api/exam/:id/submit` | Submit answers | Student |

### Proctoring
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/proctor/analyze` | Send frame for AI analysis |
| GET | `/api/proctor/health` | Check if AI server is online |
| GET | `/api/proctor/stats` | Get session statistics |
| POST | `/api/proctor/reset` | Reset stats for new session |
| GET | `/api/proctor/violations/:examId` | Get violations for exam |

### Violations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/violations` | Log a violation |
| GET | `/api/violations/mine` | Get my violations |
| GET | `/api/violations/all` | Get all violations (admin) |

---

## 🧑‍💻 Default Admin Account

After deploying, create an admin account by registering with role **Admin** on the login page. Or manually insert into MongoDB:

```json
{
  "name": "Admin",
  "email": "admin@examguard.com",
  "password": "<bcrypt hashed password>",
  "role": "admin"
}
```

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|---|---|
| `ECONNREFUSED` MongoDB error | Check MONGO_URI and whitelist IP in Atlas Network Access |
| `ERR_OSSL_EVP_UNSUPPORTED` | Add `NODE_OPTIONS=--openssl-legacy-provider` to frontend env |
| AI violations not showing | Update `AI_API` in Render with new Colab Cloudflare URL |
| Render backend sleeping | Add `BACKEND_URL` env var — keep-alive ping runs every 14 mins |
| CORS error on deployed site | Update `server.js` CORS origin with your Vercel URL |

---

## 📄 License

This project is built for educational purposes as a school project.

---

## 🙏 Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) — Object detection
- [OpenCV](https://opencv.org/) — Face detection
- [Google Colab](https://colab.research.google.com/) — Free GPU/CPU for AI server
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — Free tunnel for Colab
- [Render](https://render.com/) — Free backend hosting
- [Vercel](https://vercel.com/) — Free frontend hosting
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Free database

---

<div align="center">
  <p>Built with ❤️ by Dipsekhar Maity</p>
  <p>⬡ ExamGuard — Keeping Exams Honest</p>
</div>
