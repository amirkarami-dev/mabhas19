import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button, Result, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { useAuth } from "./useAuth";
import type { AppRole, Permission } from "@/contracts/rbac";
import { userManager, sessionUserFromOidc } from "./oidc";

const useMock = (import.meta.env.VITE_AUTH_MODE ?? "mock") === "mock";

export function LoginScreen() {
  const { login, user, ready } = useAuth();
  const { t } = useTranslation();
  if (ready && user) return <Navigate to="/ask" replace />;
  return (
    <Result
      title={t("common.appName")}
      extra={
        <Button type="primary" onClick={login}>
          {useMock ? t("auth.mockMode") : t("auth.login")}
        </Button>
      }
    />
  );
}

export function OidcCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  useEffect(() => {
    if (useMock) {
      navigate("/ask", { replace: true });
      return;
    }
    userManager
      .signinRedirectCallback()
      .then((u) => {
        sessionUserFromOidc(u); // primes oidc store; AuthProvider reads on next mount
        navigate("/ask", { replace: true });
      })
      .catch(() => setError(t("auth.callbackError")));
  }, [navigate, t]);
  if (error) return <Result status="error" title={error} />;
  return <Spin tip={t("auth.signingIn")} fullscreen />;
}

export function LogoutScreen() {
  const { logout } = useAuth();
  const { t } = useTranslation();
  useEffect(() => {
    logout();
  }, [logout]);
  return <Result title={t("auth.loggedOut")} />;
}

export function ForbiddenScreen() {
  const { t } = useTranslation();
  return <Result status="403" title="403" subTitle={t("rbac.forbiddenMsg")} />;
}

export function RequireAuth() {
  const { ready, user } = useAuth();
  const loc = useLocation();
  if (!ready) return <Spin fullscreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

export function RequireRole({ allow }: { allow: AppRole[] }) {
  const { ready, roles } = useAuth();
  if (!ready) return <Spin fullscreen />;
  const ok = roles.some((r) => allow.includes(r));
  return ok ? <Outlet /> : <Navigate to="/403" replace />;
}

// Wrapper component: renders `children` when the user holds `perm`, else redirects to /403.
export function RequirePermission({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { ready, can } = useAuth();
  if (!ready) return <Spin fullscreen />;
  return can(perm) ? <>{children}</> : <Navigate to="/403" replace />;
}
