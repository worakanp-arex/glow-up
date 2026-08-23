# glow-up

เว็บแอปสนับสนุนการจัดหางานสำหรับผู้ผ่านการบำบัดสารเสพติดด้วย AI — Node.js/Express + MongoDB backend, React + Vite frontend. อยู่ระหว่างพัฒนาแบบแบ่งเฟส (ดูหัวข้อ "สถานะการพัฒนา")

## Structure

```
backend/    Express API (JavaScript, MongoDB via Mongoose)
frontend/   React + Vite app
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then edit MONGODB_URI if needed
npm run dev
```

Runs on http://localhost:5001 (see `PORT` in `.env`). Requires a running MongoDB instance (local or Atlas) matching `MONGODB_URI` in `.env`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173. API calls to `/api/*` are proxied to the backend (see `vite.config.js` — keep the proxy `target` port in sync with backend's `PORT`).

## API

- `GET /api/health` — health check

ยังไม่มี endpoint อื่นในรอบนี้ — resource ตาม data model (users, jobs, applications ฯลฯ) กำลังทยอยเพิ่มทีละเฟส

## สถานะการพัฒนา

โปรเจกต์นี้พัฒนาแบบแบ่งเฟสตามสเปก:

1. **[กำลังทำ] Setup** — โครงสร้างโปรเจกต์, เชื่อมต่อ MongoDB, Layout component
2. Auth เต็มระบบ (register/login/JWT/protected routes) + Users
3. Job + Skill + Application
4. Admin (ยืนยันบัญชี/ประกาศงาน, Dashboard)
5. EmotionLog + RiskAssessment (placeholder service)
6. Community (Post/Comment) + Course/UserCourse + Notification
7. ภายหลัง: AI จริง, บทบาท counsellor เต็มรูปแบบ, Line Notify แบบเต็ม, Socket.IO เชิงลึก
