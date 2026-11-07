import { useEffect, useState } from "react";
import { Flex, Select, message } from "antd";
import { useGetTuStudentsQuery } from "../../../service/lms/ApiTu";
import PageHeader from "../../../components/ui/PageHeader";

export const TuPage = ({ title, description, extra, children }) => {
  return (
    <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
      <PageHeader title={title} description={description} extra={extra} />
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
