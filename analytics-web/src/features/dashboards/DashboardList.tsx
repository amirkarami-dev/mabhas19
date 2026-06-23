import { Button, Dropdown, Input, Space } from "antd";
import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCreateDashboard, useDashboards, useDeleteDashboard } from "@/api/queries";
import { useAuth } from "@/auth/useAuth";
import { EmptyState, PageContainer, PageHeader, SectionCard, Loading } from "@/components/ui";

export function DashboardList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { data, isLoading } = useDashboards();
  const create = useCreateDashboard();
  const del = useDeleteDashboard();
  const [q, setQ] = useState("");

  const canCreate =
    roles.includes("DashboardDesigner") ||
    roles.includes("TenantAdmin") ||
    roles.includes("SuperAdmin");

  const boards = useMemo(
    () =>
      (data ?? []).filter((d) =>
        d.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [data, q],
  );

  const onNew = async () => {
    const d = await create.mutateAsync({ name: t("dash.untitled") });
    void navigate(`/dashboards/${d.id}/edit`);
  };

  if (isLoading) return <Loading rows={6} />;

  return (
    <PageContainer>
      <PageHeader
        title={t("dashboards.title")}
        actions={
          <Space wrap>
            <Input.Search
              placeholder={t("dash.search")}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 240 }}
            />
            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={create.isPending}
                onClick={() => void onNew()}
              >
                {t("dash.new")}
              </Button>
            )}
          </Space>
        }
      />

      {boards.length === 0 ? (
        <EmptyState
          description={t("dash.emptyList")}
          action={
            canCreate ? (
              <Button type="primary" onClick={() => void onNew()}>
                {t("dash.create")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {boards.map((d) => (
            <SectionCard
              key={d.id}
              data-testid="dashboard-card"
              hoverable
              title={d.name}
              style={{ cursor: "pointer", borderRadius: 12 }}
              onClick={() => void navigate(`/dashboards/${d.id}/edit`)}
              extra={
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "open",
                        label: t("dash.open"),
                        onClick: () => void navigate(`/dashboards/${d.id}/edit`),
                      },
                      { type: "divider" as const },
                      {
                        key: "del",
                        danger: true,
                        label: t("dash.delete"),
                        onClick: () => void del.mutate(d.id),
                      },
                    ],
                  }}
                >
                  <Button
                    type="text"
                    icon={<MoreOutlined />}
                    aria-label={t("dash.cardMenu")}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, color: "var(--ant-color-text-secondary)" }}>
                  {t("dash.widgetCount", { count: d.widgets.length })}
                </span>
                <span style={{ fontSize: 13, color: "var(--ant-color-text-secondary)" }}>
                  {d.ownerName}
                </span>
                <span style={{ fontSize: 12, color: "var(--ant-color-text-tertiary)" }}>
                  {d.updatedAt}
                </span>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
