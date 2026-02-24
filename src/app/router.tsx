import { createBrowserRouter } from "react-router-dom";
import { statusRoutes } from "@/features/status/routes";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/DashboardPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import NotFoundPage from "@/pages/NotFoundPage";
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
    path: "/unauthorized",
    element: <UnauthorizedPage />
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
