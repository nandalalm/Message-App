import mongoose from "mongoose";
import { logError, logInfo } from "../middleware/loggerMiddleware";

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is not defined");
    }
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");

    // Ensure collections are capped
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      
      const ensureCapped = async (name: string, size: number, max: number) => {
        const collInfo = collections.find(c => c.name === name) as { name: string; options?: { capped?: boolean } };
        if (collInfo) {
          if (!collInfo.options || !collInfo.options.capped) {
            console.log(`Converting ${name} to capped collection...`);
            await db.command({ convertToCapped: name, size, max });
          }
        }
      };

      await ensureCapped("messages", 1024 * 1024, 100);
      await ensureCapped("polls", 5 * 1024 * 1024, 100);
    }

    logInfo("MongoDB Connected successfully");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    logError(err as Error, undefined, { context: "Database connection" });
    process.exit(1);
  }
};
