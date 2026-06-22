import { Tabs } from "antd";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const TABS = ["providers", "routing", "prompts", "usage"] as const;

export default function AIAdminShell() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const active = TABS.find((k) => loc.pathname.includes(`/admin/ai/${k}`)) ?? "providers";

  return (
    <div>
      <Tabs
        activeKey={active}
        onChange={(k) => nav(`/admin/ai/${k}`)}
        items={TABS.map((k) => ({ key: k, label: t(`admin.ai.tab.${k}`) }))}
      />
      <Outlet />
    </div>
  );
}
