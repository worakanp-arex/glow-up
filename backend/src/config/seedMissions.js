// Dev/demo helper: seeds a starter set of missions and rewards so the
// Reward/Mission feature has data to show without requiring an admin UI.
// Run with: node src/config/seedMissions.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import Mission from "../models/Mission.js";
import Reward from "../models/Reward.js";

dotenv.config();

const MISSIONS = [
  { title: "เช็คอิน 3 วันติดต่อกัน", type: "streak", targetValue: 3, rewardPoints: 10, badgeIcon: "Flame" },
  { title: "เช็คอิน 7 วันติดต่อกัน", type: "streak", targetValue: 7, rewardPoints: 25, badgeIcon: "Flame" },
  { title: "เช็คอิน 30 วันติดต่อกัน", type: "streak", targetValue: 30, rewardPoints: 100, badgeIcon: "Flame" },
  { title: "เช็คอินสะสม 10 ครั้ง", type: "totalCheckins", targetValue: 10, rewardPoints: 15, badgeIcon: "CalendarCheck" },
  { title: "เช็คอินสะสม 50 ครั้ง", type: "totalCheckins", targetValue: 50, rewardPoints: 60, badgeIcon: "CalendarCheck" },
  {
    title: "ฝึกสถานการณ์ปฏิเสธสำเร็จ 3 ครั้ง",
    type: "scenarioCompleted",
    targetValue: 3,
    rewardPoints: 20,
    badgeIcon: "Award",
  },
];

const REWARDS = [
  { name: "ผู้เริ่มต้นเส้นทางฟื้นฟู", pointsRequired: 10, icon: "Sprout" },
  { name: "นักสู้ผู้มุ่งมั่น", pointsRequired: 50, icon: "Award" },
  { name: "แชมป์แห่งความสม่ำเสมอ", pointsRequired: 150, icon: "Trophy" },
];

async function seed() {
  await connectDB();

  for (const mission of MISSIONS) {
    await Mission.findOneAndUpdate({ title: mission.title }, mission, { upsert: true });
  }
  for (const reward of REWARDS) {
    await Reward.findOneAndUpdate({ name: reward.name }, reward, { upsert: true });
  }

  console.log(`Seeded ${MISSIONS.length} missions and ${REWARDS.length} rewards.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
