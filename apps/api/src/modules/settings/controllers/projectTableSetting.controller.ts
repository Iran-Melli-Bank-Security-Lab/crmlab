import type { RequestHandler } from "express";
import { PERMISSIONS, type Permission } from "@/constants/permissions";
import { sendSuccess } from "@/utils/response";
import { ProjectTableSettingModel } from "../models/projectTableSetting.model";
import {
  getAllowedProjectTableContexts,
  getAllowedProjectTableColumnRegistry,
  requireAllowedProjectTableContext,
  sanitizeStoredProjectTableSettings,
  type ProjectTableContext,
  validateProjectTableSettings,
} from "../services/projectTableSetting.service";

const serialize = (setting: {
  context: string;
  visibleColumns: string[];
  columnOrder: string[];
  aliases: Map<string, string>;
}, permissions: Express.UserContext["permissions"]) =>
  sanitizeStoredProjectTableSettings(setting.context as ProjectTableContext, {
    visibleColumns: setting.visibleColumns,
    columnOrder: setting.columnOrder,
    aliases: Object.fromEntries(setting.aliases),
  }, permissions);

const LEGACY_USER_CONTEXT_PERMISSIONS: Record<string, Permission> = {
  "security-manager": PERMISSIONS.SECURITY_PROJECTS_READ,
  pentest: PERMISSIONS.PENTEST_PROJECTS_READ,
  devops: PERMISSIONS.DEVOPS_PROJECTS_READ,
  "quality-manager": PERMISSIONS.QUALITY_PROJECTS_READ,
  qa: PERMISSIONS.QA_PROJECTS_READ,
  representative: PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
};

export const getProjectTableColumns: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(res, {
      contexts: getAllowedProjectTableColumnRegistry(req.user!.permissions),
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectTableSettings: RequestHandler = async (req, res, next) => {
  try {
    const contexts = getAllowedProjectTableContexts(req.user!.permissions);
    const legacyContexts = Object.entries(LEGACY_USER_CONTEXT_PERMISSIONS)
      .filter(([, permission]) => req.user!.permissions.includes(permission))
      .map(([context]) => context);
    const settings = await ProjectTableSettingModel.find({
      userId: req.user!.id,
      context: { $in: [...contexts, ...legacyContexts] },
    });
    const currentSettings = settings.filter((setting) =>
      contexts.includes(setting.context as ProjectTableContext)
    );
    const hasSharedUserSettings = currentSettings.some(
      (setting) => setting.context === "user-projects"
    );
    if (contexts.includes("user-projects") && !hasSharedUserSettings) {
      const legacySettings = settings.filter((setting) => legacyContexts.includes(setting.context));
      if (legacySettings.length) {
        const aliases = Object.assign({}, ...legacySettings.map((setting) =>
          Object.fromEntries(setting.aliases)
        ));
        currentSettings.push({
          context: "user-projects",
          visibleColumns: [...new Set(legacySettings.flatMap((setting) => setting.visibleColumns))],
          columnOrder: [...new Set(legacySettings.flatMap((setting) => setting.columnOrder))],
          aliases: new Map(Object.entries(aliases)),
        } as never);
      }
    }
    sendSuccess(
      res,
      Object.fromEntries(currentSettings.map((setting) => [
        setting.context,
        serialize(setting, req.user!.permissions),
      ]))
    );
  } catch (error) {
    next(error);
  }
};

export const saveProjectTableSettings: RequestHandler = async (req, res, next) => {
  try {
    const context = requireAllowedProjectTableContext(
      String(req.params.context),
      req.user!.permissions
    );
    const settings = validateProjectTableSettings(context, req.body, req.user!.permissions);
    const saved = await ProjectTableSettingModel.findOneAndUpdate(
      { userId: req.user!.id, context },
      { $set: settings },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sendSuccess(res, serialize(saved, req.user!.permissions));
  } catch (error) {
    next(error);
  }
};

export const resetProjectTableSettings: RequestHandler = async (req, res, next) => {
  try {
    const context = requireAllowedProjectTableContext(
      String(req.params.context),
      req.user!.permissions
    );
    await ProjectTableSettingModel.deleteOne({ userId: req.user!.id, context });
    sendSuccess(res, { context, reset: true });
  } catch (error) {
    next(error);
  }
};
