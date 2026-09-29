import Goal from "../models/Goal.js";
import { notifyUser } from "../services/notificationService.js";

export async function createGoal(req, res) {
  const { title, description, term, targetDate } = req.body;
  const goal = await Goal.create({ user: req.user.id, title, description, term, targetDate });
  res.status(201).json(goal);
}

export async function myGoals(req, res) {
  const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(goals);
}

export async function updateGoal(req, res) {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
  if (!goal) {
    return res.status(404).json({ message: "Not found" });
  }

  const { title, description, term, targetDate, progress, status } = req.body;
  if (title !== undefined) goal.title = title;
  if (description !== undefined) goal.description = description;
  if (term !== undefined) goal.term = term;
  if (targetDate !== undefined) goal.targetDate = targetDate;
  if (progress !== undefined) goal.progress = progress;

  const wasCompleted = goal.status === "completed";
  if (status !== undefined) goal.status = status;
  if (goal.progress >= 100 && goal.status === "active") goal.status = "completed";

  if (!wasCompleted && goal.status === "completed") {
    goal.completedAt = new Date();
    await notifyUser(req.user.id, `คุณบรรลุเป้าหมาย "${goal.title}" แล้ว!`, "reward", { link: "/streak" });
  }

  await goal.save();
  res.json(goal);
}

export async function deleteGoal(req, res) {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!goal) {
    return res.status(404).json({ message: "Not found" });
  }
  res.status(204).send();
}
