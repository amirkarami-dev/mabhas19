import { Button, Card, Dropdown, Empty, Input, Skeleton, Space } from "antd";
import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCreateDashboard, useDashboards, useDeleteDashboard } from "@/api/queries";
import { useAuth } from "@/auth/useAuth";

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

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  return (
    <div className="dash-list">
      <Space className="dash-list__toolbar" wrap>
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

      {boards.length === 0 ? (
        <Empty description={t("dash.emptyList")}>
          {canCreate && (
            <Button type="primary" onClick={() => void onNew()}>
              {t("dash.create")}
            </Button>
          )}
        </Empty>
      ) : (
        <div className="dash-list__grid">
          {boards.map((d) => (
            <Card
              key={d.id}
              data-testid="dashboard-card"
              hoverable
              title={d.name}
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
              <div className="dash-card__meta">
                <span>{t("dash.widgetCount", { count: d.widgets.length })}</span>
                <span>{d.ownerName}</span>
                <span>{d.updatedAt}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
