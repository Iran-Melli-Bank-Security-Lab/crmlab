import type { RequestHandler } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from "@/constants/notifications";
import { ROLES } from "@/constants/roles";
import { UserModel } from "@/modules/users/models/user.model";
import { createNotification } from "@/modules/notifications/services/notification.service";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import { TaskModel, type TaskDocument } from "../models/task.model";
import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
} from "../validators/task.validators";

function isAdmin(user: Express.UserContext) {
  return user.roles.includes(ROLES.ADMIN);
}

function requireAdmin(user: Express.UserContext) {
  if (!isAdmin(user)) {
    throw new AppError("Only administrators can manage tasks", HTTP_STATUS.FORBIDDEN);
  }
}

function canReadTask(user: Express.UserContext, task: Pick<TaskDocument, "assigneeId">) {
  const assignee = task.assigneeId as unknown as {
    _id?: { toString(): string };
  };
  const assigneeId = assignee?._id ? assignee._id.toString() : String(task.assigneeId);
  return isAdmin(user) || assigneeId === user.id;
}

async function requireActiveAssignee(assigneeId: string) {
  const assignee = await UserModel.exists({ _id: assigneeId, isActive: true });
  if (!assignee) {
    throw new AppError(
      "Assigned user was not found or is inactive",
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

function serializeTask(task: TaskDocument) {
  const value = task.toObject();
  const populatedAssignee = value.assigneeId as unknown as {
    _id?: { toString(): string };
    firstName?: string;
    lastName?: string;
    username?: string;
  };
  const hasPopulatedAssignee = Boolean(populatedAssignee?._id);
  const assigneeId = hasPopulatedAssignee
    ? populatedAssignee._id!.toString()
    : String(value.assigneeId);

  return {
    ...value,
    id: task._id.toString(),
    assigneeId,
    createdBy: String(value.createdBy),
    ...(hasPopulatedAssignee
      ? {
          assignee: {
            id: assigneeId,
            firstName: populatedAssignee.firstName,
            lastName: populatedAssignee.lastName,
            username: populatedAssignee.username,
          },
        }
      : {}),
  };
}

export const listTasks: RequestHandler = async (req, res, next) => {
  try {
    const filter = isAdmin(req.user!) ? {} : { assigneeId: req.user!.id };
    const tasks = await TaskModel.find(filter)
      .populate("assigneeId", "firstName lastName username")
      .sort({ createdAt: -1 });
    sendSuccess(res, tasks.map(serializeTask));
  } catch (error) {
    next(error);
  }
};

export const getTask: RequestHandler = async (req, res, next) => {
  try {
    const task = await TaskModel.findById(req.params.id).populate(
      "assigneeId",
      "firstName lastName username"
    );
    if (!task) throw new AppError("Task not found", HTTP_STATUS.NOT_FOUND);
    if (!canReadTask(req.user!, task)) {
      throw new AppError(
        "Forbidden: task is not assigned to this user",
        HTTP_STATUS.FORBIDDEN
      );
    }

    sendSuccess(res, serializeTask(task));
  } catch (error) {
    next(error);
  }
};

export const createTask: RequestHandler = async (req, res, next) => {
  try {
    requireAdmin(req.user!);
    const input = createTaskRequestSchema.parse(req.body);
    await requireActiveAssignee(input.assigneeId);

    const task = await TaskModel.create({
      ...input,
      deadline: new Date(input.deadline),
      createdBy: req.user!.id,
    });

    await createNotification({
      userId: input.assigneeId,
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: "New task assigned",
      message: `You were assigned the task: ${task.title}`,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionUrl: "/tasks",
      entityId: task._id.toString(),
    });

    await task.populate("assigneeId", "firstName lastName username");
    sendSuccess(res, serializeTask(task), HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const updateTask: RequestHandler = async (req, res, next) => {
  try {
    requireAdmin(req.user!);
    const input = updateTaskRequestSchema.parse(req.body);
    const existingTask = await TaskModel.findById(req.params.id);
    if (!existingTask) throw new AppError("Task not found", HTTP_STATUS.NOT_FOUND);

    if (input.assigneeId) await requireActiveAssignee(input.assigneeId);
    const previousAssigneeId = String(existingTask.assigneeId);
    existingTask.set({
      ...input,
      ...(input.deadline ? { deadline: new Date(input.deadline) } : {}),
    });
    await existingTask.save();

    if (input.assigneeId && input.assigneeId !== previousAssigneeId) {
      await createNotification({
        userId: input.assigneeId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: "New task assigned",
        message: `You were assigned the task: ${existingTask.title}`,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        actionUrl: "/tasks",
        entityId: existingTask._id.toString(),
      });
    }

    await existingTask.populate("assigneeId", "firstName lastName username");
    sendSuccess(res, serializeTask(existingTask));
  } catch (error) {
    next(error);
  }
};

export const deleteTask: RequestHandler = async (req, res, next) => {
  try {
    requireAdmin(req.user!);
    const task = await TaskModel.findByIdAndDelete(req.params.id);
    if (!task) throw new AppError("Task not found", HTTP_STATUS.NOT_FOUND);

    sendSuccess(res, { id: task._id.toString(), deleted: true });
  } catch (error) {
    next(error);
  }
};
