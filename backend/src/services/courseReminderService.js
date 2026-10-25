import Course from "../models/Course.js";
import UserCourse from "../models/UserCourse.js";
import Notification from "../models/Notification.js";
import { toBangkokDateKey } from "../utils/dateKey.js";
import { notifyUser } from "./notificationService.js";

const WARN_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysLabel(endDate, now) {
  const days = Math.ceil((endDate - now) / DAY_MS);
  return days <= 1 ? "ภายในวันนี้หรือพรุ่งนี้" : `ในอีก ${days} วัน`;
}

// Tells people who saved a course that it is about to expire. Runs on login,
// when they open their saved courses, and hourly for everyone (see server.js);
// each person gets at most one reminder per course per day.
export async function sendCourseExpiryReminders({ userId, now = new Date() } = {}) {
  const horizon = new Date(now.getTime() + WARN_DAYS * DAY_MS);
  const courses = await Course.find({ endDate: { $gte: now, $lte: horizon } }).select("title endDate");
  if (courses.length === 0) return 0;

  const courseById = new Map(courses.map((course) => [String(course._id), course]));
  const filter = { course: { $in: courses.map((course) => course._id) } };
  if (userId) filter.user = userId;
  const enrollments = await UserCourse.find(filter).select("user course");

  const dateKey = toBangkokDateKey(now);
  let sent = 0;
  for (const enrollment of enrollments) {
    const course = courseById.get(String(enrollment.course));
    if (!course) continue;
    const link = `/courses/${course._id}`;
    if (await Notification.exists({ user: enrollment.user, type: "courseExpiry", link, dateKey })) continue;
    await notifyUser(
      enrollment.user,
      `คอร์ส "${course.title}" ที่คุณบันทึกไว้จะหมดอายุ${daysLabel(course.endDate, now)} รีบเข้าเรียนให้ทัน`,
      "courseExpiry",
      { link, dateKey }
    );
    sent += 1;
  }
  return sent;
}

export function maybeSendCourseExpiryReminders(user) {
  if (user.role !== "user") return Promise.resolve(0);
  return sendCourseExpiryReminders({ userId: user._id });
}
