import { useEffect, useState } from "react";
import { Button, Card, Flex, Grid, Select, Typography, message } from "antd";
import { useGetTuStudentsQuery } from "../../../service/lms/ApiTu";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export const TuPage = ({ title, description, extra, children }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
      <Card
        variant="borderless"
        style={{
          borderRadius: isMobile ? 18 : 24,
          border: "1px solid #dbe7f5",
          background:
            "linear-gradient(135deg, #f8fbff 0%, #ffffff 55%, #eef6ff 100%)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 22 } }}
      >
        <Flex
          justify="space-between"
          align={isMobile ? "stretch" : "flex-start"}
          vertical={isMobile}
          gap={12}
        >
          <Flex vertical gap={4} style={{ minWidth: 0 }}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              {title}
            </Title>
            <Text type="secondary">{description}</Text>
          </Flex>
          {extra}
        </Flex>
      </Card>
      {children}
    </Flex>
  );
};

export const downloadTuFile = async (url, fallbackName) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    let text = "Berkas gagal diunduh.";
    try {
      const body = await response.json();
      text = body.message || text;
    } catch {
      text = "Berkas gagal diunduh.";
    }
    throw new Error(text);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const matched = disposition.match(/filename="([^"]+)"/);
  const link = document.createElement("a");
  const href = URL.createObjectURL(blob);
  link.href = href;
  link.download = matched?.[1] || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
};

export const useTuDownload = () => {
  const [loading, setLoading] = useState(false);
  const download = async (url, fallbackName) => {
    setLoading(true);
    try {
      await downloadTuFile(url, fallbackName);
    } catch (error) {
      message.error(error.message || "Berkas gagal diunduh.");
    } finally {
      setLoading(false);
    }
  };
  return { download, downloading: loading };
};

export const StudentPicker = ({ value, onChange, fallbackLabel }) => {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const { data, isFetching } = useGetTuStudentsQuery({ search: keyword });

  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <Select
      showSearch
      allowClear
      filterOption={false}
      placeholder="Cari nama atau NIS"
      value={value}
      loading={isFetching}
      onSearch={setSearch}
      onChange={onChange}
      options={(() => {
        const options = (data?.data || []).map((item) => ({
          value: item.id,
          label: [item.full_name, item.nis, item.class_name]
            .filter(Boolean)
            .join(" — "),
        }));
        if (
          value &&
          fallbackLabel &&
          !options.some((item) => item.value === value)
        ) {
          options.unshift({ value, label: fallbackLabel });
        }
        return options;
      })()}
      style={{ width: "100%" }}
    />
  );
};

export const notifyError = (error, fallback) => {
  message.error(error?.data?.message || fallback);
};
