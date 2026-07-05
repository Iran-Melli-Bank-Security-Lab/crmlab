import { Router } from "express";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from "../controllers/task.controller";
import {
  createTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from "../validators/task.validators";

const router = Router();

router.use(requireAuth);
router.get(ROUTES.ROOT, listTasks);
router.post(ROUTES.ROOT, validate(createTaskSchema), createTask);
router.get(ROUTES.PARAM_ID, validate(taskIdSchema), getTask);
router.patch(
  ROUTES.PARAM_ID,
  validate(taskIdSchema),
  validate(updateTaskSchema),
  updateTask
);
router.delete(ROUTES.PARAM_ID, validate(taskIdSchema), deleteTask);

export default router;
