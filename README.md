# 🤖 IntelliqAI — AI Interview Platform

A full-stack AI-powered technical interview platform built with Express + MongoDB backend and pure HTML/CSS/JS frontend, powered by Claude AI for dynamic question generation and real-time feedback.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, JavaScript, Bootstrap 5, Tailwind (via CDN), Chart.js |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **AI** | Anthropic Claude API |
| **Auth** | JWT (JSON Web Tokens) + bcrypt |
| **Deployment** | Docker + Docker Compose + Nginx |

---

## 📁 Project Structure

```
interview-platform/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema + auth methods
│   │   └── Interview.js     # Interview + question schema
│   ├── routes/
│   │   ├── auth.js          # Register, login, /me
│   │   └── interviews.js    # Start, answer, stats, history
│   ├── middleware/
│   │   └── auth.js          # JWT protect middleware
│   ├── server.js            # Express app entry point
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example         # ← Copy to .env and fill in
├── frontend/
│   ├── pages/
│   │   ├── index.html       # Landing + Login/Signup
│   │   ├── dashboard.html   # User dashboard with charts
│   │   └── interview.html   # Live interview session
│   └── js/
│       └── api.js           # Shared API utilities
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## ⚡ Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- MongoDB running locally OR MongoDB Atlas URI
- Anthropic API key

### 1. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create environment file
touch .env.example .env
# Edit .env with your values:
# - MONGODB_URI (local or Atlas)
# - JWT_SECRET (any long random string)
# - ANTHROPIC_API_KEY (get from console.anthropic.com)

# Start backend
npm run dev   # with nodemon (auto-reload)
# OR
npm start     # production
```

Backend runs on: `http://localhost:5000`

### 2. Serve Frontend

Option A — Simple (open file directly):
```bash
# Open in browser
open frontend/pages/index.html
```

Option B — Live server (recommended for dev):
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

---

## 🐳 Docker Deployment (Recommended for Production)

### 1. Create environment file

```bash
# In project root, create .env
cat > .env << EOF
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://your-domain.com
EOF
```

### 2. Build and run

```bash
docker-compose up -d --build
```

Services:
- Frontend (Nginx): `http://localhost:3000`
- Backend (Express): `http://localhost:5000`
- MongoDB: `localhost:27017`

### 3. View logs

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Stop

```bash
docker-compose down
# To also remove database volume:
docker-compose down -v
```

---

## ☁️ Cloud Deployment

### Backend → Railway / Render / Fly.io

1. Push `backend/` folder to GitHub
2. Connect to Railway/Render
3. Set environment variables:
   - `MONGODB_URI` (use MongoDB Atlas)
   - `JWT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend.com`
4. Deploy — it auto-detects Node.js

### Frontend → Vercel / Netlify / GitHub Pages

1. Push `frontend/` folder
2. Update `API_BASE` in `frontend/js/api.js`:
   ```js
   const API_BASE = 'https://your-backend-url.railway.app/api';
   ```
3. Deploy the `frontend/` directory

### Database → MongoDB Atlas (Free)

1. Create account at mongodb.com/atlas
2. Create free M0 cluster
3. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/interview-platform`
4. Set as `MONGODB_URI` in backend env

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT signing (use long random string) |
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `PORT` | ❌ | Backend port (default: 5000) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `FRONTEND_URL` | ❌ | Frontend URL for CORS (default: localhost:3000) |
| `JWT_EXPIRES_IN` | ❌ | Token expiry (default: 7d) |

---

## 🎯 Features

- **20+ Tech Domains** — JavaScript, Python, React, Node.js, System Design, ML, DevOps...
- **4 Difficulty Levels** — Beginner, Intermediate, Advanced, Expert
- **Dynamic AI Questions** — Claude generates unique questions every session
- **Real-time Feedback** — Score, strengths, improvements, correct answer summary
- **Webcam Support** — Optional camera to simulate real interviews
- **Personal Dashboard** — Charts, score history, domain performance
- **Interview History** — Review every past interview in full detail
- **JWT Auth** — Secure register/login with bcrypt password hashing
- **Rate Limiting** — Protects AI endpoints from abuse
- **Docker-Ready** — Full containerized deployment stack

---

## 🔐 API Endpoints

```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login
GET    /api/auth/me                Get current user (protected)

POST   /api/interviews/start       Start new interview (protected)
POST   /api/interviews/:id/answer  Submit answer + get next Q (protected)
GET    /api/interviews             Get user's interview list (protected)
GET    /api/interviews/:id         Get interview details (protected)
GET    /api/interviews/stats/overview  Dashboard stats (protected)
DELETE /api/interviews/:id         Abandon interview (protected)

GET    /api/health                 Server health check
```

---

## 🛠️ Development Tips

- Backend uses `nodemon` for auto-reload in dev
- All Claude API calls are in `backend/routes/interviews.js`
- Frontend state is managed with `localStorage` (auth) and `sessionStorage` (active interview)
- Charts use Chart.js loaded from CDN
- Bootstrap 5 for responsive grid/utilities only

---

## 📝 License

MIT — Build on top of this freely!
