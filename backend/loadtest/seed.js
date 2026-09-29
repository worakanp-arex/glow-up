// Idempotent local seed data for the load-test scenarios. Never run against
// production — refuses to run unless NODE_ENV is unset or "development".
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Job from "../src/models/Job.js";
import Post from "../src/models/Post.js";
import { LOADTEST_USER_EMAIL, LOADTEST_USER_PASSWORD, LOADTEST_ADMIN_EMAIL, LOADTEST_ADMIN_PASSWORD } from "./credentials.js";

dotenv.config();

const LOADTEST_USER_COUNT = 200;
const LOADTEST_JOB_COUNT = 200;
const LOADTEST_POST_COUNT = 200;

async function upsertUser({ email, password, role, name, verifiedStatus = "verified" }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({ name, email, password, role, verifiedStatus, pdpaConsent: true, pdpaConsentAt: new Date() });
}

async function seed() {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== "development") {
    console.error(`Refusing to seed load-test data with NODE_ENV=${process.env.NODE_ENV}`);
    process.exit(1);
  }

  await connectDB();

  const loginUser = await upsertUser({
    email: LOADTEST_USER_EMAIL,
    password: LOADTEST_USER_PASSWORD,
    role: "user",
    name: "Load Test User",
  });
  const admin = await upsertUser({
    email: LOADTEST_ADMIN_EMAIL,
    password: LOADTEST_ADMIN_PASSWORD,
    role: "admin",
    name: "Load Test Admin",
  });
  const employer = await upsertUser({
    email: "loadtest.employer@example.com",
    password: "loadtest-password-123",
    role: "employer",
    name: "Load Test Employer",
    verifiedStatus: "verified",
  });

  const existingUserCount = await User.countDocuments({ email: /^loadtest\.bulk\.\d+@example\.com$/ });
  if (existingUserCount < LOADTEST_USER_COUNT) {
    const toCreate = Array.from({ length: LOADTEST_USER_COUNT - existingUserCount }, (_, i) => ({
      name: `Load Test Bulk User ${existingUserCount + i + 1}`,
      email: `loadtest.bulk.${existingUserCount + i + 1}@example.com`,
      password: "loadtest-password-123",
      role: "user",
      verifiedStatus: "verified",
      pdpaConsent: true,
      pdpaConsentAt: new Date(),
    }));
    await User.insertMany(toCreate);
    console.log(`Seeded ${toCreate.length} bulk users`);
  }

  const existingJobCount = await Job.countDocuments({ title: /^Load Test Job \d+$/ });
  if (existingJobCount < LOADTEST_JOB_COUNT) {
    const toCreate = Array.from({ length: LOADTEST_JOB_COUNT - existingJobCount }, (_, i) => ({
      title: `Load Test Job ${existingJobCount + i + 1}`,
      description: "Seeded for load testing",
      employer: employer._id,
      location: "ขอนแก่น",
      salary: 15000,
      status: "open",
      verifiedStatus: "verified",
    }));
    await Job.insertMany(toCreate);
    console.log(`Seeded ${toCreate.length} jobs`);
  }

  const existingPostCount = await Post.countDocuments({ content: /^Load test post \d+$/ });
  if (existingPostCount < LOADTEST_POST_COUNT) {
    const toCreate = Array.from({ length: LOADTEST_POST_COUNT - existingPostCount }, (_, i) => ({
      user: admin._id,
      content: `Load test post ${existingPostCount + i + 1}`,
      tags: [],
      commentsEnabled: true,
    }));
    await Post.insertMany(toCreate);
    console.log(`Seeded ${toCreate.length} posts`);
  }

  console.log(`Ready: login as ${LOADTEST_USER_EMAIL} / ${LOADTEST_USER_PASSWORD}, admin as ${LOADTEST_ADMIN_EMAIL} / ${LOADTEST_ADMIN_PASSWORD}`);
  await mongoose.disconnect();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
