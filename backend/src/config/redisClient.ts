import { createClient } from "redis";
import { Messages } from "../constants/messages";

let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisConnected = false;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("connect", () => {
      console.log(Messages.REDIS_CONNECTED);
      isRedisConnected = true;
    });

    redisClient.on("error", () => {
      isRedisConnected = false;
    });

    await redisClient.connect();
  } catch (err) {
    console.warn(err, Messages.REDIS_NOT_AVAILABLE);
    isRedisConnected = false;
    redisClient = null;
  }
};

const otpStorage = new Map<string, { otp: string; expires: number }>();

export const setOTP = async (key: string, otp: string, ttl: number): Promise<void> => {
  if (isRedisConnected && redisClient) {
    await redisClient.setEx(key, ttl, otp);
  } else {
    otpStorage.set(key, { otp, expires: Date.now() + ttl * 1000 });
  }
};

export const getOTP = async (key: string): Promise<string | null> => {
  if (isRedisConnected && redisClient) {
    return await redisClient.get(key);
  } else {
    const stored = otpStorage.get(key);
    if (!stored || stored.expires < Date.now()) {
      otpStorage.delete(key);
      return null;
    }
    return stored.otp;
  }
};

export const deleteOTP = async (key: string): Promise<void> => {
  if (isRedisConnected && redisClient) {
    await redisClient.del(key);
  } else {
    otpStorage.delete(key);
  }
};
