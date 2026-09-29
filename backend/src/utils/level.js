const POINTS_PER_LEVEL = 100;

// Simple, transparent formula: every 100 cumulative points is one level.
export function computeLevel(totalPoints) {
  return 1 + Math.floor(Math.max(0, totalPoints) / POINTS_PER_LEVEL);
}

export function pointsToNextLevel(totalPoints) {
  const points = Math.max(0, totalPoints);
  return computeLevel(points) * POINTS_PER_LEVEL - points;
}
