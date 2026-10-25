// Adds the standard career-skill catalogue (grouped by category) to the
// database. Idempotent — run with: npm run seed:skills
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import { ensureDefaultSkills } from "../services/skillCatalogService.js";

dotenv.config();

async function seed() {
  await connectDB();
  const { added, categorised } = await ensureDefaultSkills();
  console.log(`Skills: added ${added}, categorised ${categorised}.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
