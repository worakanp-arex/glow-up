# คู่มืออัป glow-up ขึ้น Oracle Cloud (ฟรี)

ระบบที่ได้หลังทำตามคู่มือ:

```
ผู้ใช้ ──HTTPS──▶ Nginx (บนเครื่อง Oracle)
                   ├── /            → ไฟล์ frontend ที่ build แล้ว (/var/www/glow-up)
                   ├── /api, /uploads, /socket.io → backend Node.js พอร์ต 5001 (รันด้วย PM2)
                   │                                   └── ไฟล์อัปโหลดเก็บที่ backend/uploads
                   └── ฐานข้อมูล → MongoDB Atlas (ฟรี)
```

ใช้เวลาประมาณ 1–2 ชั่วโมงในครั้งแรก

---

## สิ่งที่ต้องเตรียม

| รายการ | ใช้ทำอะไร | ค่าใช้จ่าย |
|---|---|---|
| บัญชี Oracle Cloud | เครื่องเซิร์ฟเวอร์ | ฟรี (ต้องใช้บัตรเครดิต/เดบิตยืนยันตัวตน) |
| บัญชี MongoDB Atlas | ฐานข้อมูล | ฟรี (M0, 512 MB) |
| ชื่อโดเมน | ทำ HTTPS (จำเป็น เพราะคุกกี้ล็อกอินต้องใช้ HTTPS) | ฟรีด้วย DuckDNS หรือซื้อ .com ~400 บาท/ปี |
| Gmail + App Password | ส่ง OTP / ลืมรหัสผ่าน / คำเชิญครอบครัว | ฟรี |
| (ถ้าใช้) Google Client ID | ปุ่ม Google Sign-In | ฟรี |

> ⚠️ ระบบนี้เก็บข้อมูลผู้ผ่านการบำบัด ช่วงทดลองให้ใช้ **ข้อมูลสมมติ** เท่านั้น ก่อนใช้กับผู้ป่วยจริงควรตกลงเรื่องการเก็บข้อมูล (PDPA) กับโรงพยาบาลก่อน

---

## ขั้นที่ 0 — เพิ่มไฟล์ชุดนี้เข้า repo

แตกไฟล์ `glow-up-deploy.zip` ทับลงในโฟลเดอร์โปรเจ็คบนเครื่องตัวเอง (จะได้โฟลเดอร์ `deploy/` และ `backend/src/app.js` ที่แก้แล้ว) จากนั้น:

```sh
npm test --prefix backend
git add deploy backend/src/app.js
git commit -m "Add Oracle Cloud deployment files"
git push
```

## ขั้นที่ 1 — สมัคร Oracle Cloud

1. สมัครที่ https://www.oracle.com/cloud/free/
2. ตอนเลือก **Home Region** ให้เลือก **Singapore** (ใกล้ไทยที่สุด) — *เลือกแล้วเปลี่ยนไม่ได้*
3. ยืนยันบัตร (Oracle อาจตัดเงินทดสอบเล็กน้อยแล้วคืนให้)

## ขั้นที่ 2 — สร้างเครื่องเซิร์ฟเวอร์ (VM)

1. เมนู ☰ → **Compute → Instances → Create instance**
2. **Name:** `glow-up`
3. **Image:** กด *Change image* → **Canonical Ubuntu 24.04**
4. **Shape:** กด *Change shape* → **Ampere** → `VM.Standard.A1.Flex` → ตั้ง **2 OCPU / 12 GB RAM**
   (ต้องมีป้าย *Always Free-eligible*; ถ้าไม่แน่ใจ ใช้ 1 OCPU / 6 GB ก็พอ)
5. **Networking:** ปล่อยค่าเดิม ให้แน่ใจว่าติ๊ก **Assign a public IPv4 address**
6. **SSH keys:** เลือก *Generate a key pair for me* → กด **Save private key** (ได้ไฟล์ `.key`) เก็บไว้ให้ดี หายแล้วเข้าเครื่องไม่ได้
7. กด **Create** รอจนสถานะเป็น **Running** แล้วจด **Public IP address**

> ถ้าเจอ **"Out of capacity"** แปลว่าเครื่อง ARM ฟรีในโซนนั้นเต็ม ให้ลองเปลี่ยน *Availability domain* หรือลองใหม่ช่วงเช้ามืด/อีกวัน

## ขั้นที่ 3 — เปิดพอร์ต 80 และ 443 ใน Oracle

1. ในหน้า Instance → คลิกชื่อ **Subnet** → คลิก **Security List** (Default Security List)
2. **Add Ingress Rules** เพิ่ม 2 แถว:

| Source CIDR | IP Protocol | Destination Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(ไฟร์วอลล์ภายในเครื่อง Ubuntu สคริปต์ `setup-server.sh` จะเปิดให้เอง)

## ขั้นที่ 4 — ตั้งโดเมน

**แบบฟรี (DuckDNS):**
1. เข้า https://www.duckdns.org ล็อกอินด้วย Google
2. ตั้งชื่อ เช่น `growup-kku` → ได้โดเมน `growup-kku.duckdns.org`
3. ช่อง **current ip** ใส่ Public IP จากขั้นที่ 2 → กด **update ip**

**แบบซื้อโดเมน:** สร้าง **A record** ชี้ไปที่ Public IP

ต่อไปในคู่มือนี้จะเรียกโดเมนนี้ว่า `YOUR_DOMAIN`

## ขั้นที่ 5 — สร้างฐานข้อมูล MongoDB Atlas

1. สมัคร https://www.mongodb.com/cloud/atlas/register
2. **Create cluster** → เลือก **M0 (Free)** → Provider **AWS**, Region **Singapore (ap-southeast-1)**
3. **Database Access** → Add user → ตั้ง username / password (จดไว้; ใช้ตัวอักษรกับตัวเลข เลี่ยงอักขระพิเศษ)
4. **Network Access** → Add IP Address → ใส่ **Public IP ของเครื่อง Oracle** (ไม่แนะนำ `0.0.0.0/0`)
5. **Database → Connect → Drivers** → คัดลอก connection string แล้วเติมชื่อฐานข้อมูล `glow-up` หลัง `.net/` เช่น
   ```
   mongodb+srv://growup:รหัสผ่าน@cluster0.xxxxx.mongodb.net/glow-up?retryWrites=true&w=majority
   ```

## ขั้นที่ 6 — เตรียม Gmail สำหรับส่งอีเมล

1. บัญชี Google ที่จะใช้ส่ง → **Security** → เปิด **2-Step Verification**
2. ค้นหา **App passwords** → สร้างใหม่ → ได้รหัส 16 ตัว (นี่คือ `SMTP_PASS`)

## ขั้นที่ 7 — เข้าเครื่องเซิร์ฟเวอร์ด้วย SSH

**Windows (PowerShell) / macOS / Linux:**

```sh
ssh -i path/to/ssh-key.key ubuntu@PUBLIC_IP
```

Windows ถ้าขึ้น error เรื่อง permission ของไฟล์ key ให้รันใน PowerShell:

```powershell
icacls .\ssh-key.key /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

macOS / Linux: `chmod 600 ssh-key.key`

## ขั้นที่ 8 — ติดตั้งโปรแกรมบนเครื่อง (ทำครั้งเดียว)

```sh
git clone https://github.com/worakanp-arex/glow-up.git
cd glow-up
bash deploy/setup-server.sh
```

สคริปต์จะติดตั้ง Node.js 22, Nginx, PM2, certbot เปิดไฟร์วอลล์พอร์ต 80/443 และเพิ่ม swap

## ขั้นที่ 9 — ตั้งค่า environment

**Backend:**

```sh
cp deploy/backend.env.production.example backend/.env
openssl rand -hex 32        # คัดลอกผลลัพธ์ไปใส่ JWT_SECRET
nano backend/.env
```

กรอกให้ครบ: `MONGODB_URI`, `CORS_ORIGIN`, `FRONTEND_URL` (ใส่ `https://YOUR_DOMAIN`), `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
บันทึกใน nano: `Ctrl+O` → `Enter` → `Ctrl+X`

**Frontend** (เฉพาะถ้าใช้ Google Sign-In):

```sh
echo "VITE_GOOGLE_CLIENT_ID=ใส่_client_id" > frontend/.env
```

และใส่ค่าเดียวกันใน `GOOGLE_CLIENT_ID` ของ `backend/.env` จากนั้นไปที่ Google Cloud Console → Credentials → OAuth Client → เพิ่ม `https://YOUR_DOMAIN` ใน **Authorized JavaScript origins**

## ขั้นที่ 10 — ตั้งค่า Nginx

```sh
sudo cp deploy/nginx/glow-up.conf /etc/nginx/sites-available/glow-up
sudo sed -i 's/YOUR_DOMAIN/growup-kku.duckdns.org/' /etc/nginx/sites-available/glow-up   # เปลี่ยนเป็นโดเมนของคุณ
sudo ln -sf /etc/nginx/sites-available/glow-up /etc/nginx/sites-enabled/glow-up
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## ขั้นที่ 11 — Build และเปิดระบบ

```sh
bash deploy/deploy.sh
```

ถ้าขึ้น `{"status":"ok"}` และ `Deploy finished.` แปลว่า backend ทำงานแล้ว

ตั้งให้ backend เปิดเองทุกครั้งที่เครื่องรีสตาร์ท:

```sh
pm2 startup        # จะแสดงคำสั่ง sudo ... ให้คัดลอกคำสั่งนั้นไปรันอีกที
pm2 save
```

## ขั้นที่ 12 — เปิด HTTPS

```sh
sudo certbot --nginx -d YOUR_DOMAIN
```

ใส่อีเมล → ยอมรับเงื่อนไข → certbot จะตั้ง HTTPS และ redirect จาก http ให้อัตโนมัติ (ต่ออายุเองทุก 90 วัน)

เปิด `https://YOUR_DOMAIN` ในเบราว์เซอร์ — ควรเห็นหน้าเว็บ glow-up 🎉

## ขั้นที่ 13 — สร้างข้อมูลเริ่มต้น

```sh
cd ~/glow-up
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='รหัสผ่านที่แข็งแรง' SEED_ADMIN_NAME='ผู้ดูแลระบบ' npm run seed:admin --prefix backend
npm run seed:missions --prefix backend
```

---

## อัปเดตเว็บหลังแก้โค้ด

push โค้ดขึ้น GitHub แล้วบนเซิร์ฟเวอร์รัน:

```sh
cd ~/glow-up
bash deploy/deploy.sh
```

## สำรองข้อมูล (ควรทำสม่ำเสมอ)

Atlas M0 **ไม่มีระบบ backup อัตโนมัติ** และไฟล์อัปโหลดอยู่บนเครื่อง ให้สำรองทั้งสองอย่าง:

```sh
# ไฟล์อัปโหลด
tar czf ~/uploads-$(date +%F).tar.gz -C ~/glow-up/backend uploads

# ฐานข้อมูล (ติดตั้งเครื่องมือครั้งแรก: sudo apt-get install -y mongodb-database-tools
#  ถ้าไม่มีใน apt ให้ดาวน์โหลดจากเว็บ MongoDB)
mongodump --uri "MONGODB_URI_ของคุณ" --archive=$HOME/db-$(date +%F).gz --gzip
```

แล้วดาวน์โหลดไฟล์ backup ลงเครื่องตัวเอง:

```sh
scp -i ssh-key.key ubuntu@PUBLIC_IP:~/uploads-*.tar.gz .
```

---

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่น่าจะเป็น / วิธีแก้ |
|---|---|
| เปิดเว็บไม่ได้เลย (timeout) | ยังไม่เปิดพอร์ตใน Security List (ขั้นที่ 3) หรือโดเมนยังไม่ชี้ IP — เช็กด้วย `ping YOUR_DOMAIN` |
| `502 Bad Gateway` | backend ไม่ทำงาน → `pm2 logs glow-up-api` |
| log ขึ้น `Failed to connect to MongoDB` | `MONGODB_URI` ผิด หรือยังไม่ได้เพิ่ม IP เครื่องใน Atlas Network Access |
| log ขึ้น `JWT_SECRET must contain at least 32 characters` | ใส่ค่าจาก `openssl rand -hex 32` |
| log ขึ้น `SMTP configuration is required` | กรอก `SMTP_HOST/USER/PASS` ให้ครบ |
| ล็อกอินแล้วเด้งกลับหน้า login | ยังไม่มี HTTPS (ขั้นที่ 12) หรือ `CORS_ORIGIN` ไม่ตรงกับโดเมน |
| ขอ OTP แล้วขึ้น 503 / ไม่ได้รับอีเมล | App Password ผิด หรือดูในโฟลเดอร์สแปม |
| แจ้งเตือนเรียลไทม์ไม่ขึ้น | ตรวจว่าใช้ไฟล์ nginx ในชุดนี้ (มีส่วน `/socket.io/`) |
| อัปโหลดไฟล์แล้วขึ้น `413` | ยังไม่ได้ reload nginx หลังคัดลอก config |
| `npm ci` ค้างหรือถูก kill | RAM ไม่พอ — ตรวจว่ามี swap: `free -h` |

คำสั่งที่ใช้บ่อย:

```sh
pm2 status                 # ดูสถานะ backend
pm2 logs glow-up-api       # ดู log
pm2 restart glow-up-api    # รีสตาร์ท backend
sudo systemctl reload nginx
```
