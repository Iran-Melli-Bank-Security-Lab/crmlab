import type { RequestHandler } from "express";
import { sendSuccess } from "@/utils/response";
import { ProjectTableSettingModel } from "../models/projectTableSetting.model";
import {
  getAllowedProjectTableContexts,
  getAllowedProjectTableColumnRegistry,
  requireAllowedProjectTableContext,
  type ProjectTableContext,
  validateProjectTableSettings,
} from "../services/projectTableSetting.service";

const serialize = (setting: {
  context: string;
  visibleColumns: string[];
  columnOrder: string[];
  aliases: Map<string, string>;
}) => validateProjectTableSettings(setting.context as ProjectTableContext, {
  visibleColumns: setting.visibleColumns,
  columnOrder: setting.columnOrder,
  aliases: Object.fromEntries(setting.aliases),
});

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
    const settings = await ProjectTableSettingModel.find({
      userId: req.user!.id,
      context: { $in: contexts },
    });
    sendSuccess(
      res,
      Object.fromEntries(settings.map((setting) => [setting.context, serialize(setting)]))
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
    const settings = validateProjectTableSettings(context, req.body);
    const saved = await ProjectTableSettingModel.findOneAndUpdate(
      { userId: req.user!.id, context },
      { $set: settings },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sendSuccess(res, serialize(saved));
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
