import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  theme,
  Typography,
  Grid,
  Space,
} from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";

import { getCombinedMenus } from "./menus/index.js";
import { useDoLogoutMutation } from "../../service/auth/ApiAuth";
import LoadApp from "../loader/LoadApp";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const LayoutShellContext = createContext(null);

const routePreloaders = {
  "/profile": () => import("../profile/Profile"),
  "/center-dashboard": () => import("../../module/center/dashboard/CenterDash"),
  "/center-homebase": () => import("../../module/center/homebase/CenterHome"),
  "/center-admin": () => import("../../module/center/admin/CenterAdmin"),
  "/center-teacher": () => import("../../module/center/teacher/CenterTeacher"),
  "/center-market": () => import("../../module/center/market/CenterMarket"),
  "/center-config": () => import("../../module/center/config/CenterConfig"),
  "/admin-dashboard": () => import("../../module/admin/dashboard/AdminDash"),
  "/admin-data-pokok": () => import("../../module/admin/main/AdminMain"),
  "/admin-data-akademik": () =>
    import("../../module/admin/academic/AdminAcademinc"),
  "/admin-database": () =>
    import("../../module/database/manager/DatabaseManager"),
  "/finance-dashboard": () =>
    import("../../module/finance/dashboard/FinanceDash"),
  "/computer-based-test/bank": () =>
    import("../../module/cbt/bank/view/BankList"),
  "/computer-based-test/jadwal-ujian": () =>
    import("../../module/cbt/exam/view/ExamList"),
  "/siswa-dashboard": () =>
    import("../../module/student/dashboard/StudentDash"),
  "/siswa/jadwal-ujian": () =>
    import("../../module/cbt/student/view/StudentExamList"),
  "/siswa-database": () =>
    import("../../module/database/view/StudentDatabase"),
  "/orangtua-database-siswa": () =>
    import("../../module/database/view/ParentStudentDatabase"),
  "/computer-based-test/start": () =>
    import("../../module/cbt/student/view/ExamInterface"),
  "/guru-dashboard": () =>
    import("../../module/teacher/dashboard/TeacherDash"),
  "/guru-database-kelas": () =>
    import("../../module/database/manager/ClassDbManager"),
};

const isFinanceLevel = (level) => level === "finance" || level === "keuangan";

const AppLayout = ({ children, title, asShell = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const shellContext = useContext(LayoutShellContext);

  const { publicConfig } = useSelector((state) => state.app);

  const [doLogout] = useDoLogoutMutation();

  const { user } = useSelector((state) => state.auth);

  const [collapsed, setCollapsed] = useState(false);
  const [shellTitle, setShellTitle] = useState(null);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const isMobile = !screens.lg;
  const preloadedRoutes = useRef(new Set());
  const effectiveTitle = asShell ? shellTitle : title;

  const isCbtRoute = (path) =>
    path?.startsWith("/computer-based-test") ||
    path?.startsWith("/siswa/jadwal-ujian");

  const preloadRouteByKey = useCallback((key) => {
    const preloader = routePreloaders[key];
    if (!preloader || preloadedRoutes.current.has(key)) return;
    preloadedRoutes.current.add(key);
    preloader().catch(() => {
      preloadedRoutes.current.delete(key);
    });
  }, []);

  const filterMenuItemsByUser = (items, currentUser) => {
    return items
      .map((item) => {
        if (item.requiresHomeroom && !currentUser?.is_homeroom) {
          return null;
        }

        if (
          currentUser?.role === "teacher" &&
          item.key === "/manajemen-piket" &&
          !currentUser?.has_duty_today
        ) {
          return null;
        }

        if (Array.isArray(item.children)) {
          const nextChildren = filterMenuItemsByUser(item.children, currentUser);
          if (nextChildren.length === 0) {
            return null;
          }
          return {
            ...item,
            children: nextChildren,
          };
        }

        return item;
      })
      .filter(Boolean);
  };

  const enhanceMenuItems = (items) =>
    items.map((item) => {
      const nextItem = { ...item };
      const key = item.key;

      if (typeof item.label === "string") {
        nextItem.label = (
          <span
            onMouseEnter={() => preloadRouteByKey(key)}
            onFocus={() => preloadRouteByKey(key)}
          >
            {item.label}
          </span>
        );
      }

      if (Array.isArray(item.children)) {
        nextItem.children = enhanceMenuItems(item.children);
      }

      return nextItem;
    });
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = (() => {
    const combinedMenus = getCombinedMenus(user);
    let items = [];
    switch (user?.role) {
      case "student":
        items = combinedMenus.student;
        break;
      case "teacher":
        items = combinedMenus.teacher;
        break;
      case "parent":
        items = combinedMenus.parent;
        break;
      case "center":
        items = combinedMenus.center;
        break;
      case "admin":
        if (user.level === "pusat") {
          items = combinedMenus.center;
        } else if (user.level === "tahfiz") {
          items = combinedMenus.tahfiz;
        } else if (isFinanceLevel(user.level)) {
          items = combinedMenus.finance;
        } else {
          items = combinedMenus.admin;
        }
        break;
      default:
        items = [];
    }
    return enhanceMenuItems(filterMenuItemsByUser(items, user));
  })();

  useEffect(() => {
    if (effectiveTitle) {
      document.title = effectiveTitle;
      return;
    }
    if (publicConfig?.app_name) {
      document.title = publicConfig.app_name;
    }
  }, [effectiveTitle, publicConfig?.app_name]);

  useEffect(() => {
    if (asShell || !shellContext?.inShell) return;
    shellContext.setShellTitle(title || null);
    return () => shellContext.setShellTitle(null);
  }, [asShell, shellContext, title]);

  useEffect(() => {
    if (!isRouteTransitioning) return;

    const timer = window.setTimeout(() => {
      setIsRouteTransitioning(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isRouteTransitioning, location.pathname]);

  // 3. Handle Logout
  const handleLogout = async () => {
    doLogout();
  };

  const handleMenuClick = ({ key }) => {
    preloadRouteByKey(key);
    if (key === "logout") handleLogout();
    else {
      if (key !== location.pathname && isCbtRoute(key)) {
        setIsRouteTransitioning(true);
      }
      navigate(key);
    }

    // Auto close drawer after selecting menu on mobile
    if (isMobile) {
      setCollapsed(true);
    }
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

  const shellValue = useMemo(
    () => ({ inShell: true, setShellTitle }),
    [setShellTitle],
  );

  if (!asShell && shellContext?.inShell) {
    return children || null;
  }

  const layoutContent = (
    <Layout style={{ minHeight: "100vh" }}>
      {/* === SIDEBAR === */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint='lg'
        collapsedWidth={isMobile ? 0 : 80} // Mobile/tablet jadi drawer (0), desktop jadi icon (80px)
        width={240}
        onBreakpoint={(broken) => {
          setCollapsed(broken);
        }}
        style={{
          background: "#001529",
          boxShadow: "2px 0 6px rgba(0,21,41,0.35)",
          height: "100vh",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: isMobile ? 1002 : 101,
        }}
        zeroWidthTriggerStyle={{ top: "10px" }} // Menyesuaikan posisi trigger bawaan jika ada
      >
        {/* Logo Area */}
        <div
          style={{
            height: 72,
            margin: 12,
            padding: collapsed ? "0" : "0 14px",
            background: "rgba(255, 255, 255, 0.18)",
            borderRadius: borderRadiusLG,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "white",
            fontWeight: "bold",
            overflow: "hidden",
            whiteSpace: "nowrap",
            transition: "all 0.2s",
          }}
        >
          {collapsed ? (
            <Avatar size={38} src={publicConfig?.app_logo} />
          ) : (
            <Space size={10}>
              <Avatar size={38} src={publicConfig?.app_logo} />
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                }}
                ellipsis
              >
                {publicConfig?.app_name}
              </Text>
            </Space>
          )}
          {/* Ganti icon jika collapsed agar tidak blank */}
        </div>

        <Menu
          theme='dark'
          mode='inline'
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            zIndex: 1001,
          }}
        />
      )}

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
              type='text'
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
              {effectiveTitle || "Dashboard"}
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
              className='user-dropdown-trigger'
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
                  <Text type='secondary' style={{ fontSize: "11px" }}>
                    {user?.role?.toUpperCase()}
                    {user?.level ? ` - ${user.level.toUpperCase()}` : ""}
                  </Text>
                </div>
              )}

              {/* Icon Panah: Hanya muncul di Desktop */}
              {!screens.xs && (
                <Button type='text' size='small' icon={<CaretDownOutlined />} />
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
            backgroundColor: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflowX: "hidden", // Mencegah scroll horizontal jika tabel lebar
            background:
              "radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
          }}
        >
          {asShell ? (
            isRouteTransitioning ? (
              <LoadApp />
            ) : (
              <Outlet />
            )
          ) : (
            children
          )}
        </Content>

        {/* Footer */}
        <Layout.Footer
          style={{ textAlign: "center", color: "#8c8c8c", fontSize: "12px" }}
        >
          Almadev ©{new Date().getFullYear()}
        </Layout.Footer>
      </Layout>
    </Layout>
  );

  if (asShell) {
    return (
      <LayoutShellContext.Provider value={shellValue}>
        {layoutContent}
      </LayoutShellContext.Provider>
    );
  }

  return layoutContent;
};

export default AppLayout;
