import LoginEvent from "../models/LoginEvent.js";
import { toBangkokDateKey } from "../utils/dateKey.js";

// Every account counts as "active" on the overview — patients, family members,
// medical staff, employers and admins alike.
export async function recordLogin(user) {
  const dateKey = toBangkokDateKey(new Date());
  await LoginEvent.updateOne({ user: user._id, dateKey }, {}, { upsert: true });
}
