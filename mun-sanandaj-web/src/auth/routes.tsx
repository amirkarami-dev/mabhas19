import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { Button, Card, Result, Spin, Typography } from "antd";
import { useAuth } from "./useAuth";
import { getUserManager } from "./oidc";

export function LoginScreen() {
  const { login, user, ready } = useAuth();
  if (ready && user) return <Navigate to="/" replace />;
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card variant="borderless" style={{ width: 360 }} styles={{ body: { padding: 40, textAlign: "center" } }}>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>
          پایش سرویس مبحث ۱۹ سنندج
        </Typography.Title>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 32 }}>
          برای ورود به حساب خود ادامه دهید
        </Typography.Text>
        <Button type="primary" size="large" block onClick={login}>
          ورود
        </Button>
      </Card>
    </div>
  );
}

export function OidcCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    getUserManager()
      .signinRedirectCallback()
      .then(() => navigate("/", { replace: true }))
      .catch(() => setError("ورود ناموفق بود"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Result status="error" title={error} />;
  return <Spin tip="در حال ورود…" fullscreen />;
}

export function OidcSilentCallback() {
  useEffect(() => {
    getUserManager()
      .signinSilentCallback()
      .catch(() => {
        /* silent renew failed; ignore — interactive login still works */
      });
  }, []);
  return null;
}

export function LogoutScreen() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return <Result title="خارج شدید" />;
}

export function ForbiddenScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Result status="403" title="403" subTitle="دسترسی محدود به مدیران سیستم است" />
    </div>
  );
}

export function RequireAuth() {
  const { ready, user } = useAuth();
  if (!ready) return <Spin fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { ready, isAdmin } = useAuth();
  if (!ready) return <Spin fullscreen />;
  return isAdmin ? <Outlet /> : <Navigate to="/403" replace />;
}
