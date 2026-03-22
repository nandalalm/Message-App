import mongoose from "mongoose";
import { logError, logInfo } from "../middleware/loggerMiddleware";
import { Messages } from "../constants/messages";

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error(Messages.MONGO_URI_UNDEFINED);
    }
    await mongoose.connect(mongoUri);
    console.log(Messages.MONGODB_CONNECTED);

    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      
      const ensureCapped = async (name: string, size: number, max: number) => {
        const collInfo = collections.find(c => c.name === name) as { name: string; options?: { capped?: boolean } };
        if (collInfo) {
          if (!collInfo.options || !collInfo.options.capped) {
            await db.command({ convertToCapped: name, size, max });
          }
        }
      };

      await ensureCapped("messages", 1024 * 1024, 100);
      await ensureCapped("polls", 5 * 1024 * 1024, 100);
    }

    logInfo(Messages.MONGODB_CONNECTED_SUCCESS);
  } catch (err) {
    console.error(`${Messages.MONGODB_CONNECTION_ERROR}:`, err);
    logError(err as Error, undefined, { context: "Database connection" });
    process.exit(1);
  }
};
