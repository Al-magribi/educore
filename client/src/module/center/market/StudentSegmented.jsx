import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Col,
  Divider,
  Empty,
  Flex,
  Grid,
  Input,
  InputNumber,
  Row,
  Select,
  Typography,
  message,
} from "antd";
import { Download, MapPin, School, Search, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { InfiniteScrollList } from "../../../components";
import {
  useLazyDownloadStudentSegmentQuery,
  useLazyGetStudentSegmentQuery,
} from "../../../service/center/ApiAnalysis";
import useDebounced from "../../../utils/useDebounced";
import { CardTitle, MuseCard } from "../../../components/ui/muse";
import { museColors, museRadius } from "../../../config/theme";

const { Text } = Typography;
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

  const renderItem = (item) => {
    const isMale = item.gender === "L";
    const linkedName = item.linked_student_name || "(Nama siswa tidak tersedia)";

    return (
      <MotionDiv
        key={item.sibling_id || item.user_id}
        whileHover={isMobile ? undefined : { y: -3 }}
        transition={{ duration: 0.2 }}
        style={{ height: "100%", minWidth: 0 }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: museRadius.card,
            border: `1px solid ${museColors.divider}`,
            background: "#fff",
            padding: 16,
          }}
        >
          <Flex align="center" gap={12} style={{ minWidth: 0 }}>
            <Avatar
              shape="square"
              size={48}
              icon={<UserRound size={24} />}
              style={{
                background: isMale ? museColors.primary : museColors.female,
                borderRadius: museRadius.item,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong ellipsis={{ tooltip: item.full_name }} style={{ display: "block", fontSize: 15 }}>
                {item.full_name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                {item.age ? `${item.age} tahun` : "Usia -"} · {isMale ? "Laki-laki" : "Perempuan"}
              </Text>
            </div>
          </Flex>

          <Divider style={{ margin: "12px 0" }} />

          <Text type="secondary" style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
            Saudara dari siswa
          </Text>
          <Text
            strong
            style={{ display: "block", color: museColors.primary, marginBottom: 8 }}
            ellipsis={{ tooltip: linkedName }}
          >
            {linkedName}
          </Text>

          <Flex vertical gap={4}>
            <Flex align="center" gap={6} style={{ minWidth: 0 }}>
              <School size={14} color={museColors.muted} style={{ flexShrink: 0 }} />
              <Text type="secondary" ellipsis={{ tooltip: item.homebase_name || "Satuan -" }} style={{ fontSize: 12 }}>
                {item.homebase_name || "Satuan -"}
              </Text>
            </Flex>
            <Flex align="center" gap={6} style={{ minWidth: 0 }}>
              <MapPin size={14} color={museColors.muted} style={{ flexShrink: 0 }} />
              <Text type="secondary" ellipsis={{ tooltip: item.city_name || "Kota -" }} style={{ fontSize: 12 }}>
                {item.city_name || "Kota -"}
              </Text>
            </Flex>
          </Flex>
        </div>
      </MotionDiv>
    );
  };

  return (
    <MuseCard
      title={
        <CardTitle
          title={isMobile ? "Segmentasi Saudara" : "Segmentasi Potensi Saudara"}
          description={
            isMobile
              ? undefined
              : "Temukan potensi saudara siswa berdasarkan nama, usia, gender, dan keterhubungan keluarga."
          }
        />
      }
      extra={
        <Button
          type="primary"
          icon={<Download size={16} />}
          onClick={handleDownload}
          loading={isDownloading}
        >
          {isMobile ? "Excel" : "Unduh Excel"}
        </Button>
      }
    >
      <Flex vertical gap={16} style={{ minWidth: 0 }}>
        <Row gutter={[8, 8]}>
          <Col xs={24} md={12}>
            <Input
              aria-label="Cari nama"
              placeholder={isMobile ? "Cari nama..." : "Cari nama saudara atau siswa..."}
              prefix={<Search size={16} color={museColors.muted} />}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <InputNumber
              aria-label="Umur"
              placeholder="Umur"
              style={{ width: "100%" }}
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
              aria-label="Gender"
              placeholder="Gender"
              style={{ width: "100%" }}
              allowClear
              onChange={(val) => {
                setPage(1);
                setGender(val);
              }}
              options={[
                { value: "L", label: "Laki-laki" },
                { value: "P", label: "Perempuan" },
              ]}
            />
          </Col>
        </Row>

        {totalData === 0 && !isFetching ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Tidak ada data saudara yang sesuai filter. Coba ubah kata kunci atau filter."
            style={{ padding: "48px 0" }}
          />
        ) : (
          <div style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
            <InfiniteScrollList
              data={listData}
              loading={isFetching}
              hasMore={totalData > listData.length}
              onLoadMore={handleLoadMore}
              renderItem={renderItem}
              height={isMobile ? "65vh" : "520px"}
              emptyText="Tidak ada data saudara yang sesuai filter"
              grid={{
                gutter: [16, 16],
                xs: 24,
                sm: 12,
                md: 12,
                lg: 8,
                xl: 6,
              }}
            />
          </div>
        )}
      </Flex>
    </MuseCard>
  );
};

export default StudentSegmented;
