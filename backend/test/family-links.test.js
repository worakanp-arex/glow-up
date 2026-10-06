import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import User from "../src/models/User.js";
import FamilyLink from "../src/models/FamilyLink.js";
import Notification from "../src/models/Notification.js";
import CounsellingSession from "../src/models/CounsellingSession.js";
import { revokeFamilyLink, myInvitedFamily, listFamilyLinksForUser } from "../src/controllers/familyController.js";

afterEach(() => mock.restoreAll());
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send() { return this; } });

function linkDoc(fields) {
  return { ...fields, save: mock.fn(async function save() { return this; }) };
}

test("notification types used by family features are accepted by the schema", () => {
  for (const type of ["familyMessage", "familyLinkRemoved"]) {
    const doc = new Notification({ user: "65a000000000000000000001", message: "x", type });
    assert.equal(doc.validateSync(), undefined, `${type} should be a valid notification type`);
  }
});

test("revoking an active connection notifies the family member and hides the link", async () => {
  const link = linkDoc({ _id: "link1", recoveringUser: "user1", familyUser: "fam1", status: "active" });
  mock.method(FamilyLink, "findById", async () => link);
  mock.method(User, "findById", () => ({ select: async () => ({ name: "ก้าวใหม่" }) }));
  const created = mock.fn(async (doc) => doc);
  mock.method(Notification, "create", created);

  const res = response();
  await revokeFamilyLink({ params: { id: "link1" }, user: { id: "user1", role: "user" } }, res);

  assert.equal(link.status, "revoked");
  assert.equal(link.save.mock.callCount(), 1);
  assert.equal(created.mock.callCount(), 1);
  const notice = created.mock.calls[0].arguments[0];
  assert.equal(String(notice.user), "fam1");
  assert.equal(notice.type, "familyLinkRemoved");
  assert.match(notice.message, /ก้าวใหม่.*ยกเลิกการเชื่อมต่อ/);
});

test("cancelling a pending invite does not notify anyone", async () => {
  const link = linkDoc({ _id: "link2", recoveringUser: "user1", familyUser: undefined, status: "pending" });
  mock.method(FamilyLink, "findById", async () => link);
  const created = mock.fn(async (doc) => doc);
  mock.method(Notification, "create", created);

  await revokeFamilyLink({ params: { id: "link2" }, user: { id: "user1", role: "user" } }, response());

  assert.equal(link.status, "revoked");
  assert.equal(created.mock.callCount(), 0);
});

test("only the owner can revoke a connection", async () => {
  mock.method(FamilyLink, "findById", async () => linkDoc({ _id: "link3", recoveringUser: "user1", status: "active" }));
  const res = response();
  await revokeFamilyLink({ params: { id: "link3" }, user: { id: "someone-else", role: "user" } }, res);
  assert.equal(res.code, 403);
});

test("the invite list omits revoked links", async () => {
  let filter;
  mock.method(FamilyLink, "find", (f) => {
    filter = f;
    return { sort: async () => [] };
  });
  await myInvitedFamily({ user: { id: "user1", role: "user" } }, response());
  assert.deepEqual(filter, { recoveringUser: "user1", status: { $ne: "revoked" } });
});

test("staff audit lists a patient's current connections, with the family member's name and email", async () => {
  mock.method(FamilyLink, "find", (filter) => {
    assert.deepEqual(filter, { recoveringUser: "65a000000000000000000002", status: { $ne: "revoked" } });
    return { populate: () => ({ sort: async () => [{ _id: "link4", status: "active", familyUser: { name: "แม่", email: "mom@example.com" } }] }) };
  });
  const res = response();
  await listFamilyLinksForUser({ params: { userId: "65a000000000000000000002" }, user: { id: "admin1", role: "admin" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body[0].familyUser.email, "mom@example.com");
});

test("a counsellor without an assignment to the patient cannot see their family connections", async () => {
  mock.method(User, "findById", () => ({ select: async () => ({ assignedCounsellor: "someone-else" }) }));
  mock.method(CounsellingSession, "exists", async () => null);
  mock.method(FamilyLink, "find", () => assert.fail("must not query links for an unassigned patient"));

  const res = response();
  await listFamilyLinksForUser({ params: { userId: "65a000000000000000000002" }, user: { id: "c1", role: "counsellor" } }, res);
  assert.equal(res.code, 403);
});

test("a counsellor assigned to the patient can see their family connections", async () => {
  mock.method(User, "findById", () => ({ select: async () => ({ assignedCounsellor: "c1" }) }));
  mock.method(CounsellingSession, "exists", async () => null);
  mock.method(FamilyLink, "find", () => ({ populate: () => ({ sort: async () => [] }) }));
  const res = response();
  await listFamilyLinksForUser({ params: { userId: "65a000000000000000000002" }, user: { id: "c1", role: "counsellor" } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, []);
});
