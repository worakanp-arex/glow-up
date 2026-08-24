import LoginEvent from "../models/LoginEvent.js";
import { toBangkokDateKey } from "../utils/dateKey.js";

export async function recordLogin(user) {
  if (user.role !== "user") return;
  const dateKey = toBangkokDateKey(new Date());
  await LoginEvent.updateOne({ user: user._id, dateKey }, {}, { upsert: true });
}
