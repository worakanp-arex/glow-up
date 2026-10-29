const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"];

// เนื้อหาตัวอย่างและบัญชีทดสอบโหลดใช้รหัสผ่านที่รู้กันทั่วไป (อยู่ใน repository สาธารณะ)
// สคริปต์ที่สร้างข้อมูลเหล่านี้จึงต้องรันกับฐานข้อมูลในเครื่องนี้เท่านั้น
// NODE_ENV อย่างเดียวไม่ใช่ตัวป้องกัน: เพราะมันจะว่างอยู่เมื่อมีคนรันสคริปต์ด้วยมือ
// โดยมี URI ของ production อยู่ใน .env
export function assertLocalDatabase(uri = process.env.MONGODB_URI) {
  let host = "";
  try {
    host = new URL(uri).hostname.toLowerCase();
  } catch {
    // แยกวิเคราะห์ไม่ได้ (เช่น URI แบบ replica set หลายโฮสต์) ถือว่าไม่ใช่เครื่องนี้
  }
  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `Refusing to run: MONGODB_URI points at "${host || "an unrecognised host"}", not this machine. ` +
        "This script creates data with publicly known passwords and may only target a local database."
    );
  }
}
