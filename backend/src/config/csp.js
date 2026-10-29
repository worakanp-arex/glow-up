// Content-Security-Policy สำหรับหน้าเว็บของแอป (ไม่รวม JSON API ซึ่งใช้ค่าเริ่มต้นที่เข้มกว่าของ helmet)
// ระบุทุกอย่างที่หน้าเว็บอนุญาตให้โหลด ดังนั้นสคริปต์ที่ถูกแทรกเข้ามาจะรันไม่ได้
// (ไม่มีสคริปต์ inline หรือของบุคคลที่สามนอกจาก Google Sign-In) และส่งข้อมูลไปที่อื่นไม่ได้
// นอกจากเว็บไซต์นี้และบริการล็อกอินของ Google
//
// นโยบายเดียวกันนี้ถูกเขียนซ้ำด้วยมือใน deploy/nginx/security-headers.conf และ
// frontend/vercel.json ซึ่ง import ไฟล์นี้ไม่ได้ ส่วน test/security-headers.test.js
// จะล้มเหลวหากทั้งสามที่ไม่ตรงกัน ต้องแก้พร้อมกันเสมอ
export const PAGE_CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  // สคริปต์ของแอปเอง บวกสคริปต์ล็อกอินของ Google
  "script-src": ["'self'", "https://accounts.google.com/gsi/client"],
  // สไตล์ชีตเป็นไฟล์ของแอปเอง (และสไตล์ปุ่มของ Google Sign-In)
  // แอตทริบิวต์ style="" ของ React ต้องใช้ข้อยกเว้นเฉพาะแอตทริบิวต์ สคริปต์ล็อกอินของ Google
  // ยังเขียนองค์ประกอบ <style> คงที่หนึ่งชิ้นลงในหน้า จึงอนุญาตด้วยค่าแฮช
  // (ตามที่เบราว์เซอร์รายงานว่าถูกบล็อก) แทนการเปิด inline style ทั้งหมด
  // หาก Google เปลี่ยน CSS นั้น แฮชจะไม่ตรง: คอนโซลจะแสดงการละเมิดนโยบาย และปุ่มจะเสียเฉพาะความสวยงาม
  "style-src": ["'self'", "https://accounts.google.com/gsi/style", "'sha256-RU4sU0AaS8IBGZx8XrGt/pa9A5SLA3dQszGeqT5L3Kw='"],
  "style-src-attr": ["'unsafe-inline'"],
  // รูปโปรไฟล์และรูปบทความมาจากเว็บ https อื่น ส่วน blob:
  // คือตัวอย่างของไฟล์ที่ผู้ใช้เพิ่งเลือก
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'", "https://accounts.google.com/gsi/"],
  "frame-src": ["https://accounts.google.com/gsi/"],
};

export function pageCspHeader() {
  return Object.entries(PAGE_CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}
