import { Suspense, useMemo } from "react";
import { Card, ConfigProvider, Flex, Grid, Segmented, Skeleton, Typography } from "antd";
import { useSearchParams } from "react-router-dom";

import PageHeader from "../PageHeader";

import {
  museCardStyle,
  museColors,
  museOnColor,
  museRadius,
  museTheme,
} from "../../../config/theme";

const { Text } = Typography;

/** Pasang theme Muse untuk subtree (dipakai per module selama migrasi). */
export const MuseThemeProvider = ({ children }) => (
  <ConfigProvider theme={museTheme}>{children}</ConfigProvider>
);

const { useBreakpoint } = Grid;

/**
 * Halaman dengan beberapa sub-bagian: judul + navigasi Segmented di bawahnya.
 * Tab aktif disimpan di query `?tab=` agar bertahan saat refresh / dibagikan.
 * items: [{ key, label, icon, description?, render: () => node }]
 */
export const PageTabs = ({ title, description, items, extra, paramName = "tab" }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get(paramName);
  const active = items.find((item) => item.key === requested) || items[0];

  const options = useMemo(
    () =>
      items.map((item) => ({
        value: item.key,
        label: (
          <Flex align='center' gap={8} style={{ padding: isMobile ? "4px 2px" : "6px 8px" }}>
            {item.icon}
            <span style={{ fontWeight: 600 }}>{item.label}</span>
          </Flex>
        ),
      })),
    [items, isMobile],
  );

  const handleChange = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set(paramName, value);
    setSearchParams(next, { replace: true });
  };

  return (
    <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
      <PageHeader title={title} description={description} extra={extra} />
      <div style={{ overflowX: "auto", margin: "-4px", padding: 4 }}>
        <Segmented
          aria-label={`Bagian ${title}`}
          value={active?.key}
          onChange={handleChange}
          options={options}
          size={isMobile ? "middle" : "large"}
          style={{ background: "#fff", boxShadow: museCardStyle.boxShadow, padding: 4 }}
        />
      </div>
      {active?.description ? (
        <Text type='secondary' style={{ marginTop: -8 }}>
          {active.description}
        </Text>
      ) : null}
      <Suspense
        fallback={
          <MuseCard>
            <Skeleton active paragraph={{ rows: 6 }} />
          </MuseCard>
        }
      >
        <div key={active?.key} style={{ minWidth: 0 }}>
          {active?.render()}
        </div>
      </Suspense>
    </Flex>
  );
};

/** Card standar Muse: borderless, radius 12, shadow lembut. */
export const MuseCard = ({ style, flush = false, styles, ...props }) => (
  <Card
    variant='borderless'
    style={{ ...museCardStyle, overflow: "hidden", ...style }}
    styles={{
      ...styles,
      header: { borderBottom: 0, minHeight: 56, ...styles?.header },
      body: { ...(flush ? { padding: 0 } : null), ...styles?.body },
    }}
    {...props}
  />
);

/** Kotak ikon solid Muse (warna tone, ikon putih). */
export const IconBox = ({ icon, tone = "primary", size = 48 }) => (
  <div
    aria-hidden
    style={{
      width: size,
      height: size,
      borderRadius: size >= 40 ? museRadius.item : museRadius.base,
      background: museColors[tone] || tone,
      color: museOnColor[tone] || "#fff",
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
    }}
  >
    {icon}
  </div>
);

/** Kartu statistik Muse: label muted, angka besar, ikon di kanan. */
export const StatCard = ({
  title,
  value,
  suffix,
  note,
  icon,
  tone = "primary",
  compact = false,
}) => (
  <MuseCard style={{ height: "100%" }} styles={{ body: { padding: compact ? 12 : 16 } }}>
    <Flex justify='space-between' align='center' gap={12}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text
          style={{
            display: "block",
            color: museColors.muted,
            fontWeight: 600,
            fontSize: compact ? 12 : 14,
          }}
          ellipsis
        >
          {title}
        </Text>
        <div
          style={{
            color: museColors.text,
            fontWeight: 700,
            fontSize: compact ? 22 : 30,
            lineHeight: 1.25,
          }}
        >
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
          {suffix ? (
            <small style={{ fontSize: 14, fontWeight: 600, marginLeft: 6, color: museColors.muted }}>
              {suffix}
            </small>
          ) : null}
        </div>
        {note ? (
          <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
            {note}
          </Text>
        ) : null}
      </div>
      {icon ? <IconBox icon={icon} tone={tone} size={compact ? 36 : 48} /> : null}
    </Flex>
  </MuseCard>
);

/** Judul card: teks 16/600 + deskripsi muted opsional. */
export const CardTitle = ({ icon, title, description }) => (
  <Flex align='center' gap={10} style={{ minWidth: 0, padding: "4px 0" }}>
    {icon ? <IconBox icon={icon} size={32} /> : null}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: museColors.text, lineHeight: 1.4 }}>
        {title}
      </div>
      {description ? (
        <Text
          type='secondary'
          style={{ fontSize: 12, fontWeight: 400, display: "block", whiteSpace: "normal" }}
        >
          {description}
        </Text>
      ) : null}
    </div>
  </Flex>
);
