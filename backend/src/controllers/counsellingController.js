import CounsellingSession from "../models/CounsellingSession.js";

export async function createSession(req, res) {
  const { sessionType, message } = req.body;
  const session = await CounsellingSession.create({
    user: req.user.id,
    sessionType,
    message,
  });
  res.status(201).json(session);
}

export async function mySessions(req, res) {
  const sessions = await CounsellingSession.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(sessions);
}
