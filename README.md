# glow-up

แพลตฟอร์มสนับสนุนโอกาสการทำงาน การเรียนรู้ และการดูแลตัวเองสำหรับผู้ผ่านการบำบัด

## โครงสร้างและฟีเจอร์

- `frontend/`: React 19 + Vite, UI ภาษาไทย โทนฟ้า รองรับมือถือและโหมดมืด เมนูตามบทบาท และโหลดหน้าแบบ lazy
- `backend/`: Express + MongoDB/Mongoose, JWT ผ่าน HttpOnly cookie, Socket.IO สำหรับแจ้งเตือน
- บทบาท: ผู้ใช้งาน นายจ้าง บุคลากรทางการแพทย์ และผู้ดูแลระบบ
- สมัครสมาชิกด้วย OTP / Google Sign-In, โปรไฟล์ ทักษะ และเอกสาร
- ค้นหางาน สมัครงาน จัดการผู้สมัคร และยืนยันนายจ้าง/ประกาศงาน
- เช็คอินอารมณ์ สถิติต่อเนื่อง แบบประเมินรายสัปดาห์ และนัดปรึกษา
- ชุมชน คอร์ส บทเรียน สถานการณ์ฝึกฝน ภารกิจ และรางวัล
- เชิญครอบครัวติดตามเฉพาะสรุปความก้าวหน้า

## เริ่มต้น

ใช้ Node.js 22.12 ขึ้นไป และ MongoDB ที่เปิดใช้งานอยู่

```sh
npm ci --prefix backend
npm ci --prefix frontend
```

คัดลอก `backend/.env.example` เป็น `backend/.env` แล้วตั้ง `MONGODB_URI` และ `JWT_SECRET`
คัดลอก `frontend/.env.example` เป็น `frontend/.env` หากต้องใช้ Google Sign-In หรือเปลี่ยน API proxy

เปิดคนละ terminal:

```sh
npm run dev --prefix backend
npm run dev --prefix frontend
```

Backend ใช้พอร์ต **5001**, frontend ใช้ **5173** หากเปลี่ยนพอร์ต backend ให้ตั้ง `API_PROXY_TARGET` ใน frontend ให้ตรงกัน
บน Windows PowerShell ที่บล็อก `npm.ps1` ให้ใช้ `npm.cmd` แทน `npm`

สร้างข้อมูลเริ่มต้นเมื่อจำเป็น:

```sh
npm run seed:admin --prefix backend
npm run seed:missions --prefix backend
```

ตั้ง `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` และ `SEED_ADMIN_NAME` ก่อนสร้าง admin
การ seed ภารกิจจะเพิ่มหรืออัปเดตรายการภารกิจและรางวัลในฐานข้อมูลที่ตั้งค่าไว้

## การตั้งค่าและข้อมูลส่วนตัว

- โหลด environment ก่อนสร้างบริการ Google/SMTP; production ต้องมี JWT secret อย่างน้อย 32 ตัวอักษรและ SMTP
- โหมดพัฒนาเมื่อไม่ตั้ง SMTP จะแสดง OTP/ลิงก์รีเซ็ตใน console และ API response สำหรับทดสอบเท่านั้น
- รหัสผ่านของคำขอสมัครที่รอ OTP ถูก hash ก่อนบันทึก คำขอเก่าที่ไม่มี hash ต้องขอ OTP ใหม่
- รูปโปรไฟล์ยังเป็น public; เรซูเม่ เกียรติบัตร และเอกสารสมัครงานต้องเข้าสู่ระบบและผ่านการตรวจสิทธิ์
- นายจ้างที่ยืนยันแล้วเข้าถึงเอกสารได้เฉพาะผู้สมัครในงานของตนเอง; admin มีสิทธิ์จัดการเอกสาร
- Socket.IO ตรวจ token และเลือกห้องจากตัวตนที่เซิร์ฟเวอร์ยืนยัน ไม่รับรหัสห้องจาก client
- ผู้รับคำเชิญครอบครัวต้องใช้บัญชีผู้ใช้งานที่อีเมลตรงกับคำเชิญ

## คะแนนและการแบ่งหน้า

เปอร์เซ็นต์ทักษะตรงกับงาน = จำนวนทักษะที่ผู้ใช้มีและตรงกับงาน / จำนวนทักษะที่งานระบุ
พร้อมแสดงชื่อทักษะที่ตรงกัน หากงานไม่ระบุทักษะจะแสดงว่ายังไม่ระบุ แทนการสร้างคะแนนขึ้นมา
คะแนนนี้ไม่ได้ใช้ข้อมูลสุขภาพ และไม่ใช่โมเดล AI; การประเมินความเสี่ยงยังใช้สูตรตามเกณฑ์ในโค้ด

`GET /api/jobs?page=1&limit=10` คืน array เช่นเดิม พร้อม `X-Total-Count` ใน response header จำกัดไม่เกิน 50 รายการต่อหน้า
เมื่อไม่ส่ง page จะคงรูปแบบเดิมสำหรับผู้เรียกที่มีอยู่ รายการอื่นแบ่งหน้าฝั่ง frontend

## ตรวจสอบ

```sh
npm test --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
npm test --prefix frontend
```

Backend tests ใช้ model doubles และ configuration สำหรับทดสอบ ไม่เชื่อมฐานข้อมูลจริงหรือส่งอีเมล
Browser tests ใช้ API fixtures เพื่อตรวจทุกบทบาทบน desktop, mobile และ dark mode รวม error/retry และ pagination
บน Windows ใช้ Chrome ที่ติดตั้งในเครื่อง; บนระบบอื่นติดตั้ง Chromium ด้วย `npx playwright install chromium` ในโฟลเดอร์ frontend
ผลภาพและ trace อยู่ใน `frontend/test-results/`

GitHub Actions รัน backend tests, lint, build และ browser tests ทุก push / pull request
การทดสอบเหล่านี้ยังไม่แทนการทดสอบกับ MongoDB, SMTP และ Google OAuth ที่ตั้งค่าจริง

## ก่อนอัปเกรดระบบที่มีข้อมูลอยู่

มี unique index ใหม่บน `Application(user, job)` เพื่อกันสมัครซ้ำจากคำขอพร้อมกัน
ตรวจและจัดการคู่ user/job ที่ซ้ำในฐานข้อมูลเดิมก่อนสร้าง index โดยสำรองข้อมูลก่อนเสมอ
ไฟล์เดิมยังใช้ URL เดิมได้ แต่เอกสารส่วนตัวต้องมี session ที่ได้รับสิทธิ์
