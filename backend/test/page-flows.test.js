import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import Notification from "../src/models/Notification.js";
import CounsellingSession from "../src/models/CounsellingSession.js";
import RehabilitationRecord from "../src/models/RehabilitationRecord.js";
import Post from "../src/models/Post.js";
import { markAllAsRead, clearMyNotifications } from "../src/controllers/notificationController.js";
import { addMessage } from "../src/controllers/counsellingController.js";
import { myRecoverySummary } from "../src/controllers/userController.js";
import { likePost } from "../src/controllers/postController.js";

afterEach(() => mock.restoreAll());
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send() { return this; } });

test("bulk notification actions are scoped to the signed-in user and never delete conversations", async () => {
  let readFilter, deleteFilter;
  mock.method(Notification, "updateMany", async filter => { readFilter = filter; });
  mock.method(Notification, "deleteMany", async filter => { deleteFilter = filter; });
  mock.method(CounsellingSession, "deleteMany", () => assert.fail("conversation deletion"));
  const req = { user: { id: "owner" }, body: { user: "someone-else" } };
  await markAllAsRead(req, response());
  const res = response();
  await clearMyNotifications(req, res);
  assert.deepEqual(readFilter, { user: "owner", status: "unread" });
  assert.deepEqual(deleteFilter, { user: "owner" });
  assert.equal(res.code, 204);
});

for (const role of ["user", "counsellor"]) test(`chat notification from ${role} opens the recipient's actual conversation`, async () => {
  const session = { _id: "session1", user: "user1", counsellor: "counsellor1", topic: "ความเครียด", messages: [], async save() {}, async populate() {} };
  mock.method(CounsellingSession, "findById", async () => session);
  let notification;
  mock.method(Notification, "create", async payload => { notification = payload; return payload; });
  await addMessage({ params: { id: session._id }, user: { id: `${role}1`, role }, body: { content: "สวัสดี" } }, response());
  assert.equal(notification.user, role === "user" ? "counsellor1" : "user1");
  assert.equal(notification.link, role === "user" ? "/counsellor/requests/session1" : "/counselling/session1");
});

test("profile uses the latest completed record, excludes future dates, and respects ongoing treatment", async () => {
  const records = [
    { status: "completed", endDate: new Date("2020-01-01") },
    { status: "completed", endDate: new Date("2022-01-01") },
    { status: "completed", endDate: new Date("2099-01-01") },
  ];
  mock.method(RehabilitationRecord, "find", filter => {
    assert.deepEqual(filter, { user: "owner" });
    return { select: async () => records };
  });
  const res = response();
  await myRecoverySummary({ user: { id: "owner" } }, res);
  assert.equal(res.body.endDate.toISOString().slice(0, 10), "2022-01-01");
  records.push({ status: "ongoing" });
  await myRecoverySummary({ user: { id: "owner" } }, res);
  assert.deepEqual(res.body, { ongoing: true, endDate: null });
});

test("like response only patches reactions, preserving the author's populated profile", async () => {
  const id = "507f1f77bcf86cd799439011";
  let updates;
  mock.method(Post, "findByIdAndUpdate", async (_id, pipeline) => {
    updates = pipeline;
    return { user: "unpopulated-author-id", likes: 1, likedBy: [id] };
  });
  const res = response();
  await likePost({ params: { id: "post" }, user: { id }, body: { liked: true } }, res);
  assert.deepEqual(res.body, { likes: 1, likedByMe: true });
  assert.equal(updates[0].$set.likedBy.$cond[0], true);
  assert.deepEqual(updates[1], { $set: { likes: { $size: "$likedBy" } } });
});
