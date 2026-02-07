import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  theme,
  Typography,
  Grid,
  Space, // Import Grid
} from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  CaretDownOutlined,
  WindowsOutlined,
} from "@ant-design/icons";

// Import Menu Data (Sesuaikan path import Anda)
import {
  CenterMenus,
  AdminMenus,
  TeacherMenus,
  StudentMenus,
  ParentMenus,
  TahfizMenus,
} from "./Menus";
import { useDoLogoutMutation } from "../../service/auth/ApiAuth";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid; // Destructure hook

const AppLayout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint(); // Hook untuk deteksi ukuran layar (xs, sm, md, lg, xl, xxl)

  const { publicConfig } = useSelector((state) => state.app);

  const [doLogout] = useDoLogoutMutation();

  // 1. Ambil Data User dari Redux
  const { user } = useSelector((state) => state.auth);

  // State UI
  const [collapsed, setCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState([]);

  // Ant Design Token
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 2. Tentukan Menu Berdasarkan Role & Level
  useEffect(() => {
    if (!user) return;

    let items = [];
    switch (user.role) {
      case "student":
        items = StudentMenus;
        break;
      case "teacher":
        items = TeacherMenus;
        break;
      case "parent":
        items = ParentMenus;
        break;
      case "center":
        items = CenterMenus;
        break;
      case "admin":
        if (user.level === "pusat") {
          items = CenterMenus;
        } else if (user.level === "tahfiz") {
          items = TahfizMenus;
        } else {
          items = AdminMenus;
        }
        break;
      default:
        items = [];
    }
    setMenuItems(items);
  }, [user]);

  useEffect(() => {
    if (title) {
      document.title = title;
      return;
    }
    if (publicConfig?.app_name) {
      document.title = publicConfig.app_name;
    }
  }, [title, publicConfig?.app_name]);

  // 3. Handle Logout
  const handleLogout = async () => {
    doLogout();
  };

  const handleMenuClick = ({ key }) => {
    if (key === "logout") handleLogout();
    else navigate(key);
  };

  const userDropdownItems = [
    {
      key: "profile",
      label: "Profile Saya",
      icon: <UserOutlined />,
      onClick: () => navigate("/profile"),
    },
    { type: "divider" },
    {
      key: "logout",
      label: "Keluar",
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* === SIDEBAR === */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={screens.xs ? 0 : 80} // Di HP (xs) sidebar hilang total saat collapse, di PC jadi icon (80px)
        width={240}
        onBreakpoint={(broken) => {
          setCollapsed(broken);
        }}
        style={{
          background: "#001529",
          boxShadow: "2px 0 6px rgba(0,21,41,0.35)",
          height: "100vh",
          position: "sticky", // Agar sidebar tetap diam saat scroll (opsional)
          top: 0,
          left: 0,
          zIndex: 101, // Pastikan sidebar di atas konten saat mode mobile (jika pakai fixed)
        }}
        zeroWidthTriggerStyle={{ top: "10px" }} // Menyesuaikan posisi trigger bawaan jika ada
      >
        {/* Logo Area */}
        <div
          style={{
            height: 64,
            margin: 16,
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: borderRadiusLG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            // Sembunyikan text logo jika collapsed
            fontSize: collapsed ? "0px" : "18px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            transition: "all 0.2s",
          }}
        >
          {collapsed ? (
            <Avatar src={publicConfig?.app_logo} />
          ) : (
            <Space>
              <Avatar src={publicConfig?.app_logo} />
              <Text style={{ color: "white" }}>{publicConfig?.app_name}</Text>
            </Space>
          )}
          {/* Ganti icon jika collapsed agar tidak blank */}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {/* === MAIN LAYOUT === */}
      <Layout>
        {/* Header */}
        <Header
          style={{
            padding: screens.xs ? "0 12px" : "0 24px", // Padding lebih kecil di HP
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,0.08)",
            position: "sticky",
            top: 0,
            zIndex: 100,
            height: 64,
          }}
        >
          {/* Kiri: Toggle & Title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflow: "hidden",
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: "16px",
                width: 48, // Perkecil area klik di HP
                height: 64,
              }}
            />

            {/* Title: Sembunyikan di layar sangat kecil jika perlu, atau perkecil font */}
            <Title
              level={4}
              style={{
                margin: 0,
                color: "#595959",
                fontSize: screens.xs ? "16px" : "20px", // Font responsif
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title || "Dashboard"}
            </Title>
          </div>

          {/* Kanan: User Profile */}
          <Dropdown menu={{ items: userDropdownItems }} trigger={["click"]}>
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px", // Padding trigger lebih kecil
                borderRadius: borderRadiusLG,
                transition: "background 0.3s",
                // Di HP, batasi lebar agar tidak menabrak title
                maxWidth: screens.xs ? "60px" : "auto",
                justifyContent: "flex-end",
              }}
              className="user-dropdown-trigger"
            >
              {/* Avatar Selalu Muncul */}
              <Avatar
                size={screens.xs ? "default" : "large"} // Avatar lebih kecil di HP
                src={user?.img_url}
                icon={<UserOutlined />}
                style={{ backgroundColor: "#1890ff", flexShrink: 0 }}
              />

              {/* Text Info: HANYA MUNCUL DI TABLET KE ATAS (!screens.xs) */}
              {!screens.xs && (
                <div style={{ textAlign: "right", lineHeight: "1.2" }}>
                  <Text strong style={{ display: "block" }}>
                    {user?.full_name || "User"}
                  </Text>
                  <Text type="secondary" style={{ fontSize: "11px" }}>
                    {user?.role?.toUpperCase()}
                    {user?.level ? ` - ${user.level.toUpperCase()}` : ""}
                  </Text>
                </div>
              )}

              {/* Icon Panah: Hanya muncul di Desktop */}
              {!screens.xs && (
                <Button type="text" size="small" icon={<CaretDownOutlined />} />
              )}
            </div>
          </Dropdown>
        </Header>

        {/* Content Area */}
        <Content
          style={{
            margin: screens.xs ? "16px 8px" : "24px 16px", // Margin content lebih rapat di HP
            padding: screens.xs ? 12 : 24, // Padding dalam lebih rapat di HP
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflowX: "hidden", // Mencegah scroll horizontal jika tabel lebar
          }}
        >
          {children}
        </Content>

        {/* Footer */}
        <Layout.Footer
          style={{ textAlign: "center", color: "#8c8c8c", fontSize: "12px" }}
        >
          LMS School System ©{new Date().getFullYear()}
        </Layout.Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
