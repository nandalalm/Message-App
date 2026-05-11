import { Request, Response, NextFunction } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { HttpStatus } from "../constants/httpStatus";
import { Messages } from "../constants/messages";
import { logError } from "./loggerMiddleware";
import { AppError } from "../utils/AppError";

interface HttpError extends Error {
  statusCode?: number;
  status?: number;
  type?: string;
  code?: number | string;
  isOperational?: boolean;
}

const isProduction = process.env.NODE_ENV === "production";

const normalizeError = (err: HttpError): AppError => {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new AppError(Messages.FILE_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE);
    }
    return new AppError(err.message, HttpStatus.BAD_REQUEST);
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError("Invalid resource identifier", HttpStatus.BAD_REQUEST);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return new AppError(err.message, HttpStatus.BAD_REQUEST);
  }

  if (err instanceof SyntaxError && err.status === HttpStatus.BAD_REQUEST && err.type === "entity.parse.failed") {
    return new AppError(Messages.INVALID_JSON, HttpStatus.BAD_REQUEST);
  }

  const statusCode = err.statusCode || err.status || HttpStatus.INTERNAL_SERVER_ERROR;
  const isOperational = statusCode < HttpStatus.INTERNAL_SERVER_ERROR;
  return new AppError(err.message || Messages.INTERNAL_ERROR, statusCode, isOperational);
};

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`${Messages.ROUTE_NOT_FOUND}: ${req.originalUrl}`, HttpStatus.NOT_FOUND));
};

export const errorMiddleware = (err: HttpError, req: Request, res: Response, _next: NextFunction): void => {
  if (res.headersSent) {
    return _next(err);
  }

  const normalizedError = normalizeError(err);
  console.error(normalizedError.stack);
  logError(normalizedError, req);
  
  const statusCode = normalizedError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  const message =
    normalizedError.isOperational || !isProduction
      ? normalizedError.message
      : Messages.INTERNAL_ERROR;

  res.status(statusCode).json({
    message,
    ...(isProduction ? {} : { stack: normalizedError.stack }),
  });
};
