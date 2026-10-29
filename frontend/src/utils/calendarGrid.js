export const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function formatThaiDate(dateKey) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(dateKey));
}

function weekdayOf(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * เติมช่องว่างนำหน้ารายการ { date: "YYYY-MM-DD", ... } ที่เรียงตามเวลา
 * เพื่อให้กริด 7 แถวแบบเรียงตามคอลัมน์ตรงกับวันในสัปดาห์จริง
 */
export function buildCalendarCells(history) {
  if (history.length === 0) return [];
  const leadingBlanks = weekdayOf(history[0].date);
  return [...Array(leadingBlanks).fill(null), ...history];
}

/**
 * สร้างกริดเดือนแบบแบน เรียงตามแถว (เริ่มวันอาทิตย์): ช่องว่าง `null`
 * นำหน้า/ท้ายเติมสัปดาห์แรกและสุดท้ายให้เต็มแถว 7 วัน ดังนั้น
 * `grid-template-columns: repeat(7, 1fr)` ธรรมดาจึงเรียงเหมือนแอปปฏิทินทั่วไป
 */
export function buildMonthGrid(year, month) {
  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = Array(startWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, dateKey: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * แบ่งรายการที่เรียงตามวันที่แล้วเป็นกลุ่มรายเดือน คงลำดับเดิม
 * (Map จำลำดับคีย์ที่เห็นก่อน ข้อมูลที่ส่งมาใหม่สุดก่อนจึงยังคงใหม่สุดก่อน)
 */
export function groupByMonth(items, dateField) {
  const groups = new Map();
  for (const item of items) {
    const d = new Date(item[dateField]);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) {
      groups.set(key, { key, year: d.getFullYear(), month: d.getMonth(), items: [] });
    }
    groups.get(key).items.push(item);
  }
  return [...groups.values()];
}

export function monthGroupLabel(year, month) {
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}
