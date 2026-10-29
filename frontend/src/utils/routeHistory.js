// จำหน้าที่ผู้เข้าชมอยู่ก่อนหน้าหน้าปัจจุบัน เพื่อให้หน้าที่
// เปิดได้จากทุกที่ (โปรไฟล์) ส่งผู้ใช้กลับไปที่ที่มา
// แทนหน้าตายตัว เก็บใน sessionStorage เพื่อให้อยู่รอดหลังรีเฟรช
// storage อาจใช้ไม่ได้ (หน้าต่างส่วนตัว) จึงป้องกันทุกการเข้าถึง
// และค่าที่หายไปแปลว่า "ใช้หน้าหลักของบทบาท"
const CURRENT_KEY = "route.current";
const PREVIOUS_KEY = "route.previous";

function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // เมิน: การย้อนกลับจะถอยไปหน้าหลักของบทบาท
  }
}

export function trackRoute(pathname, search = "") {
  const next = pathname + search;
  const current = read(CURRENT_KEY);
  if (current === next) return;
  // การเปลี่ยนระหว่างส่วนของหน้าเดียวกัน (แท็บโปรไฟล์) ไม่ถือเป็นที่ใหม่
  if (current && current.split("?")[0] === pathname) {
    write(CURRENT_KEY, next);
    return;
  }
  if (current) write(PREVIOUS_KEY, current);
  write(CURRENT_KEY, next);
}

// คืนเฉพาะพาธภายในเว็บเดียวกันเท่านั้น `requirePathPrefix` ทำให้
// ลิงก์ย้อนกลับอยู่ในพื้นที่เดียว (เช่น "/employer/")
export function getPreviousRoute(excludePathPrefix, requirePathPrefix) {
  const previous = read(PREVIOUS_KEY);
  if (!previous || !previous.startsWith("/") || previous.startsWith("//")) return null;
  if (excludePathPrefix && previous.startsWith(excludePathPrefix)) return null;
  if (requirePathPrefix && !previous.startsWith(requirePathPrefix)) return null;
  if (previous.startsWith("/login") || previous.startsWith("/register")) return null;
  return previous;
}
