import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import User from "../src/models/User.js";
import FamilyLink from "../src/models/FamilyLink.js";
import FamilyMission from "../src/models/FamilyMission.js";
import MicroLesson from "../src/models/MicroLesson.js";
import SavedLesson from "../src/models/SavedLesson.js";
import { updateMe } from "../src/controllers/userController.js";
import { getLinkedUserSummary } from "../src/controllers/familyController.js";
import { myTodayFamilyMissions, confirmFamilyMission } from "../src/controllers/familyMissionController.js";
import { saveLesson, unsaveLesson, mySavedLessonIds } from "../src/controllers/microLessonController.js";

afterEach(() => mock.restoreAll());
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send() { return this; } });

test("profile update saves nickname/province/bio and toggles one sharing option without resetting the other", async () => {
  let updates;
  mock.method(User, "findByIdAndUpdate", async (id, u) => { updates = u; return { _id: id, ...u }; });
  await updateMe({
    user: { id: "owner" },
    body: { nickname: "วร", province: "ขอนแก่น", bio: "สวัสดี", role: "admin", familySharing: { progress: false, missions: "yes" } },
  }, response());
  assert.equal(updates.nickname, "วร");
  assert.equal(updates.province, "ขอนแก่น");
  assert.equal(updates.bio, "สวัสดี");
  assert.equal(updates["familySharing.progress"], false);
  assert.equal("familySharing.missions" in updates, false, "non-boolean values are ignored");
  assert.equal("familySharing" in updates, false, "never replaces the whole sharing object");
  assert.equal("role" in updates, false);
});

test("family summary hides progress when the user stopped sharing it", async () => {
  mock.method(FamilyLink, "findById", async () => ({ status: "active", familyUser: "fam1", recoveringUser: "user1" }));
  mock.method(User, "findById", () => ({ select: async () => ({ name: "ก้าวใหม่", avatarUrl: null, familySharing: { progress: false, missions: true } }) }));
  const res = response();
  await getLinkedUserSummary({ params: { linkId: "link1" }, user: { id: "fam1" } }, res);
  assert.deepEqual(res.body.sharing, { progress: false, missions: true });
  assert.equal(res.body.level, undefined);
  assert.equal(res.body.currentStreak, undefined);
  assert.equal(res.body.completedMissions, undefined);
  assert.deepEqual(res.body.rewardsEarned, []);
});

test("shared family missions are hidden and cannot be confirmed when missions sharing is off", async () => {
  mock.method(FamilyLink, "findOne", async () => ({ _id: "link1", recoveringUser: "user1", familyUser: "fam1" }));
  mock.method(User, "findById", () => ({ select: async () => ({ familySharing: { progress: true, missions: false } }) }));
  mock.method(FamilyMission, "find", () => assert.fail("missions should not be listed"));
  const list = response();
  await myTodayFamilyMissions({ user: { id: "fam1", role: "family" } }, list);
  assert.deepEqual(list.body, []);

  mock.method(FamilyMission, "findOne", async () => ({ _id: "m1", title: "เดินเล่น", points: 5 }));
  const confirm = response();
  await confirmFamilyMission({ user: { id: "fam1", role: "family" }, body: { familyMissionId: "m1" } }, confirm);
  assert.equal(confirm.code, 403);
});

test("lesson bookmarks are scoped to the signed-in user and only for active lessons", async () => {
  mock.method(MicroLesson, "findOne", (filter) => {
    assert.deepEqual(filter, { _id: "lesson1", active: true });
    return { select: async () => ({ _id: "lesson1" }) };
  });
  let upsert;
  mock.method(SavedLesson, "updateOne", async (filter, update, options) => { upsert = { filter, options }; });
  const saved = response();
  await saveLesson({ params: { id: "lesson1" }, user: { id: "owner" } }, saved);
  assert.equal(saved.code, 201);
  assert.deepEqual(upsert.filter, { user: "owner", lesson: "lesson1" });
  assert.equal(upsert.options.upsert, true);

  let deleted;
  mock.method(SavedLesson, "deleteOne", async (filter) => { deleted = filter; });
  await unsaveLesson({ params: { id: "lesson1" }, user: { id: "owner" } }, response());
  assert.deepEqual(deleted, { user: "owner", lesson: "lesson1" });

  mock.method(SavedLesson, "find", (filter) => {
    assert.deepEqual(filter, { user: "owner" });
    return { select: async () => [{ lesson: "lesson1" }] };
  });
  const ids = response();
  await mySavedLessonIds({ user: { id: "owner" } }, ids);
  assert.deepEqual(ids.body, ["lesson1"]);
});

test("bookmarking an inactive or missing lesson returns 404", async () => {
  mock.method(MicroLesson, "findOne", () => ({ select: async () => null }));
  mock.method(SavedLesson, "updateOne", () => assert.fail("should not save"));
  const res = response();
  await saveLesson({ params: { id: "gone" }, user: { id: "owner" } }, res);
  assert.equal(res.code, 404);
});
