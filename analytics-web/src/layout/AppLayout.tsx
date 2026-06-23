import { Layout, theme } from "antd";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useUiStore } from "../store/ui-store";

const { Sider, Content } = Layout;
const { useToken } = theme;

export function AppLayout() {
  const { sidebarCollapsed, dir, themeMode } = useUiStore();
  const { token } = useToken();

  // In RTL layouts (fa), the sider should appear on the right.
  // antd Layout renders Sider before the inner Layout for LTR (left),
  // so for RTL we reverse the order using CSS flex direction.
  const isRtl = dir === "rtl";

  const sider = (
    <Sider
      collapsible
      collapsed={sidebarCollapsed}
      trigger={null}
      theme={themeMode === "dark" ? "dark" : "light"}
      style={{
        background: token.colorBgContainer,
        borderInlineStart: isRtl ? `1px solid ${token.colorBorderSecondary}` : undefined,
        borderInlineEnd: !isRtl ? `1px solid ${token.colorBorderSecondary}` : undefined,
      }}
      width={240}
    >
      <Sidebar />
    </Sider>
  );

  const main = (
    <Layout>
      <Topbar />
      <Content
        style={{
          margin: 16,
          padding: 16,
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          minHeight: 280,
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: token.colorBgLayout,
        flexDirection: isRtl ? "row-reverse" : "row",
      }}
    >
      {isRtl ? (
        <>
          {main}
          {sider}
        </>
      ) : (
        <>
          {sider}
          {main}
        </>
      )}
    </Layout>
  );
}
