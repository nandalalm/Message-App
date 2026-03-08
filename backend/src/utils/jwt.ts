import jwt from "jsonwebtoken";

export const createAccessToken = (id: string, email: string, username: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET environment variable is not defined");
  }
  return jwt.sign({ id, email, username }, secret, { expiresIn: "15m" });
};

export const createRefreshToken = (id: string, email: string, username: string): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET environment variable is not defined");
  }
  return jwt.sign({ id, email, username }, secret, { expiresIn: "7d" });
};
