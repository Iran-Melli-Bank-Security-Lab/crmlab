import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PublicRoute from "@/app/router/guards/PublicRoute";
import ProtectedRoute from "@/app/router/guards/ProtectedRoute";
import PermissionRoute from "@/app/router/guards/PermissionRoute";
import PublicLayout from "@/widgets/public-layout/PublicLayout";
import DashboardLayout from "@/widgets/dashboard-layout/DashboardLayout";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import ErrorBoundary from "@/shared/ui/feedback/ErrorBoundary";
import { protectedRouteConfig } from "@/app/router/protectedRouteConfig";

const Login = lazy(() => import("@/pages/login/Login"));
const Signup = lazy(() => import("@/pages/signup/Signup"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password/ForgotPassword"));
const Unauthorized = lazy(() => import("@/pages/unauthorized/Unauthorized"));
const NotFound = lazy(() => import("@/pages/not-found/NotFound"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen text="Loading page..." />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<PublicRoute />}>
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/unauthorized" element={<Unauthorized />} />
            {protectedRouteConfig.flatMap((route) => {
              const Page = route.element;
              const paths =
                route.path === "/projects/:projectId"
                  ? [route.path, `${route.path}/devops`]
                  : [route.path];
              return paths.map((path) => (
                <Route
                  key={path}
                  element={<PermissionRoute permissions={route.permissions} />}
                >
                  <Route
                    path={path}
                    element={
                      <ErrorBoundary>
                        <Page />
                      </ErrorBoundary>
                    }
                  />
                </Route>
              ));
            })}
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
