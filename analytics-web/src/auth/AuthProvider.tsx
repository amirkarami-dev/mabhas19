import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./useAuth";
import type { AuthValue } from "./useAuth";
import type { SessionUser } from "@/contracts";
import { permissionsFor, type AppRole, type Permission } from "@/contracts/rbac";
import { getMockUser, setMockUser } from "./mock-user";
import { getUserManager, sessionUserFromOidc } from "./oidc";

const ADMIN_ROLES: AppRole[] = ["SuperAdmin", "TenantAdmin", "AIManager"];
const ADMIN_PERMS: Permission[] = ["ai:manage", "datasources:manage", "users:manage", "audit:read"];

const useMock = (import.meta.env.VITE_AUTH_MODE ?? "mock") === "mock";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (useMock) {
        if (alive) {
          setUser(getMockUser());
          setReady(true);
        }
        return;
      }
      const u = await getUserManager().getUser();
      if (!alive) return;
      setUser(u && !u.expired ? sessionUserFromOidc(u) : null);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setMockRole = useCallback((roles: AppRole[]) => {
    setUser(setMockUser(roles));
  }, []);

  const login = useCallback(() => {
    if (useMock) {
      setUser(getMockUser());
    } else {
      void getUserManager().signinRedirect();
    }
  }, []);

  const logout = useCallback(() => {
    if (useMock) {
      localStorage.removeItem("report.mockUser");
      setUser(null);
    } else {
      void getUserManager().signoutRedirect();
    }
  }, []);

  const value = useMemo<AuthValue>(() => {
    const roles = user?.roles ?? [];
    const permissions = permissionsFor(roles, user?.grants ?? []);
    const isAdmin =
      roles.some((r) => ADMIN_ROLES.includes(r)) ||
      ADMIN_PERMS.some((p) => permissions.has(p));
    return {
      user,
      roles,
      ready,
      isAdmin,
      permissions,
      can: (p: Permission) => permissions.has(p),
      login,
      logout,
      setMockRole,
    };
  }, [user, ready, login, logout, setMockRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
