import type { RequestHandler } from "express";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { writeAuditLog } from "@/modules/audit/services/audit.service";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import {
  blockProjectProvisioning,
  confirmProjectProvisioning,
  retryProjectProvisioning,
  startProjectProvisioning,
} from "../services/projectProvisioning.service";

async function runTransition(
  req: Parameters<RequestHandler>[0],
  action: () => Promise<{
    project: { toObject(): Record<string, unknown>; _id: unknown };
    previousStatus: string;
    newStatus: string;
  }>
) {
  if (!req.user) throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
  const projectId = String(req.params.id);
  const result = await action();
  await writeAuditLog({
    req,
    action: AUDIT_ACTIONS.PROJECT_PROVISIONING_TRANSITION,
    entityType: AUDIT_ENTITY_TYPES.PROJECT,
    entityId: projectId,
    previousValue: { provisioningStatus: result.previousStatus },
    newValue: { provisioningStatus: result.newStatus },
    metadata: {
      projectId,
      attemptNumber: result.project.toObject().provisioningAttemptNumber || 1,
      notes: req.body.notes,
      failureReason: req.body.failureReason,
    },
  });
  return {
    ...result.project.toObject(),
    id: String(result.project._id),
  };
}

export const startProvisioning: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await runTransition(req, () =>
        startProjectProvisioning(String(req.params.id), req.user!, req.body.notes)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const confirmProvisioningReady: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await runTransition(req, () =>
        confirmProjectProvisioning(String(req.params.id), req.user!, req.body.notes)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const reportProvisioningBlocked: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await runTransition(req, () =>
        blockProjectProvisioning(String(req.params.id), req.user!, req.body)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const requestProvisioningRetry: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await runTransition(req, () =>
        retryProjectProvisioning(String(req.params.id), req.user!, req.body.notes)
      )
    );
  } catch (error) {
    next(error);
  }
};
