import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HTTP_STATUS } from "@/constants/http";

export function validate(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });

    if (!parsed.success) {
      return next({ statusCode: HTTP_STATUS.BAD_REQUEST, message: parsed.error.issues[0]?.message || "Invalid request" });
    }

    next();
  };
}
