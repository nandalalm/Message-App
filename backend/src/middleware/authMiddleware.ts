import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { HttpStatus } from "../constants/httpStatus";
import { Messages } from "../constants/messages";
import { AppError } from "../utils/AppError";

interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(new AppError(Messages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED));
  }

  try {
    const accessSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!accessSecret) {
      return next(new AppError(Messages.SERVER_CONFIG_ERROR, HttpStatus.INTERNAL_SERVER_ERROR));
    }
    const decoded = jwt.verify(token, accessSecret) as JwtPayload & AuthenticatedUser;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username
    };
    next();
  } catch {
    next(new AppError(Messages.TOKEN_INVALID_OR_EXPIRED, HttpStatus.FORBIDDEN));
  }
};
