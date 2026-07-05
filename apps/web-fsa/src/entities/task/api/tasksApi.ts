import type {
  CreateTaskRequestContract,
  TaskContract,
  UpdateTaskRequestContract,
} from "@role-dashboard/contracts";
import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";

type TaskListResponse = TaskContract[] | { success?: boolean; data?: TaskContract[] };
type TaskResponse = TaskContract | { success?: boolean; data?: TaskContract };

export const tasksApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<TaskContract[], void>({
      query: () => "/tasks",
      transformResponse: (response: TaskListResponse) =>
        unwrapApiData<TaskContract[]>(response) || [],
    }),
    getTask: builder.query<TaskContract, string>({
      query: (taskId) => `/tasks/${taskId}`,
      transformResponse: (response: TaskResponse) =>
        unwrapApiData<TaskContract>(response),
    }),
    createTask: builder.mutation<TaskContract, CreateTaskRequestContract>({
      query: (body) => ({ url: "/tasks", method: "POST", body }),
      transformResponse: (response: TaskResponse) =>
        unwrapApiData<TaskContract>(response),
      async onQueryStarted(_body, { dispatch, queryFulfilled }) {
        try {
          const { data: createdTask } = await queryFulfilled;
          dispatch(
            tasksApi.util.updateQueryData("getTasks", undefined, (tasks) => {
              if (!tasks.some((task) => task.id === createdTask.id)) {
                tasks.unshift(createdTask);
              }
            })
          );
        } catch {
          // The mutation error is handled by the form.
        }
      },
    }),
    updateTask: builder.mutation<
      TaskContract,
      { taskId: string; changes: UpdateTaskRequestContract }
    >({
      query: ({ taskId, changes }) => ({
        url: `/tasks/${taskId}`,
        method: "PATCH",
        body: changes,
      }),
      transformResponse: (response: TaskResponse) =>
        unwrapApiData<TaskContract>(response),
    }),
    deleteTask: builder.mutation<{ id: string; deleted: boolean }, string>({
      query: (taskId) => ({ url: `/tasks/${taskId}`, method: "DELETE" }),
      transformResponse: (response) =>
        unwrapApiData<{ id: string; deleted: boolean }>(response),
    }),
  }),
});

export const {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetTaskQuery,
  useGetTasksQuery,
  useUpdateTaskMutation,
} = tasksApi;
