import MicroLesson from "../models/MicroLesson.js";
import ScenarioSimulation from "../models/ScenarioSimulation.js";
import Notification from "../models/Notification.js";
import { toBangkokDateKey } from "../utils/dateKey.js";
import { notifyUser } from "./notificationService.js";

const WARN_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MANAGE_LINK = "/counsellor/lessons";

function daysLabel(expiresAt, now) {
  const days = Math.ceil((expiresAt - now) / DAY_MS);
  return days <= 1 ? "ภายในวันนี้หรือพรุ่งนี้" : `ในอีก ${days} วัน`;
}

// Tells the staff member who wrote a lesson or a scenario that it is about to
// expire, so they can extend or replace it before members lose it. Runs hourly
// (see server.js); each person gets at most one reminder per item per day.
export async function sendContentExpiryReminders({ now = new Date() } = {}) {
  const window = { $gte: now, $lte: new Date(now.getTime() + WARN_DAYS * DAY_MS) };
  const [lessons, scenarios] = await Promise.all([
    MicroLesson.find({ active: true, expiresAt: window }).select("title expiresAt createdBy"),
    ScenarioSimulation.find({ active: true, expiresAt: window }).select("title expiresAt createdBy"),
  ]);

  const dateKey = toBangkokDateKey(now);
  const items = [
    ...lessons.map((item) => ({ kind: "บทเรียน", item })),
    ...scenarios.map((item) => ({ kind: "สถานการณ์จำลอง", item })),
  ];

  let sent = 0;
  for (const { kind, item } of items) {
    if (!item.createdBy) continue;
    const message = `${kind} "${item.title}" จะหมดอายุ${daysLabel(item.expiresAt, now)} ต่ออายุหรือแก้ไขได้ที่หน้าจัดการทักษะการปฏิเสธ`;
    if (await Notification.exists({ user: item.createdBy, type: "contentExpiry", message, dateKey })) continue;
    await notifyUser(item.createdBy, message, "contentExpiry", { link: MANAGE_LINK, dateKey });
    sent += 1;
  }
  return sent;
}
