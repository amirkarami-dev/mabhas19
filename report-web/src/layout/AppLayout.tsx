import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useUiStore } from "../store/ui-store";

const { Sider, Content } = Layout;

export function AppLayout() {
  const { sidebarCollapsed } = useUiStore();
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        trigger={null}
        theme="light"
        style={{ background: "var(--rw-surface-1)" }}
        width={240}
      >
        <Sidebar />
      </Sider>
      <Layout>
        <Topbar />
        <Content
          style={{
            margin: 16,
            padding: 16,
            background: "var(--rw-surface-1)",
            borderRadius: 12,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
