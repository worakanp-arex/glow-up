import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  // maxPoolSize ลดจากค่าเริ่มต้นของไดรเวอร์ (100) โดยตั้งใจ
  // ให้เหมาะกับปริมาณการใช้งานปัจจุบันของแอป — ทบทวนใหม่หากการทดสอบโหลด
  // (backend/loadtest) พบว่า pool ไม่พอเมื่อโหลดสูงขึ้น
  await mongoose.connect(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log("MongoDB connected");
}
