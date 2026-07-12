import type { RequestHandler } from "express";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { writeAuditLog } from "@/modules/audit/services/audit.service";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import { getProjectDevopsWorkspace, saveProjectDevopsInfo } from "../services/devopsInfo.service";
import type { DevopsInfoInput } from "../validators/devops.validators";

export const getDevopsInfo: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
    const projectId = String(req.params.projectId);
    const result = await getProjectDevopsWorkspace(projectId, req.user);
    await writeAuditLog({ req, action: AUDIT_ACTIONS.DEVOPS_INFO_VIEW, entityType: AUDIT_ENTITY_TYPES.DEVOPS_INFO, entityId: projectId, metadata: { projectId } });
    sendSuccess(res, result);
  } catch (error) { next(error); }
};

export const putDevopsInfo: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
    const projectId = String(req.params.projectId);
    await saveProjectDevopsInfo(projectId, req.body as DevopsInfoInput, req.user.id);
    await writeAuditLog({ req, action: AUDIT_ACTIONS.DEVOPS_INFO_UPDATE, entityType: AUDIT_ENTITY_TYPES.DEVOPS_INFO, entityId: projectId, metadata: { projectId, deploymentMode: req.body.deploymentMode } });
    const result = await getProjectDevopsWorkspace(projectId, req.user);
    sendSuccess(res, result);
  } catch (error) { next(error); }
};
