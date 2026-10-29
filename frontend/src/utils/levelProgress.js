// การคำนวณระดับที่ใช้ร่วมกันระหว่างการ์ดการเติบโตและหน้าคะแนน สะท้อน
// กฎของ backend (utils/level.js): ทุก `pointsPerLevel` คะแนนสะสมเท่ากับ
// หนึ่งระดับ `summary` คือ response ของ /missions/me/summary ฟิลด์ที่ขาด
// ใช้ค่าเริ่มต้นที่สมเหตุสมผล เพื่อให้ response ไม่ครบก็ยังเรนเดอร์ได้
export function levelProgress(summary) {
  const perLevel = summary?.pointsPerLevel > 0 ? summary.pointsPerLevel : 100;
  const total = Math.max(0, summary?.totalPoints ?? 0);
  const level = summary?.level ?? 1 + Math.floor(total / perLevel);
  const into = Math.max(0, Math.min(perLevel, total - (level - 1) * perLevel));
  const remaining = summary?.pointsToNextLevel ?? Math.max(0, level * perLevel - total);
  const percent = Math.min(100, Math.round((into / perLevel) * 100));
  return { level, total, perLevel, into, remaining, percent, remainingPercent: 100 - percent };
}
