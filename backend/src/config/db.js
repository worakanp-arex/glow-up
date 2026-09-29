import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  // maxPoolSize is a deliberate reduction from the driver default of 100,
  // sized for this app's current traffic — revisit if load testing
  // (backend/loadtest) shows pool exhaustion under higher concurrency.
  await mongoose.connect(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log("MongoDB connected");
}
