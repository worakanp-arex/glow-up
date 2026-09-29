// Removes everything loadtest/seed.js created, by the same name patterns it
// used to write them. Safe to run even if nothing was seeded.
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Job from "../src/models/Job.js";
import Post from "../src/models/Post.js";
import { LOADTEST_USER_EMAIL, LOADTEST_ADMIN_EMAIL } from "./credentials.js";

dotenv.config();

async function cleanup() {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== "development") {
    console.error(`Refusing to clean up load-test data with NODE_ENV=${process.env.NODE_ENV}`);
    process.exit(1);
  }

  await connectDB();

  const users = await User.deleteMany({
    $or: [
      { email: /^loadtest\.bulk\.\d+@example\.com$/ },
      { email: LOADTEST_USER_EMAIL },
      { email: LOADTEST_ADMIN_EMAIL },
      { email: "loadtest.employer@example.com" },
    ],
  });
  const jobs = await Job.deleteMany({ title: /^Load Test Job \d+$/ });
  const posts = await Post.deleteMany({ content: /^Load test post \d+$/ });

  console.log(`Removed ${users.deletedCount} users, ${jobs.deletedCount} jobs, ${posts.deletedCount} posts`);
  await mongoose.disconnect();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  cleanup().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
