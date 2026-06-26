import type { UserContract } from "./user";

export type LoginRequestContract = {
  username: string;
  password: string;
};

export type RegisterRequestContract = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  avatarUrl?: string;
  avatarFileId?: string;
};

export type AuthResponseContract = {
  user: UserContract;
  csrfToken?: string;
};
