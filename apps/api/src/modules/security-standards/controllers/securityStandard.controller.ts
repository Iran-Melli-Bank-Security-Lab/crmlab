import type { RequestHandler } from "express";
import { sendSuccess } from "@/utils/response";
import {
  getActiveSecurityStandardTree,
  listActiveSecurityStandards,
} from "../services/securityStandard.service";

function serializeStandard<T extends { _id: unknown }>(standard: T) {
  const { _id, ...value } = standard;
  return { ...value, id: String(_id) };
}

export const listSecurityStandards: RequestHandler = async (_req, res, next) => {
  try {
    const standards = await listActiveSecurityStandards();
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
