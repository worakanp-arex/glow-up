# คลังภาพ

ไฟล์ในโฟลเดอร์นี้ถูกเรียกผ่าน `<ImageSlot>` (`src/components/common/ImageSlot.jsx`) หรือ `PageHeader art`
ถ้าไฟล์หาย หน้าเว็บจะแสดงพื้นสีอ่อนแทน เปลี่ยนภาพได้โดยวางไฟล์ชื่อเดิมทับ ไม่ต้องแก้โค้ด

| ไฟล์ | ใช้ที่ | ขนาด |
| --- | --- | --- |
| `illustrations/mascot.webp` | การ์ดต้อนรับหน้าแรก แดชบอร์ด การ์ดเด่นบทเรียน | 385×405 |
| `illustrations/nurse.webp` | หัวหน้าปรึกษา/บุคลากร (`PageHeader art="nurse"` กรอบคงที่ 88px) | 365×402 |
| `illustrations/family.webp` | หน้าครอบครัว/ผู้ดูแล | 470×425 |
| `illustrations/banner.webp` | แบนเนอร์ GROW UP | 1053×449 |
| `illustrations/mood-*.webp` | หน้าอารมณ์ 8 แบบ | 160×160 |
| `avatars/user.webp` `staff.webp` `family.webp` | รูปโปรไฟล์ดีฟอลต์ตามบทบาท (`src/utils/defaultAvatar.js`) นายจ้าง/ผู้ดูแลระบบใช้อักษรย่อ | 256×256 |
| `games/memory.png` `quiz.png` `wheel.png` | การ์ดเกม จับคู่ ดูแลใจ / เลือกทางของคุณ / วงล้อก้าวเล็ก ๆ | 800×500 |
| `lessons/cover-1.png` … `cover-4.png` | ภาพปกการ์ดบทเรียน (วนใช้ตามลำดับ) | 800×450 |
| `lessons/scenario.png` | ภาพปกการ์ดสถานการณ์จำลอง | 800×450 |

กติกาตัวละคร: หนึ่งหน้ามีตัวละครหลักตัวเดียว วางในกรอบที่สูงคงที่ (position absolute) เพื่อไม่ให้สเกลส่วนอื่นเปลี่ยน และไม่วางในตาราง แบบฟอร์ม หรือหน้าผู้ดูแลระบบ
