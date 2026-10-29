import { getSetting } from "../services/settingsService.js";

export const DEFAULT_POINTS_PER_LEVEL = 100;
export const POINTS_PER_LEVEL_SETTING_KEY = "pointsPerLevel";

export async function getPointsPerLevel() {
  return getSetting(POINTS_PER_LEVEL_SETTING_KEY, DEFAULT_POINTS_PER_LEVEL);
}

// สูตรที่เรียบง่ายและโปร่งใส: ทุก N คะแนนสะสม (แอดมินปรับได้
// ผ่าน /api/admin/settings/points-per-level) เท่ากับหนึ่งระดับ
export async function computeLevel(totalPoints) {
  const pointsPerLevel = await getPointsPerLevel();
  return 1 + Math.floor(Math.max(0, totalPoints) / pointsPerLevel);
}

export async function pointsToNextLevel(totalPoints) {
  const pointsPerLevel = await getPointsPerLevel();
  const points = Math.max(0, totalPoints);
  const level = 1 + Math.floor(points / pointsPerLevel);
  return level * pointsPerLevel - points;
}
