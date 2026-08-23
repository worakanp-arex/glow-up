import { toBangkokDateKey, shiftDateKey } from "../utils/dateKey.js";

const HISTORY_DAYS = 84;

/**
 * @param {{ date: Date, happinessLevel?: number }[]} logs - a user's daily check-ins
 */
export function computeStreakStats(logs, now = new Date()) {
  const dayByKey = new Map();
  for (const log of logs) {
    dayByKey.set(toBangkokDateKey(log.date), log.happinessLevel ?? null);
  }
  const todayKey = toBangkokDateKey(now);

  const loggedToday = dayByKey.has(todayKey);

  let currentStreak = 0;
  let cursor = loggedToday ? todayKey : shiftDateKey(todayKey, -1);
  while (dayByKey.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  let longestStreak = 0;
  let running = 0;
  const sortedKeys = [...dayByKey.keys()].sort();
  let prevKey = null;
  for (const key of sortedKeys) {
    if (prevKey && shiftDateKey(prevKey, 1) === key) {
      running += 1;
    } else {
      running = 1;
    }
    longestStreak = Math.max(longestStreak, running);
    prevKey = key;
  }

  const history = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i -= 1) {
    const key = shiftDateKey(todayKey, -i);
    history.push({ date: key, done: dayByKey.has(key), happinessLevel: dayByKey.get(key) ?? null });
  }

  return {
    currentStreak,
    longestStreak,
    totalCheckIns: dayByKey.size,
    loggedToday,
    history,
  };
}
