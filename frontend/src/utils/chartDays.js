// `count` วันตามปฏิทิน Asia/Bangkok ล่าสุดเป็น "YYYY-MM-DD" เก่าสุดก่อน —
// ใช้ให้กราฟแนวโน้มมีจุดทุกวัน รวมวันที่ไม่มีข้อมูล
const BANGKOK_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" });

export function lastDays(count, now = new Date()) {
  const days = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(BANGKOK_DAY.format(new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)));
  }
  return days;
}

// ขอบบนและขั้นที่ "สวย" สำหรับแกนจำนวนที่เริ่มที่ 0
export function niceAxis(max) {
  const top = Math.max(1, max);
  const rough = top / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((n) => n * magnitude).find((candidate) => candidate >= rough) || magnitude * 10;
  return { max: Math.ceil(top / step) * step, step };
}
