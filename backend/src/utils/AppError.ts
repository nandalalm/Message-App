import { HttpStatus } from "../constants/httpStatus";

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = HttpStatus.BAD_REQUEST) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
