/* eslint-disable react-refresh/only-export-components -- router singleton, not a hot-reload component module */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import {
  LoginScreen,
  OidcCallback,
  LogoutScreen,
  ForbiddenScreen,
  RequireAuth,
  RequireRole,
  RequirePermission,
} from "../auth/routes";
import { PagePlaceholder } from "./PagePlaceholder";
import { AskAiBuilder } from "../features/ask-ai";
import { ReportLibrary } from "../features/library";
import { ReportViewer } from "../features/viewer";

const P = (name: string) => <PagePlaceholder name={name} />;
const ADMIN_SET = ["SuperAdmin", "TenantAdmin", "AIManager"] as const;

export const router = createBrowserRouter([
  // Public / Auth
  { path: "/login", element: <LoginScreen /> },
  { path: "/auth/callback", element: <OidcCallback /> },
  { path: "/logout", element: <LogoutScreen /> },
  { path: "/403", element: <ForbiddenScreen /> },

  // Authenticated app
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Default redirect to /ask
          { index: true, element: <Navigate to="/ask" replace /> },

          // User Area
          { path: "ask", element: <AskAiBuilder /> },
          { path: "ask/:threadId", element: P("AskAIThread") },
          { path: "reports", element: <ReportLibrary /> },
          {
            element: <RequireRole allow={["ReportDesigner", "TenantAdmin", "SuperAdmin"]} />,
            children: [
              { path: "reports/new", element: P("ReportDesigner (new)") },
              { path: "reports/:reportId/edit", element: P("ReportDesigner (edit)") },
            ],
          },
          { path: "reports/:reportId", element: <ReportViewer /> },
          {
            path: "reports/:reportId/run",
            element: (
              <RequirePermission perm="reports:execute">
                {P("ReportRunResult")}
              </RequirePermission>
            ),
          },
          { path: "reports/:reportId/history", element: P("ReportRunHistory") },
          { path: "dashboards", element: P("DashboardLibrary") },
          {
            element: (
              <RequireRole
                allow={["DashboardDesigner", "TenantAdmin", "SuperAdmin"]}
              />
            ),
            children: [
              { path: "dashboards/new", element: P("DashboardBuilder (new)") },
              { path: "dashboards/:dashId/edit", element: P("DashboardBuilder") },
            ],
          },
          { path: "dashboards/:dashId", element: P("DashboardViewer") },
          {
            element: (
              <RequireRole
                allow={[
                  "PowerUser",
                  "ReportDesigner",
                  "DashboardDesigner",
                  "AIManager",
                  "TenantAdmin",
                  "SuperAdmin",
                ]}
              />
            ),
            children: [
              { path: "data", element: P("DataCatalog") },
              { path: "data/:modelId", element: P("SemanticModelExplorer") },
            ],
          },
          {
            path: "exports",
            element: (
              <RequirePermission perm="data:export">
                {P("ExportCenter")}
              </RequirePermission>
            ),
          },
          { path: "profile", element: P("UserProfile") },
          { path: "settings", element: P("UserPreferences") },
          { path: "favorites", element: P("Favorites") },

          // Admin Area
          {
            path: "admin",
            element: <RequireRole allow={[...ADMIN_SET]} />,
            children: [
              { index: true, element: P("AdminOverview") },
              {
                path: "users",
                element: (
                  <RequirePermission perm="users:manage">
                    {P("UserList")}
                  </RequirePermission>
                ),
              },
              {
                path: "users/:userId",
                element: (
                  <RequirePermission perm="users:manage">
                    {P("UserDetail")}
                  </RequirePermission>
                ),
              },
              { path: "roles", element: P("RoleMatrix") },
              {
                path: "data-sources",
                element: (
                  <RequirePermission perm="datasources:manage">
                    {P("DataSourceList")}
                  </RequirePermission>
                ),
              },
              {
                path: "data-sources/new",
                element: (
                  <RequirePermission perm="datasources:manage">
                    {P("DataSourceWizard")}
                  </RequirePermission>
                ),
              },
              {
                path: "data-sources/:id",
                element: (
                  <RequirePermission perm="datasources:manage">
                    {P("DataSourceDetail")}
                  </RequirePermission>
                ),
              },
              {
                path: "semantic-models",
                element: (
                  <RequirePermission perm="datasources:manage">
                    {P("SemanticModelList")}
                  </RequirePermission>
                ),
              },
              {
                path: "semantic-models/new",
                element: (
                  <RequirePermission perm="datasources:manage">
                    {P("SemanticModelEditor (new)")}
                  </RequirePermission>
                ),
              },
              {
                path: "semantic-models/:id",
                element: (
                  <RequirePermission perm="datasources:manage">
                    {P("SemanticModelEditor (edit)")}
                  </RequirePermission>
                ),
              },
              // NOTE: Task 18 REPLACES this whole `/admin/ai` subtree with the AIAdminShell route.
              {
                path: "ai",
                children: [
                  {
                    path: "providers",
                    element: (
                      <RequirePermission perm="ai:manage">
                        {P("AIProviderList")}
                      </RequirePermission>
                    ),
                  },
                  {
                    path: "providers/:id",
                    element: (
                      <RequirePermission perm="ai:manage">
                        {P("AIProviderDetail")}
                      </RequirePermission>
                    ),
                  },
                  {
                    path: "routing",
                    element: (
                      <RequirePermission perm="ai:manage">
                        {P("AIRoutingRules")}
                      </RequirePermission>
                    ),
                  },
                  {
                    path: "prompts",
                    element: (
                      <RequirePermission perm="ai:manage">
                        {P("PromptVersions")}
                      </RequirePermission>
                    ),
                  },
                  {
                    path: "usage",
                    element: (
                      <RequirePermission perm="ai:manage">
                        {P("AIUsageCost")}
                      </RequirePermission>
                    ),
                  },
                ],
              },
              {
                path: "tenant",
                children: [
                  { index: true, element: P("TenantSettings") },
                  { path: "quota", element: P("QuotaManagement") },
                ],
              },
              {
                path: "audit",
                element: (
                  <RequirePermission perm="audit:read">
                    {P("AuditLog")}
                  </RequirePermission>
                ),
              },
              {
                path: "audit/:eventId",
                element: (
                  <RequirePermission perm="audit:read">
                    {P("AuditEventDetail")}
                  </RequirePermission>
                ),
              },
              {
                path: "tenants",
                element: <RequireRole allow={["SuperAdmin"]} />,
                children: [
                  { index: true, element: P("TenantList") },
                  { path: "new", element: P("TenantCreate") },
                  { path: ":id", element: P("TenantDetail") },
                ],
              },
              {
                path: "system",
                element: P("SystemSettings"),
              },
            ],
          },
        ],
      },
    ],
  },

  // 404
  { path: "*", element: <PagePlaceholder name="NotFoundScreen" /> },
]);
