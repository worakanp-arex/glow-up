import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import User from "../models/User.js";

dotenv.config();

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running this script.");
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`User with email ${email} already exists (role: ${existing.role}).`);
  } else {
    const admin = await User.create({
      name,
      email,
      password,
      role: "admin",
      verifiedStatus: "verified",
      pdpaConsent: true,
      pdpaConsentAt: new Date(),
    });
    console.log(`Admin created: ${admin.email}`);
  }

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
