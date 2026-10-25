import GamePlay from "../models/GamePlay.js";
import EmotionLog from "../models/EmotionLog.js";
import ActivityMissionLog from "../models/ActivityMissionLog.js";
import UserCourse from "../models/UserCourse.js";
import { computeStreakStats } from "../services/streakService.js";
import { checkAndAwardRewards } from "../services/rewardService.js";
import { toBangkokDateKey } from "../utils/dateKey.js";
import { RECOVERY_DOMAINS, WHEEL_SEGMENTS, COPING_PAIRS, QUIZ_BANK, EMOTION_CHOICES, EMOTION_SCENARIOS, BREATHING_ROUNDS } from "../constants/gameContent.js";

const GAME_TYPES = ["wheel", "memory", "quiz", "breathing", "emotion"];

// Games are open to play any time and as often as the user likes. Only the
// first play of each game per Bangkok day is recorded and earns points (the
// unique index on GamePlay enforces that); later plays are practice rounds.
function isDuplicate(err) {
  return err?.code === 11000;
}

function pickTodaysQuiz(dateKey) {
  const seed = dateKey.split("-").reduce((sum, part) => sum + Number(part), 0);
  const start = seed % QUIZ_BANK.length;
  const picked = [];
  for (let i = 0; i < 3; i += 1) {
    picked.push(QUIZ_BANK[(start + i) % QUIZ_BANK.length]);
  }
  return picked;
}

// A streak counts consecutive Bangkok days with at least one recorded play.
function streakFromPlays(plays) {
  const stats = computeStreakStats(plays.map((play) => ({ date: new Date(`${play.dateKey}T12:00:00+07:00`) })));
  return { current: stats.currentStreak, longest: stats.longestStreak, playedToday: stats.loggedToday };
}

export async function getGameHubStatus(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const allPlays = await GamePlay.find({ user: req.user.id }).select("gameType dateKey pointsAwarded resultLabel");
  const todaysPlays = allPlays.filter((play) => play.dateKey === dateKey);

  const playedByType = new Map(todaysPlays.map((p) => [p.gameType, p]));
  const games = {};
  for (const type of GAME_TYPES) {
    const play = playedByType.get(type);
    const streak = streakFromPlays(allPlays.filter((p) => p.gameType === type));
    games[type] = play
      ? { played: true, pointsAwarded: play.pointsAwarded, resultLabel: play.resultLabel, streak }
      : { played: false, streak };
  }

  res.json({
    unlocked: true,
    games,
    streak: streakFromPlays(allPlays),
    wheelSegments: WHEEL_SEGMENTS.map((segment) => segment.label),
  });
}

function pickTodaysEmotions(dateKey) {
  const seed = dateKey.split("-").reduce((sum, part) => sum + Number(part), 0);
  const start = seed % EMOTION_SCENARIOS.length;
  return Array.from({ length: 5 }, (_, i) => EMOTION_SCENARIOS[(start + i * 2) % EMOTION_SCENARIOS.length]);
}

export async function getEmotionToday(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const play = await GamePlay.findOne({ user: req.user.id, gameType: "emotion", dateKey });
  const labelByKey = new Map(EMOTION_CHOICES.map((choice) => [choice.key, choice.label]));
  res.json({
    played: Boolean(play),
    result: play || null,
    questions: pickTodaysEmotions(dateKey).map(({ id, situation, options }) => ({
      id,
      situation,
      options: options.map((key) => ({ key, label: labelByKey.get(key) })),
    })),
  });
}

export async function submitEmotion(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const questions = pickTodaysEmotions(dateKey);
  const answers = req.body.answers || {};
  let correctCount = 0;
  for (const question of questions) {
    if (answers[question.id] === question.correct) correctCount += 1;
  }
  const answerKey = questions.map(({ id, correct }) => ({ id, correct }));

  let play;
  try {
    play = await GamePlay.create({
      user: req.user.id,
      gameType: "emotion",
      dateKey,
      domain: "self_awareness",
      pointsAwarded: correctCount,
      resultLabel: `${correctCount}/${questions.length} ข้อ`,
    });
  } catch (err) {
    if (isDuplicate(err)) return res.json({ correctCount, total: questions.length, answerKey, practice: true, pointsAwarded: 0 });
    throw err;
  }

  await checkAndAwardRewards(req.user.id);
  res.status(201).json({ correctCount, total: questions.length, answerKey, practice: false, pointsAwarded: correctCount, play });
}

// The 4-7-8 timer runs in the browser; the server just records a finished
// session. Finishing every round earns the full 5 points, fewer earns 3.
export async function submitBreathing(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const rounds = Math.max(0, Math.min(20, Number.parseInt(req.body.rounds, 10) || 0));
  if (rounds < 1) return res.status(400).json({ message: "ต้องหายใจอย่างน้อย 1 รอบ" });
  const points = rounds >= BREATHING_ROUNDS ? 5 : 3;

  let play;
  try {
    play = await GamePlay.create({
      user: req.user.id,
      gameType: "breathing",
      dateKey,
      domain: "mindfulness",
      pointsAwarded: points,
      resultLabel: `${rounds} รอบ`,
    });
  } catch (err) {
    if (isDuplicate(err)) return res.json({ rounds, practice: true, pointsAwarded: 0 });
    throw err;
  }

  await checkAndAwardRewards(req.user.id);
  res.status(201).json({ rounds, practice: false, pointsAwarded: points, play });
}

export async function spinWheel(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const segment = WHEEL_SEGMENTS[Math.floor(Math.random() * WHEEL_SEGMENTS.length)];
  const segmentIndex = WHEEL_SEGMENTS.indexOf(segment);

  let play;
  try {
    play = await GamePlay.create({
      user: req.user.id,
      gameType: "wheel",
      dateKey,
      domain: segment.domain,
      pointsAwarded: segment.points,
      resultLabel: segment.label,
    });
  } catch (err) {
    if (isDuplicate(err)) return res.json({ segmentIndex, segment, practice: true, pointsAwarded: 0 });
    throw err;
  }

  await checkAndAwardRewards(req.user.id);
  res.status(201).json({ segmentIndex, segment, play, practice: false, pointsAwarded: segment.points });
}

export async function getMemoryPairs(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const play = await GamePlay.findOne({ user: req.user.id, gameType: "memory", dateKey });
  res.json({ pairs: COPING_PAIRS, played: Boolean(play), result: play || null });
}

export async function submitMemoryResult(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const moves = Number(req.body.moves) || COPING_PAIRS.length * 2;
  const minMoves = COPING_PAIRS.length;
  let points = 5;
  if (moves <= minMoves + 2) points = 10;
  else if (moves <= minMoves + 6) points = 7;

  let play;
  try {
    play = await GamePlay.create({
      user: req.user.id,
      gameType: "memory",
      dateKey,
      domain: "coping",
      pointsAwarded: points,
      resultLabel: `${moves} ครั้ง`,
    });
  } catch (err) {
    if (isDuplicate(err)) return res.json({ moves, practice: true, pointsAwarded: 0 });
    throw err;
  }

  await checkAndAwardRewards(req.user.id);
  res.status(201).json({ moves, practice: false, pointsAwarded: points, play });
}

export async function getDailyQuiz(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const [play, questions] = await Promise.all([
    GamePlay.findOne({ user: req.user.id, gameType: "quiz", dateKey }),
    Promise.resolve(pickTodaysQuiz(dateKey)),
  ]);

  res.json({
    played: Boolean(play),
    result: play || null,
    questions: questions.map(({ id, question, options }) => ({ id, question, options })),
  });
}

export async function submitQuiz(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const todaysQuestions = pickTodaysQuiz(dateKey);
  const answers = req.body.answers || {};
  let correctCount = 0;
  for (const question of todaysQuestions) {
    if (answers[question.id] === question.correctIndex) correctCount += 1;
  }
  const points = correctCount * 3;
  // Revealed only after submitting, so the player can see what they missed.
  const answerKey = todaysQuestions.map(({ id, correctIndex }) => ({ id, correctIndex }));

  let play;
  try {
    play = await GamePlay.create({
      user: req.user.id,
      gameType: "quiz",
      dateKey,
      domain: "learning",
      pointsAwarded: points,
      resultLabel: `${correctCount}/${todaysQuestions.length} ข้อ`,
    });
  } catch (err) {
    if (isDuplicate(err)) {
      return res.json({ correctCount, total: todaysQuestions.length, answerKey, practice: true, pointsAwarded: 0 });
    }
    throw err;
  }

  await checkAndAwardRewards(req.user.id);
  res.status(201).json({ correctCount, total: todaysQuestions.length, answerKey, practice: false, pointsAwarded: points, play });
}

// Normalization targets are heuristic (documented, not clinically derived) —
// the count of that domain's activity in the last 30 days needed to reach a
// 100% axis on the radar chart.
const DOMAIN_TARGETS = {
  self_awareness: 20,
  coping: 15,
  routine: 15,
  physical: 10,
  learning: 12,
  self_monitoring: 14,
  social: 10,
  mindfulness: 12,
};

export async function getMyRadar(req, res) {
  const userId = req.user.id;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [emotionLogs, activityLogs, gamePlays, completedCourses] = await Promise.all([
    EmotionLog.find({ user: userId, date: { $gte: since } }),
    ActivityMissionLog.find({ user: userId, createdAt: { $gte: since } }),
    GamePlay.find({ user: userId, createdAt: { $gte: since } }),
    UserCourse.find({ user: userId, certificateUrl: { $ne: null } }),
  ]);

  const counts = {
    self_awareness: emotionLogs.length,
    coping: emotionLogs.filter((l) => l.cravingLevel != null).length,
    routine: 0,
    physical: 0,
    learning: completedCourses.length,
    self_monitoring: computeStreakStats(emotionLogs).currentStreak,
    social: 0,
    mindfulness: 0,
  };

  for (const log of activityLogs) {
    if (counts[log.category] !== undefined) counts[log.category] += 1;
  }
  for (const play of gamePlays) {
    if (counts[play.domain] !== undefined) counts[play.domain] += 1;
  }

  const result = RECOVERY_DOMAINS.map(({ key, label }) => ({
    domain: key,
    label,
    raw: counts[key],
    score: Math.max(0, Math.min(100, Math.round((counts[key] / DOMAIN_TARGETS[key]) * 100))),
  }));

  res.json(result);
}
