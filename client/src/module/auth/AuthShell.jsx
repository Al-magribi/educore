import { Flex, Grid, Typography } from "antd";
import { BookOpenCheck, ClipboardCheck, ShieldCheck } from "lucide-react";
import { useSelector } from "react-redux";

import { MuseThemeProvider } from "../../components/ui/muse";
import { brandPalette, museColors, museShadow, museRadius } from "../../config/theme";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const highlights = [
  { icon: <BookOpenCheck size={18} />, text: "Materi, tugas, dan ujian dalam satu tempat" },
  { icon: <ClipboardCheck size={18} />, text: "Nilai dan kehadiran tercatat otomatis" },
  { icon: <ShieldCheck size={18} />, text: "Akses sesuai peran: admin, guru, siswa, wali" },
];

/** Bingkai halaman auth: panel brand di kiri (desktop), kartu form di kanan. */
const AuthShell = ({ title, description, icon, children, footer }) => {
  const screens = useBreakpoint();
  const isDesktop = screens.lg;
  const { publicConfig } = useSelector((state) => state.app);
  const appName = publicConfig?.app_name || "EduCore";
  const appLogo = publicConfig?.app_logo;

  return (
    <MuseThemeProvider>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          background: museColors.bgLayout,
          padding: isDesktop ? 24 : 16,
          gap: 24,
        }}
      >
        {isDesktop ? (
          <aside
            style={{
              flex: "0 0 44%",
              maxWidth: 560,
              borderRadius: museRadius.card,
              background: `linear-gradient(160deg, ${brandPalette.indigo} 0%, ${brandPalette.navy} 100%)`,
              color: "#fff",
              padding: 48,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Flex align='center' gap={12}>
              {appLogo ? (
                <img src={appLogo} alt='' height={36} style={{ borderRadius: 6, background: "#fff", padding: 4 }} />
              ) : null}
              <Text style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{appName}</Text>
            </Flex>

            <div>
              <Title level={2} style={{ color: "#fff", margin: 0, fontWeight: 700, lineHeight: 1.25 }}>
                Satu platform untuk belajar, mengajar, dan mengelola sekolah.
              </Title>
              <Flex vertical gap={14} style={{ marginTop: 28 }}>
                {highlights.map((item) => (
                  <Flex key={item.text} align='center' gap={12}>
                    <span
                      aria-hidden
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: museRadius.item,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,0.14)",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>
                    <Text style={{ color: "#fff", fontSize: 15 }}>{item.text}</Text>
                  </Flex>
                ))}
              </Flex>
            </div>

            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
              © {new Date().getFullYear()} {appName}
            </Text>
          </aside>
        ) : null}

        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              borderRadius: museRadius.card,
              boxShadow: museShadow.card,
              padding: screens.sm ? 32 : 20,
            }}
          >
            {!isDesktop ? (
              <Flex align='center' gap={10} style={{ marginBottom: 24 }}>
                {appLogo ? <img src={appLogo} alt='' height={30} /> : null}
                <Text style={{ fontWeight: 600, fontSize: 16 }}>{appName}</Text>
              </Flex>
            ) : null}

            {icon ? (
              <span
                aria-hidden
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: museRadius.item,
                  display: "grid",
                  placeItems: "center",
                  background: museColors.primarySoft,
                  color: museColors.primary,
                  marginBottom: 16,
                }}
              >
                {icon}
              </span>
            ) : null}

            <Title level={3} style={{ margin: 0, fontWeight: 700, color: museColors.text }}>
              {title}
            </Title>
            {description ? (
              <Text type='secondary' style={{ display: "block", marginTop: 6, marginBottom: 24 }}>
                {description}
              </Text>
            ) : (
              <div style={{ height: 24 }} />
            )}

            {children}

            {footer ? (
              <div style={{ marginTop: 24, textAlign: "center" }}>{footer}</div>
            ) : null}
          </div>
        </main>
      </div>
    </MuseThemeProvider>
  );
};

export default AuthShell;
