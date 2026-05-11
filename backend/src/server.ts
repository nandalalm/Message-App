import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import { connectRedis } from "./config/redisClient";
import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware";
import { loggerMiddleware, logError } from "./middleware/loggerMiddleware";
import authRoutes from "./routes/authRoute";
import imageRoutes from "./routes/imageRoute";
import userRoutes from "./routes/userRoute";
import notificationRoutes from "./routes/notificationRoute";

import { createServer } from "http";
import { initSocket } from "./config/socket";

dotenv.config();
const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use(loggerMiddleware);

connectDB();
connectRedis();

app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

initSocket(httpServer);

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logError(error, undefined, { context: "Unhandled promise rejection" });
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logError(error, undefined, { context: "Uncaught exception" });
  process.exit(1);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
