import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import Job from "../src/models/Job.js";
import SavedJob from "../src/models/SavedJob.js";
import { saveJob, unsaveJob, mySavedJobIds } from "../src/controllers/jobController.js";

afterEach(() => mock.restoreAll());
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send() { return this; } });

test("saving a job is scoped to the user and only allowed for publicly listed jobs", async () => {
  mock.method(Job, "findOne", (filter) => {
    assert.deepEqual(filter, { _id: "job1", status: "open", verifiedStatus: "verified" });
    return { select: async () => ({ _id: "job1" }) };
  });
  let upsert;
  mock.method(SavedJob, "updateOne", async (filter, update, options) => { upsert = { filter, options }; });
  const res = response();
  await saveJob({ params: { id: "job1" }, user: { id: "owner" } }, res);
  assert.equal(res.code, 201);
  assert.deepEqual(upsert.filter, { user: "owner", job: "job1" });
  assert.equal(upsert.options.upsert, true);

  let deleted;
  mock.method(SavedJob, "deleteOne", async (filter) => { deleted = filter; });
  await unsaveJob({ params: { id: "job1" }, user: { id: "owner" } }, response());
  assert.deepEqual(deleted, { user: "owner", job: "job1" });

  mock.method(SavedJob, "find", () => ({ select: async () => [{ job: "job1" }] }));
  const ids = response();
  await mySavedJobIds({ user: { id: "owner" } }, ids);
  assert.deepEqual(ids.body, ["job1"]);
});

test("saving a closed or unverified job returns 404", async () => {
  mock.method(Job, "findOne", () => ({ select: async () => null }));
  mock.method(SavedJob, "updateOne", () => assert.fail("should not save"));
  const res = response();
  await saveJob({ params: { id: "gone" }, user: { id: "owner" } }, res);
  assert.equal(res.code, 404);
});
