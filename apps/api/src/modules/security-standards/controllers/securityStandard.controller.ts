import type { RequestHandler } from "express";
import { sendSuccess } from "@/utils/response";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";
import {
  SECURITY_STANDARD_TYPES,
  type SecurityStandardType,
} from "../models/securityStandard.model";
import {
  getActiveSecurityStandardTree,
  listActiveSecurityStandards,
  listActiveSecurityStandardsByType,
} from "../services/securityStandard.service";

function serializeStandard<T extends { _id: unknown }>(standard: T) {
  const { _id, ...value } = standard;
  return { ...value, id: String(_id) };
}

export const listSecurityStandards: RequestHandler = async (req, res, next) => {
  try {
    const type = req.query.type ? String(req.query.type) : undefined;
    if (type && !(SECURITY_STANDARD_TYPES as readonly string[]).includes(type)) {
      throw new AppError("Invalid security standard type", HTTP_STATUS.BAD_REQUEST);
    }
    const standards = type
      ? await listActiveSecurityStandardsByType(type as SecurityStandardType)
      : await listActiveSecurityStandards();
    sendSuccess(res, standards.map(serializeStandard));
  } catch (error) {
    next(error);
  }
};

export const getSecurityStandardTree: RequestHandler = async (req, res, next) => {
  try {
    const standard = await getActiveSecurityStandardTree(
      String(req.params.standardKey),
      String(req.params.version)
    );
    sendSuccess(res, serializeStandard(standard));
  } catch (error) {
    next(error);
  }
};
