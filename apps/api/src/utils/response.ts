import type { Response } from "express";
import { HTTP_STATUS, type HttpStatus } from "@/constants/http";

type ErrorResponseOptions = {
  code?: string;
  details?: unknown;
};

export function sendSuccess<T>(res: Response, data: T, statusCode: HttpStatus = HTTP_STATUS.OK) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendMessage(res: Response, message: string, statusCode: HttpStatus = HTTP_STATUS.OK) {
  return res.status(statusCode).json({
    success: true,
    message,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  options: ErrorResponseOptions = {}
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(options.code ? { code: options.code } : {}),
      ...(options.details ? { details: options.details } : {}),
    },
  });
}
