import { createBrowserRouter } from "react-router-dom";
import { statusRoutes } from "@/features/status/routes";
import LandingPage from "@/pages/LandingPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import NotFoundPage from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />
  },
  ...statusRoutes,
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
