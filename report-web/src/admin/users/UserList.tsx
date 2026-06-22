import { useMemo, useState } from "react";
import { Table, Tag, Button, Space, Switch, Skeleton, Empty, Modal, Input } from "antd";
import { useTranslation } from "react-i18next";
import { isGlobal, type AppRole } from "../../contracts";
import { useAuth } from "../../auth/useAuth";
import { useUsers, useUpsertUser, useSetUserActive, type UserRow } from "../../api/queries";
import { useTenantStore } from "../../store/tenant-store";
import { UserFormModal, type AdminUser } from "./UserFormModal";

const ADMIN_ROLES: AppRole[] = ["SuperAdmin", "TenantAdmin"];

/** Convert a UserRow (status string) to an AdminUser (active boolean). */
function rowToAdminUser(u: UserRow): AdminUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roles: u.roles,
    tenantId: u.tenantId ?? "",
    active: u.status === "active",
  };
}

/** Convert an AdminUser back to the UserRow shape for persistence. */
function adminUserToRow(u: AdminUser): UserRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roles: u.roles,
    tenantId: u.tenantId,
    status: u.active ? "active" : "suspended",
  };
}

export function UserList() {
  const { t } = useTranslation();
  const { user: me, roles } = useAuth();
  // Tenant scope: the switched tenant wins, falling back to the signed-in user's own tenant.
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const tenantId = currentTenantId ?? (me?.tenantId ?? null);

  const { data: rawUsers, isLoading } = useUsers();
  const upsert = useUpsertUser();
  const setActive = useSetUserActive();

  const [modal, setModal] = useState<{ open: boolean; initial?: AdminUser }>({ open: false });
  const [search, setSearch] = useState("");

  const users = useMemo(
    () => (rawUsers ?? []).map(rowToAdminUser),
    [rawUsers],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? users.filter(
          (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
        )
      : users;
  }, [users, search]);

  const activeAdmins = useMemo(
    () => users.filter((u) => u.active && u.roles.some((r) => ADMIN_ROLES.includes(r))),
    [users],
  );

  const toggleActive = (u: AdminUser, next: boolean) => {
    const isLastAdmin =
      !next &&
      u.roles.some((r) => ADMIN_ROLES.includes(r)) &&
      activeAdmins.length <= 1;
    const isSelf = u.id === me?.id;
    const proceed = () => setActive.mutate({ id: u.id, active: next });

    if (isLastAdmin) {
      Modal.confirm({
        title: t("admin.users.lastAdminTitle"),
        content: t("admin.users.lastAdminWarn"),
        okButtonProps: { disabled: true },
        okText: t("common.ok"),
        cancelText: t("common.cancel"),
      });
      return;
    }
    if (isSelf && !next) {
      Modal.confirm({
        title: t("admin.users.selfDeactivateTitle"),
        content: t("admin.users.selfDeactivateWarn"),
        okText: t("common.confirm"),
        cancelText: t("common.cancel"),
        onOk: proceed,
      });
      return;
    }
    proceed();
  };

  const columns = useMemo(
    () => [
      { title: t("admin.users.name"), dataIndex: "name" },
      { title: t("admin.users.email"), dataIndex: "email" },
      {
        title: t("admin.users.roles"),
        dataIndex: "roles",
        render: (rs: AppRole[]) => (
          <Space size={4} wrap>
            {rs.map((r) => (
              <Tag key={r}>{t(`rbac.role.${r}`)}</Tag>
            ))}
          </Space>
        ),
      },
      {
        title: t("admin.users.status"),
        dataIndex: "active",
        render: (_: boolean, u: AdminUser) => (
          <Switch checked={u.active} onChange={(v) => toggleActive(u, v)} />
        ),
      },
      {
        title: t("admin.users.lastActive"),
        dataIndex: "lastActiveAt",
        render: (d?: string) => (d ? new Date(d).toLocaleString() : "—"),
      },
      {
        title: t("common.actions"),
        render: (_: unknown, u: AdminUser) => (
          <Button size="small" onClick={() => setModal({ open: true, initial: u })}>
            {t("common.edit")}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, activeAdmins.length, me?.id],
  );

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}>
        <h2>{t("admin.users.title")}</h2>
        <Button type="primary" onClick={() => setModal({ open: true })}>
          {t("admin.users.inviteUser")}
        </Button>
      </Space>
      <Input.Search
        placeholder={t("common.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />
      {filtered.length === 0 ? (
        <Empty description={t("admin.users.empty")}>
          <Button type="primary" onClick={() => setModal({ open: true })}>
            {t("admin.users.inviteUser")}
          </Button>
        </Empty>
      ) : (
        <Table rowKey="id" dataSource={filtered} columns={columns} />
      )}
      <UserFormModal
        open={modal.open}
        initial={modal.initial}
        tenantId={tenantId}
        allowSuperAdmin={isGlobal(roles)}
        onCancel={() => setModal({ open: false })}
        onSave={(u) => {
          upsert.mutate(adminUserToRow(u));
          setModal({ open: false });
        }}
      />
    </div>
  );
}
