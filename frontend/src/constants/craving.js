// Words for the 1–10 craving slider, used wherever the number is only being
// shown back to the person (history, summaries). A bare "8/10" reads like a
// grade to chase or to fear; a few plain words describe how it felt instead.
export function cravingWord(level) {
  if (level == null || Number.isNaN(Number(level))) return null;
  const value = Number(level);
  if (value <= 2) return "แทบไม่มี";
  if (value <= 4) return "เล็กน้อย";
  if (value <= 6) return "ปานกลาง";
  if (value <= 8) return "ค่อนข้างแรง";
  return "แรงมาก";
}
