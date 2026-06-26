import { useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";

export function useAuth() {
  const auth = useSelector((state: RootState) => state.auth);
  const roles = auth.user?.roles || [];
  const permissions = auth.user?.permissions || [];

  return {
    ...auth,
    roles,
    permissions,
  };
}
