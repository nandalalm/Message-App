import { Request, Response, NextFunction } from "express";
import { HttpStatus } from "../constants/httpStatus";
import { logError } from "./loggerMiddleware";

interface HttpError extends Error {
  statusCode?: number;
}

export const errorMiddleware = (err: HttpError, req: Request, res: Response, _next: NextFunction): void => {
  console.error(err.stack);
  logError(err, req);
  
  const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({ message: err.message });
};
