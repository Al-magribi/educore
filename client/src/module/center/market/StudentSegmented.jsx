import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Col,
  Divider,
  Empty,
  Grid,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  DownloadOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  SearchOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { InfiniteScrollList } from "../../../components";
import {
  useLazyDownloadStudentSegmentQuery,
  useLazyGetStudentSegmentQuery,
} from "../../../service/center/ApiAnalysis";
import useDebounced from "../../../utils/useDebounced";

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const StudentSegmented = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [age, setAge] = useState(null);
  const [gender, setGender] = useState(null);
  const [listData, setListData] = useState([]);
  const [totalData, setTotalData] = useState(0);

  const debouncedSearch = useDebounced(search, 500);
  const debouncedAge = useDebounced(age, 500);

  const [triggerStudentSegment, { isFetching }] =
    useLazyGetStudentSegmentQuery();
  const [triggerDownloadStudentSegment, { isFetching: isDownloading }] =
    useLazyDownloadStudentSegmentQuery();

  useEffect(() => {
    let isActive = true;

    const fetchStudentSegment = async () => {
      try {
        const result = await triggerStudentSegment({
          page,
          limit: 10,
          search: debouncedSearch,
          age: debouncedAge,
          gender,
        }).unwrap();

        if (!isActive) {
          return;
        }

        setTotalData(result?.meta?.totalData || 0);
        setListData((prev) => {
          if (page === 1) {
            return result?.data || [];
          }

          const existingIds = new Set(
            prev.map((item) => item.sibling_id || item.user_id),
          );
          const nextItems = (result?.data || []).filter(
            (item) => !existingIds.has(item.sibling_id || item.user_id),
          );
          return [...prev, ...nextItems];
        });
      } catch {
        if (isActive && page === 1) {
          setListData([]);
          setTotalData(0);
        }
      }
    };

    fetchStudentSegment();

    return () => {
      isActive = false;
    };
  }, [page, debouncedSearch, debouncedAge, gender, triggerStudentSegment]);

  const handleLoadMore = () => {
    if (!isFetching && totalData > listData.length) {
      setPage((prev) => prev + 1);
    }
  };

  const formatGender = (value) => {
    if (value === "L") return "Laki-laki";
    if (value === "P") return "Perempuan";
    return value || "-";
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleDownload = async () => {
    try {
      const result = await triggerDownloadStudentSegment({
        search: debouncedSearch,
        age: debouncedAge,
        gender,
      }).unwrap();

      const exportRows = (result?.data || []).map((item, index) => ({
        No: index + 1,
        "Nama Saudara": item.full_name || "-",
        Gender: formatGender(item.gender),
        "Tanggal Lahir": formatDate(item.birth_date),
        Umur: item.age ?? "-",
        "Siswa Terkait": item.linked_student_name || "-",
        "Nama Ayah": item.father_name || "-",
        "Nomor Ayah": item.father_phone || "-",
        "Nama Ibu": item.mother_name || "-",
        "Nomor Ibu": item.mother_phone || "-",
        Satuan: item.homebase_name || "-",
        Kota: item.city_name || "-",
      }));

      if (!exportRows.length) {
        message.warning("Tidak ada data yang bisa diunduh untuk filter saat ini.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Segmentasi Saudara");

      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Segmentasi_Saudara_${today}.xlsx`);
      message.success("File Excel berhasil diunduh.");
    } catch {
      message.error("Gagal menyiapkan file Excel.");
    }
  };

  const renderItem = (item) => (
    <MotionDiv
      key={item.sibling_id || item.user_id}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      style={{
        height: "100%",
        borderRadius: 22,
        border: "1px solid rgba(148, 163, 184, 0.14)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
        boxShadow: "0 18px 44px rgba(15, 23, 42, 0.06)",
        padding: isMobile ? 14 : 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          width: "100%",
          minWidth: 0,
        }}
      >
        <Avatar
          shape='square'
          size={isMobile ? 48 : 56}
          icon={<UserOutlined />}
          style={{
            background: item.gender === "L" ? "#2563eb" : "#db2777",
            flexShrink: 0,
            borderRadius: isMobile ? 16 : 18,
          }}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <Text
            strong
            style={{
              fontSize: isMobile ? 15 : 16,
              display: "block",
              color: "#0f172a",
              lineHeight: 1.35,
              width: "100%",
              minWidth: 0,
            }}
            ellipsis={{ tooltip: item.full_name }}
          >
            {item.full_name}
          </Text>

          <Space wrap size={[8, 8]} style={{ width: "100%" }}>
            <Tag
              color='blue'
              style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}
            >
              {item.age ? `${item.age} Tahun` : "Usia -"}
            </Tag>
            <Tag
              color={item.gender === "L" ? "geekblue" : "magenta"}
              style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}
            >
              {item.gender === "L" ? "Laki-laki" : "Perempuan"}
            </Tag>
          </Space>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 16,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          padding: isMobile ? 10 : 12,
        }}
      >
        <Space
          align='center'
          size={8}
          style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}
        >
          <UsergroupAddOutlined />
          <span>Saudara dari siswa</span>
        </Space>

        <Text
          strong
          style={{
            color: "#2563eb",
            fontSize: 13,
            display: "block",
            width: "100%",
            minWidth: 0,
            lineHeight: 1.45,
          }}
          ellipsis={{ tooltip: item.linked_student_name || "(Nama Siswa Tidak Muncul)" }}
        >
          {item.linked_student_name || "(Nama Siswa Tidak Muncul)"}
        </Text>

        <Divider style={{ margin: "10px 0" }} />

        <Space orientation='vertical' size={4} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              minWidth: 0,
            }}
          >
            <HomeOutlined style={{ color: "#94a3b8", flexShrink: 0 }} />
            <Text
              type='secondary'
              ellipsis={{ tooltip: item.homebase_name || "Satuan N/A" }}
              style={{ fontSize: 12, minWidth: 0, flex: 1 }}
            >
              {item.homebase_name || "Satuan N/A"}
            </Text>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              minWidth: 0,
            }}
          >
            <EnvironmentOutlined
              style={{ color: "#94a3b8", flexShrink: 0 }}
            />
            <Text
              type='secondary'
              ellipsis={{ tooltip: item.city_name || "Kota N/A" }}
              style={{ fontSize: 12, minWidth: 0, flex: 1 }}
            >
              {item.city_name || "Kota N/A"}
            </Text>
          </div>
        </Space>
      </div>
    </MotionDiv>
  );

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        borderRadius: 24,
        border: "1px solid rgba(148, 163, 184, 0.14)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
        padding: isMobile ? 16 : 20,
      }}
    >
      <Space orientation='vertical' size={18} style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: 12,
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <div>
            <Tag
              color='purple'
              style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
            >
              Market Segment
            </Tag>
            <Title
              level={4}
              style={{ margin: "10px 0 0", color: "#0f172a", fontSize: isMobile ? 20 : undefined }}
            >
              Segmentasi Market Potensi Saudara
            </Title>
            <Text style={{ color: "#64748b", display: "block", marginTop: 6 }}>
              Temukan potensi saudara siswa berdasarkan nama, usia, gender, dan
              keterhubungan keluarga.
            </Text>
          </div>

          <Button
            type='primary'
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            loading={isDownloading}
            style={{
              borderRadius: 999,
              width: isMobile ? "100%" : "auto",
              minWidth: isMobile ? "100%" : 180,
            }}
          >
            Download Excel
          </Button>
        </div>

        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Input
              placeholder='Cari nama saudara atau siswa...'
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              allowClear
              style={{ borderRadius: 999, height: 42, width: "100%" }}
            />
          </Col>
          <Col xs={12} md={6}>
            <InputNumber
              placeholder='Umur Saudara'
              style={{ width: "100%", borderRadius: 999 }}
              min={0}
              max={25}
              onChange={(val) => {
                setPage(1);
                setAge(val);
              }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              placeholder='Gender Saudara'
              style={{ width: "100%" }}
              allowClear
              onChange={(val) => {
                setPage(1);
                setGender(val);
              }}
            >
              <Option value='L'>Laki-laki</Option>
              <Option value='P'>Perempuan</Option>
            </Select>
          </Col>
        </Row>

        {totalData === 0 && !isFetching ? (
          <div
            style={{
              minHeight: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
            }}
          >
            <Empty description='Tidak ada data saudara yang sesuai filter' />
          </div>
        ) : (
          <InfiniteScrollList
            data={listData}
            loading={isFetching}
            hasMore={totalData > listData.length}
            onLoadMore={handleLoadMore}
            renderItem={renderItem}
            height={isMobile ? "70vh" : "520px"}
            emptyText='Tidak ada data saudara yang sesuai filter'
            grid={{
              gutter: [14, 14],
              xs: 24,
              sm: 12,
              md: 12,
              lg: 8,
              xl: 6,
            }}
          />
        )}
      </Space>
    </MotionDiv>
  );
};

export default StudentSegmented;
