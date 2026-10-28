import ScenarioSimulation from "../models/ScenarioSimulation.js";
import ScenarioAttempt from "../models/ScenarioAttempt.js";
import { checkAndAwardMissions } from "./missionController.js";
import { notExpiredFilter, parseOptionalEndOfDay } from "../utils/dateKey.js";

const INVALID_EXPIRY = { message: "วันหมดอายุไม่ถูกต้อง" };

// What members can play: switched on and not past the last day.
function playableFilter() {
  return { active: true, ...notExpiredFilter() };
}

function sanitizeScenario(scenario) {
  const obj = scenario.toObject ? scenario.toObject() : scenario;
  return {
    ...obj,
    options: obj.options.map((opt) => ({ text: opt.text })),
  };
}

// User-facing: don't leak which option is correct or its feedback text
// before the user has actually attempted the scenario.
export async function listActiveScenarios(req, res) {
  const scenarios = await ScenarioSimulation.find(playableFilter()).sort({ createdAt: -1 });
  res.json(scenarios.map(sanitizeScenario));
}

export async function getActiveScenario(req, res) {
  const scenario = await ScenarioSimulation.findOne({ _id: req.params.id, ...playableFilter() });
  if (!scenario) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(sanitizeScenario(scenario));
}

export async function listAllScenarios(req, res) {
  const scenarios = await ScenarioSimulation.find().sort({ createdAt: -1 });
  res.json(scenarios);
}

export async function getScenario(req, res) {
  const scenario = await ScenarioSimulation.findById(req.params.id);
  if (!scenario) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(scenario);
}

export async function createScenario(req, res) {
  const { title, lesson, prompt, options } = req.body;
  if (!title || !prompt || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: "กรุณากรอกชื่อสถานการณ์ คำถาม และตัวเลือกอย่างน้อย 2 ข้อ" });
  }
  const expiresAt = parseOptionalEndOfDay(req.body.expiresAt);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return res.status(400).json(INVALID_EXPIRY);
  const scenario = await ScenarioSimulation.create({
    title,
    lesson: lesson || undefined,
    prompt,
    options,
    expiresAt: expiresAt || undefined,
    createdBy: req.user.id,
  });
  res.status(201).json(scenario);
}

const SCENARIO_EDITABLE_FIELDS = ["title", "lesson", "prompt", "options", "active"];

export async function updateScenario(req, res) {
  const changes = {};
  for (const field of SCENARIO_EDITABLE_FIELDS) if (req.body[field] !== undefined) changes[field] = req.body[field];
  const expiresAt = parseOptionalEndOfDay(req.body.expiresAt);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return res.status(400).json(INVALID_EXPIRY);
  if (expiresAt !== undefined) changes.expiresAt = expiresAt;
  const scenario = await ScenarioSimulation.findByIdAndUpdate(req.params.id, changes, {
    new: true,
    runValidators: true,
  });
  if (!scenario) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(scenario);
}

export async function deleteScenario(req, res) {
  const scenario = await ScenarioSimulation.findByIdAndDelete(req.params.id);
  if (!scenario) {
    return res.status(404).json({ message: "Not found" });
  }
  res.status(204).send();
}

export async function attemptScenario(req, res) {
  const { chosenOptionIndex } = req.body;
  const scenario = await ScenarioSimulation.findOne({ _id: req.params.id, ...playableFilter() });
  if (!scenario) {
    return res.status(404).json({ message: "Not found" });
  }
  const option = scenario.options[chosenOptionIndex];
  if (!option) {
    return res.status(400).json({ message: "ตัวเลือกไม่ถูกต้อง" });
  }

  const passed = Boolean(option.isCorrect);
  await ScenarioAttempt.create({
    user: req.user.id,
    scenario: scenario._id,
    chosenOptionIndex,
    passed,
  });

  let missionUpdate = null;
  if (passed) {
    missionUpdate = await checkAndAwardMissions(req.user.id);
  }

  res.status(201).json({
    passed,
    feedback: option.feedback,
    correctOptionIndex: scenario.options.findIndex((o) => o.isCorrect),
    newlyCompletedMissions: missionUpdate?.newlyCompletedMissions?.map((m) => m.mission.title) || [],
  });
}

export async function myScenarioAttempts(req, res) {
  const attempts = await ScenarioAttempt.find({ user: req.user.id })
    .populate("scenario", "title")
    .sort({ attemptedAt: -1 });
  res.json(attempts);
}
