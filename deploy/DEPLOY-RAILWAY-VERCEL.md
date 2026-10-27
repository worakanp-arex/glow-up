# คู่มืออัป glow-up ขึ้น Railway + Vercel (ไม่ต้องใช้บัตร)

```
ผู้ใช้ ──HTTPS──▶ Vercel  (หน้าเว็บ React — xxx.vercel.app)
                    │  ส่งต่อ /api, /uploads, /socket.io
                    ▼
                 Railway (backend Node.js — xxx.up.railway.app)  ── ไฟล์อัปโหลดเก็บใน Volume
                    │                    └── ส่งอีเมล OTP ผ่าน Brevo
                    ▼
                 MongoDB Atlas (ฐานข้อมูล)
```

ผู้ใช้เปิดเว็บผ่านลิงก์ Vercel ลิงก์เดียว Vercel จะส่งคำขอ API ต่อไปที่ Railway ให้เอง ทำให้คุกกี้ล็อกอินทำงานได้ตามปกติ

## ข้อจำกัดที่ควรรู้ก่อน

| เรื่อง | รายละเอียด |
|---|---|
| **Railway ฟรีแค่ช่วงทดลอง** | ได้เครดิต $5 ใช้ได้ 30 วัน หลังจากนั้นเหลือเครดิตฟรี $1/เดือน ซึ่ง **ไม่พอ** ให้ backend เปิดตลอด — เหมาะกับการสาธิต/นำเสนอภายใน 1 เดือน |
| **Railway ห้ามส่งอีเมลผ่าน SMTP (Gmail)** ในแพ็กฟรี/ทดลอง | โค้ดชุดนี้เพิ่มการส่งอีเมลผ่าน **Brevo** (ฟรี 300 ฉบับ/วัน ไม่ต้องใช้บัตร) แทนแล้ว |
| **แจ้งเตือนเรียลไทม์** | Vercel ส่งต่อ WebSocket ไม่ได้ Socket.IO จะสลับไปใช้วิธี polling อัตโนมัติ แจ้งเตือนยังทำงาน แต่ช้ากว่าเดิมเล็กน้อย |
| **Vercel Hobby** | ฟรีถาวร ไม่ต้องใช้บัตร (ใช้ได้สำหรับงานไม่เชิงพาณิชย์) |

> ⚠️ ระบบนี้เก็บข้อมูลผู้ผ่านการบำบัด ช่วงทดลองให้ใช้ **ข้อมูลสมมติ** เท่านั้น

---

## ขั้นที่ 0 — เพิ่มไฟล์ชุดนี้เข้า repo

แตกไฟล์ `glow-up-deploy.zip` ทับลงในโฟลเดอร์โปรเจ็ค แล้ว:

```sh
npm test --prefix backend
git status
git add deploy frontend/vercel.json
git commit -m "Add Railway + Vercel deployment support"
git push
```

> ⚠️ repo นี้เป็น **public** ทุกอย่างที่ push ขึ้นไปทุกคนอ่านได้ ดู `git status` ก่อน `git add` ทุกครั้ง
> และเพิ่มเฉพาะไฟล์ที่ตั้งใจ (อย่าใช้ `git add -A`) ห้ามมีไฟล์ `.env`, ไฟล์คีย์ (`*.key`, `*.pem`)
> หรือไฟล์สำรองข้อมูล (`*.gz`, `*.sql`) อยู่ในรายการ

## ขั้นที่ 1 — ฐานข้อมูล MongoDB Atlas (ฟรี)

1. สมัคร https://www.mongodb.com/cloud/atlas/register (ใช้บัญชี Google ได้)
2. **Create cluster** → **M0 (Free)** → Provider **AWS**, Region **Singapore (ap-southeast-1)**
3. **Database Access** → Add user → ตั้ง username / password (ใช้ตัวอักษรกับตัวเลข เลี่ยงอักขระพิเศษ)
4. **Network Access** → ถ้าทำได้ ให้ใส่เฉพาะ IP ขาออกคงที่ของ Railway (แผนที่มี Static Outbound IP) หรือใช้ Private Networking / VPC peering
   แทนการเปิด `0.0.0.0/0` เพราะฐานข้อมูลนี้เก็บข้อมูลสุขภาพจิต
   ถ้าแผนฟรีบังคับต้องเปิด **Allow access from anywhere** (`0.0.0.0/0`) ให้ลดความเสี่ยงดังนี้:
   - ผู้ใช้ฐานข้อมูล (ขั้นที่ 3) ให้สิทธิ์ **readWrite เฉพาะฐาน `glow-up`** ไม่ใช่ Atlas admin
   - รหัสผ่านฐานข้อมูลสุ่มยาวอย่างน้อย 24 ตัวอักษร และห้ามนำไปใช้ที่อื่น
   - เปิด Atlas alerts และเปลี่ยนรหัสผ่านทันทีเมื่อสงสัยว่ารั่ว
   - ใช้ข้อมูลจริงเมื่อย้ายไปแผนที่จำกัด IP ได้แล้วเท่านั้น (ช่วงทดลองใช้ข้อมูลสมมติ)
5. **Database → Connect → Drivers** → คัดลอก connection string แล้วเติม `glow-up` หลัง `.net/`
   ```
   mongodb+srv://growup:รหัสผ่าน@cluster0.xxxxx.mongodb.net/glow-up?retryWrites=true&w=majority
   ```

## ขั้นที่ 2 — บริการส่งอีเมล Brevo (ฟรี)

1. สมัคร https://www.brevo.com (ไม่ต้องใช้บัตร)
2. ไปที่ **Senders, Domains & Dedicated IPs → Senders → Add a sender** ใส่อีเมลที่จะใช้เป็นผู้ส่ง (เช่น Gmail ของทีม) แล้วกดยืนยันจากอีเมลที่ Brevo ส่งไป
3. ไปที่ **SMTP & API → API Keys → Generate a new API key** → คัดลอกเก็บไว้ (แสดงครั้งเดียว)

> อีเมลจากผู้ส่งที่เป็น @gmail.com ผ่าน Brevo อาจเข้า **โฟลเดอร์สแปม** ได้ ตอนทดสอบให้เช็กสแปมด้วย

## ขั้นที่ 3 — Backend บน Railway

1. สมัคร https://railway.com ด้วย **GitHub**
2. **New Project → Deploy from GitHub repo** → เลือก `glow-up` (ถ้าไม่เห็น ให้กด *Configure GitHub App* แล้วอนุญาต repo นี้)
3. คลิกที่ service ที่สร้างขึ้น → **Settings**
   - **Root Directory:** `backend`
   - **Start Command:** `npm start` (ปกติ Railway ตั้งให้เอง)
   - **Healthcheck Path:** `/api/health`
4. แท็บ **Variables** → กด **Raw Editor** แล้ววาง (แก้ค่าให้เป็นของคุณ):

   ```
   NODE_ENV=production
   TRUST_PROXY=1   # ทดสอบหลัง deploy: ดูว่า log แสดง IP ของผู้ใช้จริง ไม่ใช่ IP ของ Vercel (ดูหัวข้อ "ตรวจหลัง deploy" ท้ายไฟล์)
   SOCKET_PING_INTERVAL_MS=10000
   MONGODB_URI=mongodb+srv://...ของคุณ...
   JWT_SECRET=สุ่มอย่างน้อย32ตัวอักษร
   JWT_EXPIRES_IN=1d
   CORS_ORIGIN=https://ชั่วคราว.vercel.app
   FRONTEND_URL=https://ชั่วคราว.vercel.app
   BREVO_API_KEY=xkeysib-...
   EMAIL_FROM=อีเมลผู้ส่งที่ยืนยันใน_Brevo
   EMAIL_FROM_NAME=Glow Up
   SUPPORT_EMAIL=worakan.p@kkumail.com
   GOOGLE_CLIENT_ID=
   ```

   สร้าง `JWT_SECRET` บนคอมตัวเอง (ห้ามใช้เว็บสุ่มรหัส): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   (`CORS_ORIGIN` / `FRONTEND_URL` จะกลับมาแก้หลังได้ลิงก์ Vercel ในขั้นที่ 5)

5. **เพิ่ม Volume สำหรับไฟล์อัปโหลด** (ไม่งั้นรูป/เรซูเม่จะหายทุกครั้งที่ deploy):
   คลิกขวาที่ service (หรือกด `Ctrl/Cmd + K` พิมพ์ *volume*) → **Add Volume** → Mount path: `/app/uploads`
6. **Settings → Networking → Generate Domain** → จะได้ลิงก์เช่น `glow-up-production.up.railway.app` จดไว้
7. รอ deploy เสร็จ แล้วเปิด `https://ลิงก์-railway/api/health` ต้องเห็น `{"status":"ok"}`

## ขั้นที่ 4 — ใส่ลิงก์ Railway ใน `frontend/vercel.json`

เปิดไฟล์ `frontend/vercel.json` แทนที่ `YOUR-RAILWAY-APP.up.railway.app` ทั้ง **3 จุด** ด้วยโดเมน Railway จากขั้นที่ 3 แล้ว push:

```sh
git add frontend/vercel.json
git commit -m "Point Vercel rewrites to Railway"
git push
```

## ขั้นที่ 5 — Frontend บน Vercel

1. สมัคร https://vercel.com ด้วย **GitHub** → เลือกแพ็ก **Hobby**
2. **Add New → Project** → Import `glow-up`
3. **Root Directory:** กด *Edit* → เลือก `frontend` (Framework จะขึ้น **Vite** เอง)
4. (ถ้าใช้ Google Sign-In) **Environment Variables** → `VITE_GOOGLE_CLIENT_ID` = Client ID
5. กด **Deploy** → ได้ลิงก์เช่น `https://glow-up-xxxx.vercel.app`
6. กลับไป Railway → Variables → แก้ `CORS_ORIGIN` และ `FRONTEND_URL` เป็นลิงก์ Vercel นี้ (มี `https://` ไม่มี `/` ท้าย) → Railway จะ deploy ใหม่เอง

ถ้าใช้ Google Sign-In: ไปที่ Google Cloud Console → Credentials → OAuth Client → เพิ่มลิงก์ Vercel ใน **Authorized JavaScript origins**

## ขั้นที่ 6 — สร้างข้อมูลเริ่มต้น (รันจากคอมตัวเอง)

ในโฟลเดอร์โปรเจ็คบนคอมตัวเอง ใส่ `MONGODB_URI` ของ Atlas **เฉพาะในคำสั่งนี้** อย่าบันทึกลง `backend/.env`
(ไฟล์นั้นอาจถูก sync ขึ้นคลาวด์ เช่น OneDrive/Google Drive) และใช้อีเมลของผู้ดูแลจริง ไม่ใช่ `admin@example.com`:

```sh
npm ci --prefix backend
MONGODB_URI='mongodb+srv://...ของคุณ...' SEED_ADMIN_EMAIL=ผู้ดูแลจริง@โดเมนของคุณ SEED_ADMIN_PASSWORD='รหัสผ่านยาวอย่างน้อย10ตัว' SEED_ADMIN_NAME='ผู้ดูแลระบบ' npm run seed:admin --prefix backend
MONGODB_URI='mongodb+srv://...ของคุณ...' npm run seed:missions --prefix backend
```

รหัสผ่านผู้ดูแลต้องยาวอย่างน้อย 10 ตัวและไม่ใช่รหัสที่เดาง่าย (สคริปต์จะปฏิเสธรหัสที่อ่อน) หลังรันเสร็จให้ล้างประวัติคำสั่งของ shell
หรือใส่ `HISTCONTROL=ignorespace` แล้วเว้นวรรคหน้าคำสั่ง เพราะรหัสผ่านอยู่ในบรรทัดคำสั่ง

Windows PowerShell:

```powershell
$env:MONGODB_URI="mongodb+srv://...ของคุณ..."; $env:SEED_ADMIN_EMAIL="ผู้ดูแลจริง@โดเมนของคุณ"; $env:SEED_ADMIN_PASSWORD="รหัสผ่านยาวอย่างน้อย10ตัว"; $env:SEED_ADMIN_NAME="ผู้ดูแลระบบ"
npm.cmd run seed:admin --prefix backend
npm.cmd run seed:missions --prefix backend
Remove-Item Env:MONGODB_URI, Env:SEED_ADMIN_PASSWORD   # ล้างตัวแปรหลังใช้เสร็จ
```

เปิดลิงก์ Vercel → ลองสมัครสมาชิก รับ OTP และล็อกอิน 🎉

---

## อัปเดตเว็บหลังแก้โค้ด

แค่ `git push` — ทั้ง Vercel และ Railway จะ build และ deploy ใหม่ให้อัตโนมัติ

## แก้ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| Railway deploy ล้ม / log ขึ้น `Failed to connect to MongoDB` | ตรวจ `MONGODB_URI` และ Network Access ใน Atlas ต้องมี `0.0.0.0/0` |
| log ขึ้น `JWT_SECRET must contain at least 32 characters` | ใส่ค่าให้ยาวขึ้น |
| log ขึ้น `SMTP configuration (or BREVO_API_KEY + EMAIL_FROM) is required` | ใส่ `BREVO_API_KEY` และ `EMAIL_FROM` |
| ขอ OTP แล้วขึ้น 503 | API key ผิด หรือ `EMAIL_FROM` ยังไม่ได้ยืนยันใน Brevo — ดู log ใน Railway (Deployments → View logs) |
| ไม่ได้รับอีเมล OTP | เช็กโฟลเดอร์สแปม |
| หน้าเว็บขึ้น แต่ล็อกอินไม่ได้ / API ขึ้น 404 | ยังไม่ได้แก้ลิงก์ใน `frontend/vercel.json` (ขั้นที่ 4) หรือแก้แล้วยังไม่ push |
| ล็อกอินแล้วเด้งออก | `CORS_ORIGIN` / `FRONTEND_URL` ใน Railway ไม่ตรงกับลิงก์ Vercel |
| รูปโปรไฟล์หายหลัง deploy | ยังไม่ได้เพิ่ม Volume ที่ `/app/uploads` (ขั้นที่ 3 ข้อ 5) |
| ครบ 30 วันแล้วเว็บหยุด | เครดิตทดลองหมด — ต้องอัปเกรด Railway (เริ่ม $5/เดือน) หรือย้ายไปที่อื่น |

---

## ทางเลือก: รันทั้งหมดบน Railway ตัวเดียว (ไม่ใช้ Vercel)

ง่ายกว่าและ Socket.IO ใช้ WebSocket ได้เต็มที่ ทำแบบขั้นที่ 3 แต่เปลี่ยน:

- **Root Directory:** เว้นว่าง (ใช้ทั้ง repo)
- **Build Command:** `npm run build` · **Start Command:** `npm start`
- Variables: เพิ่ม `FRONTEND_DIST=../frontend/dist` ลบ `SOCKET_PING_INTERVAL_MS` และใส่ `VITE_GOOGLE_CLIENT_ID` (ถ้าใช้) ส่วน `CORS_ORIGIN` / `FRONTEND_URL` = ลิงก์ Railway เอง
- Volume mount path: `/app/backend/uploads`

แล้วข้ามขั้นที่ 4–5 ไปได้เลย ใช้ลิงก์ Railway เปิดเว็บ

## ตรวจหลัง deploy (ความปลอดภัย)

ทำครั้งแรกหลัง deploy เสร็จ และทุกครั้งที่เปลี่ยนโครงสร้างการเชื่อมต่อ:

1. **IP ของผู้ใช้ต้องไม่ใช่ IP ของ Vercel** — Vercel → Railway มี proxy 2 ชั้น ถ้า `req.ip` เป็น IP ของ Vercel ผู้ใช้ทุกคนจะใช้โควตา rate-limit ร่วมกัน
   (ล็อกอินผิดเกินกำหนดแล้วทุกคนถูกล็อก) ลองล็อกอินผิด 12 ครั้งจากเครื่องหนึ่ง แล้วลองล็อกอินจากอีกเครือข่าย (เช่นมือถือ 4G) ต้องไม่โดนล็อกตามไปด้วย
   ถ้าโดน ให้ปรับค่า `TRUST_PROXY` เป็นจำนวน proxy ที่ถูกต้อง
2. เปิดหน้าเว็บแล้วดูหัวข้อ response ว่ามี `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options` (DevTools → Network → เอกสารหน้าแรก)
3. ปุ่ม Google Sign-In ยังแสดงและใช้งานได้ (ถ้ามี `Content-Security-Policy` ที่ปิดกั้นเกินไปจะเห็นข้อความใน Console)
4. บน GitHub: เปิด 2FA, ตั้ง branch protection ให้ `master` (ต้องผ่าน checks ก่อน merge) เพราะการ push ขึ้น `master` deploy ขึ้น production ทันที,
   เปิด Dependabot alerts และ secret scanning (ดู `SECURITY.md`)
