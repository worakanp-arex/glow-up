import ScenarioSimulation from "../models/ScenarioSimulation.js";
import ScenarioAttempt from "../models/ScenarioAttempt.js";
import { checkAndAwardMissions } from "./missionController.js";

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
  const scenarios = await ScenarioSimulation.find({ active: true }).sort({ createdAt: -1 });
  res.json(scenarios.map(sanitizeScenario));
}

export async function getActiveScenario(req, res) {
  const scenario = await ScenarioSimulation.findOne({ _id: req.params.id, active: true });
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
  const scenario = await ScenarioSimulation.create({
    title,
    lesson: lesson || undefined,
    prompt,
    options,
    createdBy: req.user.id,
  });
  res.status(201).json(scenario);
}

export async function updateScenario(req, res) {
  const scenario = await ScenarioSimulation.findByIdAndUpdate(req.params.id, req.body, {
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
  const scenario = await ScenarioSimulation.findOne({ _id: req.params.id, active: true });
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
