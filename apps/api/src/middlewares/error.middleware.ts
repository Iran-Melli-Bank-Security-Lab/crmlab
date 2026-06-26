import type { ErrorRequestHandler, RequestHandler } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";
import { sendError } from "@/utils/response";

type HttpError = Error & {
  status?: number;
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const error = err as HttpError;
  const statusCode =
    err instanceof AppError
      ? err.statusCode
      : error.statusCode || error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const isOperational = err instanceof AppError || error.isOperational || statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = isOperational ? error.message : "Internal server error";

  if (!isOperational && process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  sendError(res, message, statusCode, {
    code: error.code,
  });
};
