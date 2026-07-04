import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";
import {
  hydrateProjectTableSettings,
  type ProjectTableContextSettings,
  type ProjectTableSettings,
} from "../model/uiSlice";

export const projectTableSettingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
