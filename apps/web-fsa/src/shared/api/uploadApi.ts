import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";
import type { UploadResponse } from "@/shared/types";

type UploadPayload = { file: File; fieldName?: string };
type BackendUploadResponse = Partial<UploadResponse> & { avatarUrl?: string };

function normalizeUploadResponse(response: BackendUploadResponse | { success?: boolean; data?: BackendUploadResponse }): UploadResponse {
  const payload = unwrapApiData<BackendUploadResponse>(response);
  return {
    url: payload.url || payload.avatarUrl || "",
    fileId: payload.fileId || "",
  };
}

export const uploadApi = api.injectEndpoints({
  endpoints: (builder) => ({
    uploadFile: builder.mutation<UploadResponse, UploadPayload>({
      query: ({ file, fieldName = "avatar" }) => {
        const formData = new FormData();
        formData.append(fieldName, file);

        return { url: "/upload/avatar", method: "POST", body: formData };
      },
      transformResponse: normalizeUploadResponse,
      invalidatesTags: ["Upload"],
    }),
    deleteFile: builder.mutation<{ fileId?: string; deleted?: boolean }, string>({
      query: (fileId) => ({ url: `/upload/${fileId}`, method: "DELETE" }),
      transformResponse: (response: { success?: boolean; data?: { fileId?: string; deleted?: boolean } }) =>
        unwrapApiData(response),
      invalidatesTags: ["Upload"],
    }),
  }),
});

export const { useUploadFileMutation, useDeleteFileMutation } = uploadApi;
