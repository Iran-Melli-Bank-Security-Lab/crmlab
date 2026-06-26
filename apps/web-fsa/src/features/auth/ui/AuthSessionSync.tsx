import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateUser } from "@/features/auth/model/authSlice";
import { useAuth } from "@/features/auth/model/useAuth";
import { useGetMeQuery } from "@/features/auth/api/authApi";

export default function AuthSessionSync() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const { data: currentUser } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (currentUser) {
      dispatch(updateUser(currentUser));
    }
  }, [currentUser, dispatch]);

  return null;
}
