import { useEffect } from "react";
import type { ProjectTableColumnContract } from "@role-dashboard/contracts";
import { useDispatch } from "react-redux";
import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";
import {
  hydrateProjectTableSettings,
  type ProjectTableContextSettings,
  type ProjectTableSettings,
} from "../model/uiSlice";

export type ProjectTableColumnDefinition = ProjectTableColumnContract;

export type ProjectTableColumnRegistry = {
  contexts: Array<{
    context: string;
    defaultLabel: string;
    faLabel: string;
    columns: ProjectTableColumnDefinition[];
  }>;
};

export const projectTableSettingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjectTableColumnRegistry: builder.query<ProjectTableColumnRegistry, string>({
      query: () => "/settings/project-table-columns",
      transformResponse: unwrapApiData<ProjectTableColumnRegistry>,
    }),
    getProjectTableSettings: builder.query<ProjectTableSettings, string>({
      query: () => "/settings/project-tables",
      transformResponse: unwrapApiData<ProjectTableSettings>,
      providesTags: ["ProjectTableSettings"],
    }),
    saveProjectTableSettings: builder.mutation<
      ProjectTableContextSettings,
      { context: string; settings: ProjectTableContextSettings }
    >({
      query: ({ context, settings }) => ({
        url: `/settings/project-tables/${encodeURIComponent(context)}`,
        method: "PUT",
        body: settings,
      }),
      transformResponse: unwrapApiData<ProjectTableContextSettings>,
    }),
    resetProjectTableSettings: builder.mutation<unknown, string>({
      query: (context) => ({
        url: `/settings/project-tables/${encodeURIComponent(context)}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useGetProjectTableColumnRegistryQuery,
  useGetProjectTableSettingsQuery,
  useSaveProjectTableSettingsMutation,
  useResetProjectTableSettingsMutation,
} = projectTableSettingsApi;

export function useSyncProjectTableSettings(userId?: string) {
  const dispatch = useDispatch();
  const query = useGetProjectTableSettingsQuery(userId || "", { skip: !userId });

  useEffect(() => {
    if (userId && query.data) {
      dispatch(hydrateProjectTableSettings({ userId, settings: query.data }));
    }
  }, [dispatch, query.data, userId]);

  return query;
}
