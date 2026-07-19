import type { UserFormPayload } from "@/shared/types";

export function buildUserUpdateRequest({ id, ...body }: UserFormPayload & { id: string }) {
  return { url: `/users/${id}`, method: "PUT" as const, body };
}
