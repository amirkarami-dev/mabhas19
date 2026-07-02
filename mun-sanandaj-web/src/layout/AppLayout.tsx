import { Layout, Menu, Typography } from "antd";
import { DashboardOutlined, FileSearchOutlined, LogoutOutlined } from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const { Header, Content } = Layout;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { key: "/", icon: <DashboardOutlined />, label: "داشبورد" },
    { key: "/logs", icon: <FileSearchOutlined />, label: "تاریخچه" },
    { key: "logout", icon: <LogoutOutlined />, label: "خروج" },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Typography.Text strong style={{ color: "#fff", whiteSpace: "nowrap" }}>
          پایش مبحث ۱۹ سنندج
        </Typography.Text>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={items}
          style={{ flex: 1 }}
          onClick={({ key }) => (key === "logout" ? logout() : navigate(key))}
        />
        {user && <Typography.Text style={{ color: "#fff" }}>{user.name}</Typography.Text>}
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
