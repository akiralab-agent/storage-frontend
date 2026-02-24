import { createBrowserRouter } from "react-router-dom";
import { statusRoutes } from "@/features/status/routes";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/DashboardPage";
import UsersPage from "@/pages/Users";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { RequireRole } from "@/shared/auth";
import AuthenticatedLayout from "@/widgets/layout/AuthenticatedLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    element: <AuthenticatedLayout />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />
      },
      ...statusRoutes
    ]
  },
  {
    path: "/users",
    element: (
      <RequireRole roles={["admin"]}>
        <UsersPage />
      </RequireRole>
    )
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
