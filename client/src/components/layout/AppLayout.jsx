import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Avatar,
  Breadcrumb,
  Button,
  ConfigProvider,
  Dropdown,
  Flex,
  Grid,
  Layout,
  Menu,
  Typography,
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
import {
  museColors,
  museLayout,
  museShadow,
  museShellTheme,
} from "../../config/theme";
import "./sidebar.css";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;
const LayoutShellContext = createContext(null);
const ROUTE_PRELOADERS = {
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
  "/finance-dashboard": () =>
    import("../../module/finance/dashboard/FinanceDash"),
  "/computer-based-test/bank": () =>
    import("../../module/cbt/bank/view/BankList"),
  "/computer-based-test/jadwal-ujian": () =>
    import("../../module/cbt/exam/view/ExamList"),
  "/guru/ai-config": () => import("../../module/teacher/ai/AiConfig"),
  "/siswa-dashboard": () =>
    import("../../module/student/dashboard/StudentDash"),
  "/siswa/jadwal-ujian": () =>
    import("../../module/cbt/student/view/StudentExamList"),
  "/computer-based-test/start": () =>
    import("../../module/cbt/student/view/ExamInterface"),
  "/guru-dashboard": () => import("../../module/teacher/dashboard/TeacherDash"),
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

  // Default Muse: sidebar terbuka di desktop (>=992px); drawer tertutup di mobile.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 992,
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const [shellTitle, setShellTitle] = useState(null);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const isMobile = !screens.lg;
  const effectiveTitle = asShell ? shellTitle : title;

  const isCbtRoute = (path) =>
    path?.startsWith("/computer-based-test") ||
    path?.startsWith("/siswa/jadwal-ujian");

  const preloadRouteByKey = useCallback((key) => {
    const preloader = ROUTE_PRELOADERS[key];
    if (!preloader) return;
    preloader().catch(() => {});
  }, []);

  const filterMenuItemsByUser = (items, currentUser) =>
    items
      .map((item) => {
        if (item.requiresHomeroom && !currentUser?.is_homeroom) {
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

      if (item.icon) {
        nextItem.icon = <span className='muse-menu-icon'>{item.icon}</span>;
      }

      if (Array.isArray(item.children)) {
        nextItem.children = enhanceMenuItems(item.children);
      }

      return nextItem;
    });

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
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const roleLabel = [user?.role, user?.level]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase())
    .join(" · ");

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
    <Layout style={{ minHeight: "100vh", background: museColors.bgLayout }}>
      {/* === SIDEBAR (Muse: transparan di desktop, drawer di mobile) === */}
      <ConfigProvider theme={museShellTheme}>
        <Sider
          className='muse-sider'
          trigger={null}
          collapsible
          collapsed={collapsed}
          breakpoint='lg'
          collapsedWidth={isMobile ? 0 : museLayout.siderCollapsedWidth}
          width={museLayout.siderWidth}
          onBreakpoint={(broken) => setCollapsed(broken)}
          theme='light'
          style={{
            background: museColors.bgLayout,
            boxShadow: isMobile && !collapsed ? museShadow.card : "none",
            height: "100vh",
            position: isMobile ? "fixed" : "sticky",
            top: 0,
            left: 0,
            zIndex: isMobile ? 1002 : 101,
            padding: collapsed ? "24px 0" : "24px 16px",
            transition: "all 0.2s",
          }}
        >
          {/* Brand */}
          <Flex
            align='center'
            justify={collapsed ? "center" : "flex-start"}
            gap={10}
            style={{ padding: collapsed ? 0 : "0 10px", minHeight: 40 }}
          >
            <Avatar
              size={36}
              shape='square'
              src={publicConfig?.app_logo}
              style={{ background: museColors.primary, borderRadius: 8, flexShrink: 0 }}
            >
              {publicConfig?.app_name?.[0]}
            </Avatar>
            {!collapsed ? (
              <Text
                strong
                ellipsis
                style={{ color: museColors.navy, fontSize: 16, fontWeight: 700 }}
              >
                {publicConfig?.app_name}
              </Text>
            ) : null}
          </Flex>

          <div
            style={{
              height: 1,
              margin: "18px 0",
              background: `linear-gradient(90deg, transparent, ${museColors.border}, transparent)`,
            }}
          />

          <Menu
            mode='inline'
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderInlineEnd: 0, background: "transparent", flex: 1 }}
          />

          {!collapsed ? (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${museColors.primary}, ${museColors.navy})`,
                color: "#fff",
              }}
            >
              <Flex align='center' gap={10}>
                <Avatar
                  size={32}
                  src={user?.img_url}
                  icon={<UserOutlined />}
                  style={{ background: museColors.accent, flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <Text strong ellipsis style={{ color: "#fff", display: "block" }}>
                    {user?.full_name || "User"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                    {roleLabel}
                  </Text>
                </div>
              </Flex>
              <Button
                block
                size='small'
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{
                  marginTop: 12,
                  background: "#fff",
                  color: museColors.navy,
                  border: 0,
                  fontWeight: 600,
                }}
              >
                Keluar
              </Button>
            </div>
          ) : null}
        </Sider>
      </ConfigProvider>

      {isMobile && !collapsed && (
        <div
          role='presentation'
          onClick={() => setCollapsed(true)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(22, 17, 94, 0.35)",
            zIndex: 1001,
          }}
        />
      )}

      {/* === MAIN LAYOUT === */}
      <Layout style={{ background: "transparent", minWidth: 0 }}>
        <ConfigProvider theme={museShellTheme}>
          <Header
            className={`muse-header${isScrolled ? " is-scrolled" : ""}`}
            style={{
              height: "auto",
              lineHeight: "normal",
              padding: screens.xs ? "10px 12px" : "12px 20px",
              margin: screens.xs ? "8px" : "10px 16px",
              borderRadius: 12,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              position: "sticky",
              top: screens.xs ? 8 : 10,
              zIndex: 100,
            }}
          >
            {/* Kiri: toggle + breadcrumb + judul */}
            <Flex align='center' gap={8} style={{ minWidth: 0 }}>
              <Button
                type='text'
                aria-label={collapsed ? "Buka menu" : "Tutup menu"}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                {!screens.xs ? (
                  <Breadcrumb
                    items={[
                      { title: "Halaman" },
                      { title: effectiveTitle || "Dashboard" },
                    ]}
                    style={{ fontSize: 12 }}
                  />
                ) : null}
                <Text
                  strong
                  ellipsis
                  style={{
                    display: "block",
                    color: museColors.navy,
                    fontSize: screens.xs ? 15 : 16,
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  {effectiveTitle || "Dashboard"}
                </Text>
              </div>
            </Flex>

            {/* Kanan: user */}
            <Dropdown menu={{ items: userDropdownItems }} trigger={["click"]}>
              <button
                type='button'
                className='user-dropdown-trigger'
                aria-label='Menu akun'
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: 0,
                  background: "transparent",
                  font: "inherit",
                  flexShrink: 0,
                }}
              >
                <Avatar
                  size={screens.xs ? "default" : "large"}
                  src={user?.img_url}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: museColors.primary, flexShrink: 0 }}
                />
                {!screens.xs && (
                  <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                    <Text strong style={{ display: "block", color: museColors.navy }}>
                      {user?.full_name || "User"}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      {roleLabel}
                    </Text>
                  </div>
                )}
                {!screens.xs && <CaretDownOutlined style={{ color: museColors.muted }} />}
              </button>
            </Dropdown>
          </Header>
        </ConfigProvider>

        {/* Content */}
        <Content
          style={{
            margin: screens.xs ? "8px 8px 0" : "12px 16px 0",
            padding: screens.xs ? "4px 4px 16px" : "8px 4px 24px",
            minHeight: 280,
            overflowX: "hidden",
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

        <Layout.Footer
          style={{
            textAlign: "center",
            color: museColors.muted,
            fontSize: "12px",
            background: "transparent",
          }}
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
