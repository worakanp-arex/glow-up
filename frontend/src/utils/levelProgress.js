// Level maths shared by the growth card and the points page. Mirrors the
// backend rule (utils/level.js): every `pointsPerLevel` cumulative points is
// one level. `summary` is the /missions/me/summary response; missing fields
// fall back to sensible defaults so a partial response still renders.
export function levelProgress(summary) {
  const perLevel = summary?.pointsPerLevel > 0 ? summary.pointsPerLevel : 100;
  const total = Math.max(0, summary?.totalPoints ?? 0);
  const level = summary?.level ?? 1 + Math.floor(total / perLevel);
  const into = Math.max(0, Math.min(perLevel, total - (level - 1) * perLevel));
  const remaining = summary?.pointsToNextLevel ?? Math.max(0, level * perLevel - total);
  const percent = Math.min(100, Math.round((into / perLevel) * 100));
  return { level, total, perLevel, into, remaining, percent, remainingPercent: 100 - percent };
}
