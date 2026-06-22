import { Button, Result, Skeleton, Space, Switch, Typography, message } from "antd";
import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useDashboard, useSaveDashboard } from "@/api/queries";
import { useAuth } from "@/auth/useAuth";
import { DashboardCanvas } from "@/dashboard/DashboardCanvas";
import { newWidget, type DashboardWidget, type GridLayoutItem } from "@/dashboard/widget";
import { AddWidgetDrawer } from "./AddWidgetDrawer";
import { WidgetFrame } from "./WidgetFrame";

export function DashboardBuilder() {
  const { t } = useTranslation();
  const { dashId = "" } = useParams<{ dashId: string }>();
  const { roles } = useAuth();
  const { data, isLoading, isError } = useDashboard(dashId);
  const save = useSaveDashboard();

  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [layout, setLayout] = useState<GridLayoutItem[]>([]);
  const [editing, setEditing] = useState(true);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (data) {
      setWidgets(data.widgets);
      setLayout(data.layout);
    }
  }, [data]);

  const canEdit =
    roles.includes("DashboardDesigner") ||
    roles.includes("ReportDesigner") ||
    roles.includes("TenantAdmin") ||
    roles.includes("SuperAdmin");

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError || !data) return <Result status="404" title={t("dash.notFound")} />;
  if (!canEdit) return <Result status="403" title={t("dash.forbidden")} />;

  const addWidget = (reportId: string, title: string) => {
    const { widget, layout: li } = newWidget(reportId, title, widgets.length);
    setWidgets((w) => [...w, widget]);
    setLayout((l) => [...l, li]);
  };

  const removeWidget = (i: string) => {
    setWidgets((w) => w.filter((x) => x.i !== i));
    setLayout((l) => l.filter((x) => x.i !== i));
  };

  const onSave = async () => {
    try {
      await save.mutateAsync({ ...data, widgets, layout });
      void message.success(t("dash.saved"));
    } catch {
      void message.error(t("dash.saveError"));
    }
  };

  return (
    <div className="dash-builder">
      <Space className="dash-toolbar" wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {data.name}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={() => setDrawer(true)}>
          {t("dash.addWidget")}
        </Button>
        <span>
          {t("dash.editMode")} <Switch checked={editing} onChange={setEditing} />
        </span>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={save.isPending}
          onClick={() => void onSave()}
        >
          {t("common.save")}
        </Button>
      </Space>

      {widgets.length === 0 ? (
        <div className="dash-empty" data-testid="dashboard-empty">
          <p>{t("dash.dropHere")}</p>
          <Button type="primary" onClick={() => setDrawer(true)}>
            {t("dash.addWidget")}
          </Button>
        </div>
      ) : (
        <DashboardCanvas layout={layout} editing={editing} onLayoutChange={setLayout}>
          {widgets.map((wd) => (
            <div key={wd.i} data-testid="dashboard-widget">
              <WidgetFrame widget={wd} editing={editing} onRemove={() => removeWidget(wd.i)} />
            </div>
          ))}
        </DashboardCanvas>
      )}

      <AddWidgetDrawer open={drawer} onClose={() => setDrawer(false)} onPick={addWidget} />
    </div>
  );
}
