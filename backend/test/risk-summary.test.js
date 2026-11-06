import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import RiskAssessment from "../src/models/RiskAssessment.js";
import EmotionLog from "../src/models/EmotionLog.js";
import { getAllRiskSummary } from "../src/controllers/riskController.js";

afterEach(() => mock.restoreAll());

const response = () => ({ body: null, json(body) { this.body = body; return this; } });

test("risk summary adds a daily mood average built only from grouped, non-deleted data", async () => {
  mock.method(RiskAssessment, "aggregate", async () => [{ _id: "low", count: 4 }, { _id: "high", count: 1 }]);
  let pipeline;
  mock.method(EmotionLog, "aggregate", async (stages) => {
    pipeline = stages;
    return [{ _id: "2026-10-27", average: 4.3333, count: 6 }, { _id: "2026-10-28", average: 5, count: 3 }];
  });

  const res = response();
  await getAllRiskSummary({}, res);

  assert.deepEqual(res.body.byLevel, { low: 4, medium: 0, high: 1 });
  assert.deepEqual(res.body.moodTrend, [
    { dateKey: "2026-10-27", average: 4.3, count: 6 },
    { dateKey: "2026-10-28", average: 5, count: 3 },
  ]);
  assert.equal(res.body.moodTrendDays, 30);

  const groupIndex = pipeline.findIndex((stage) => stage.$group);
  assert.equal(pipeline[groupIndex].$group._id, "$dateKey", "averages are per day across everyone, never per user");
  assert.deepEqual(pipeline[groupIndex + 1], { $match: { count: { $gte: 3 } } }, "days with fewer than 3 entries are dropped");
  assert.ok(JSON.stringify(pipeline).includes('"deletedAt":null'), "deleted accounts are excluded");
});
