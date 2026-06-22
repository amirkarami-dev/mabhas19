import { useMemo, useState, useCallback } from "react";
import { Table, Tag, Button, Space, Skeleton, Empty, Modal } from "antd";
import { useTranslation } from "react-i18next";
import type { Tenant, TenantStatus } from "../../contracts";
import { useTenants, useUpsertTenant, useSetTenantStatus } from "../../api/queries";
import { TenantFormModal } from "./TenantFormModal";

const STATUS_COLOR: Record<TenantStatus, string> = {
  active: "green",
  trial: "gold",
  suspended: "red",
};

export function TenantList() {
  const { t } = useTranslation();
  const { data: tenants, isLoading } = useTenants();
  const upsert = useUpsertTenant();
  const setStatus = useSetTenantStatus();
  const [modal, setModal] = useState<{ open: boolean; initial?: Tenant }>({ open: false });

  const suspend = useCallback(
    (tn: Tenant) => {
      Modal.confirm({
        title: t("admin.tenants.suspendTitle"),
        content: t("admin.tenants.suspendWarn", { name: tn.displayName }),
        okText: t("admin.tenants.suspend"),
        okButtonProps: { danger: true },
        cancelText: t("common.cancel"),
        onOk: () => setStatus.mutate({ id: tn.id, status: "suspended" }),
      });
    },
    [t, setStatus],
  );

  const openModal = useCallback((initial?: Tenant) => setModal({ open: true, initial }), []);
  const closeModal = useCallback(() => setModal({ open: false }), []);

  const columns = useMemo(
    () => [
      { title: t("admin.tenants.displayName"), dataIndex: "displayName" },
      { title: t("admin.tenants.slug"), dataIndex: "slug" },
      {
        title: t("admin.tenants.plan"),
        dataIndex: "plan",
        render: (p: string) => t(`admin.tenant.planValue.${p}`),
      },
      {
        title: t("admin.tenants.status"),
        dataIndex: "status",
        render: (s: TenantStatus) => (
          <Tag color={STATUS_COLOR[s]}>{t(`admin.tenants.statusValue.${s}`)}</Tag>
        ),
      },
      {
        title: t("common.actions"),
        render: (_: unknown, tn: Tenant) => (
          <Space>
            <Button size="small" onClick={() => openModal(tn)}>
              {t("common.edit")}
            </Button>
            {tn.status === "suspended" ? (
              <Button
                size="small"
                onClick={() => setStatus.mutate({ id: tn.id, status: "active" })}
              >
                {t("admin.tenants.reactivate")}
              </Button>
            ) : (
              <Button size="small" danger onClick={() => suspend(tn)}>
                {t("admin.tenants.suspend")}
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [t, openModal, setStatus, suspend],
  );

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  const list = tenants ?? [];

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}>
        <h2>{t("admin.tenants.title")}</h2>
        <Button type="primary" onClick={() => openModal()}>
          {t("admin.tenants.create")}
        </Button>
      </Space>
      {list.length === 0 ? (
        <Empty description={t("admin.tenants.empty")}>
          <Button type="primary" onClick={() => openModal()}>
            {t("admin.tenants.create")}
          </Button>
        </Empty>
      ) : (
        <Table rowKey="id" dataSource={list} columns={columns} />
      )}
      <TenantFormModal
        open={modal.open}
        initial={modal.initial}
        onCancel={closeModal}
        onSave={(tn) => {
          upsert.mutate(tn);
          closeModal();
        }}
      />
    </div>
  );
}
