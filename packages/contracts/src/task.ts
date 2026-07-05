export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";

export type TaskAssigneeContract = {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
};

export type TaskContract = {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assignee?: TaskAssigneeContract;
  createdBy: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  createdAt: string;
  updatedAt: string;
};

type CreateTaskFields = Pick<
  TaskContract,
  "title" | "description" | "assigneeId" | "priority" | "status" | "deadline"
>;

export type CreateTaskRequestContract = Omit<CreateTaskFields, "status"> & {
  status?: TaskStatus;
};

export type UpdateTaskRequestContract = Partial<CreateTaskRequestContract>;
