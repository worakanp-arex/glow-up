// แยกคำอธิบายงานแบบข้อความอิสระเป็นย่อหน้าเกริ่นนำ กับรายการหัวข้อย่อย 3 กลุ่ม
// นายจ้างพิมพ์หัวข้อเป็นบรรทัดที่ลงท้ายด้วย ":" แล้วตามด้วยบรรทัดที่ขึ้นต้นด้วย "-", "•", "*" หรือ "1."
//   หน้าที่หลัก:                    -> duties        (งานที่ต้องทำ)
//   คุณสมบัติและสิ่งที่ต้องทำได้:     -> requirements  (สิ่งที่ผู้สมัครต้องมี/ทำได้)
//   สวัสดิการและเงื่อนไข:            -> benefits      (สิ่งที่ได้รับ เวลาทำงาน)
// รายการที่ไม่มีหัวข้อนำหน้าถือเป็นหน้าที่หลัก เหมือนประกาศรุ่นเก่าที่เขียนแค่ "- ..."
const SECTION_HEADINGS = [
  ["duties", /^(หน้าที่|ลักษณะงาน)/],
  ["requirements", /^(คุณสมบัติ|สิ่งที่ต้องทำได้|ความสามารถ)/],
  ["benefits", /^(สวัสดิการ|สิ่งที่ได้รับ|ผลตอบแทน)/],
];

// เครื่องหมายหัวข้อย่อยต้องมีช่องว่างตามหลังเลข ("12.5 บาท" จะไม่ถูกตัดเป็นข้อ)
const BULLET = /^(?:[-•*]\s*|\d+[.)]\s+)(.+)$/;

export function splitDescription(text) {
  const sections = { about: [], duties: [], requirements: [], benefits: [] };
  let current = "duties";
  for (const raw of (text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(BULLET);
    if (bullet) {
      sections[current].push(bullet[1]);
      continue;
    }
    const heading = line.match(/^(.+?)\s*[:：]$/);
    const section = heading && SECTION_HEADINGS.find(([, pattern]) => pattern.test(heading[1]));
    if (section) current = section[0];
    else sections.about.push(line);
  }
  return sections;
}

// ข้อความสั้นสำหรับแสดงในการ์ด/แถวที่มีที่น้อย (ย่อหน้าเกริ่นนำ ถ้าไม่มีใช้หน้าที่ข้อแรกๆ แทน)
export function jobSummary(text) {
  const { about, duties } = splitDescription(text);
  return about.join(" ") || duties.join(" · ");
}
