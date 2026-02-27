import { createBrowserRouter } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/DashboardPage";
import UsersPage from "@/pages/Users";
import OrganizationsPage from "@/pages/Organizations";
import FacilitiesPage from "@/pages/Facilities";
import UnitsPage from "@/pages/Units";
import LeadsPage from "@/pages/Leads";
import LeadDetailPage from "@/pages/LeadDetail";
import LeadConvertPage from "@/pages/LeadConvert";
import TenantsPage from "@/pages/Tenants";
import TenantDetailPage from "@/pages/TenantDetail";
import Tenant360Page from "@/pages/Tenant360";
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
      {
        path: "/users",
        element: (
          <RequireRole roles={["admin"]}>
            <UsersPage />
          </RequireRole>
        )
      },
      {
        path: "/organizations",
        element: (
          <RequireRole roles={["admin", "admin_corporativo"]}>
            <OrganizationsPage />
          </RequireRole>
        )
      },
      {
        path: "/facilities",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente"]}>
            <FacilitiesPage />
          </RequireRole>
        )
      },
      {
        path: "/units",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente", "financeiro"]}>
            <UnitsPage />
          </RequireRole>
        )
      },
      {
        path: "/leads",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente", "ops"]}>
            <LeadsPage />
          </RequireRole>
        )
      },
      {
        path: "/leads/:id",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente", "ops"]}>
            <LeadDetailPage />
          </RequireRole>
        )
      },
      {
        path: "/leads/:id/convert",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente"]}>
            <LeadConvertPage />
          </RequireRole>
        )
      },
      {
        path: "/tenants",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente", "ops", "financeiro"]}>
            <TenantsPage />
          </RequireRole>
        )
      },
      {
        path: "/tenants/new",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente"]}>
            <TenantDetailPage />
          </RequireRole>
        )
      },
      {
        path: "/tenants/:id",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente", "ops", "financeiro"]}>
            <TenantDetailPage />
          </RequireRole>
        )
      },
      {
        path: "/tenants/:id/360",
        element: (
          <RequireRole roles={["admin", "admin_corporativo", "gerente", "ops", "financeiro"]}>
            <Tenant360Page />
          </RequireRole>
        )
      }
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
