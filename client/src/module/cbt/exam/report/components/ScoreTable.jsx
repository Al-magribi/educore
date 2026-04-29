import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { Download, Eye, Medal, Search, Users } from "lucide-react";
import * as XLSX from "xlsx";
import { useSearchParams } from "react-router-dom";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const PAGE_SIZE = 8;

const ScoreTable = ({
  data,
  examName,
  examId,
  isMobile = false,
  isLoading = false,
}) => {
  const [, setSearchParams] = useSearchParams();
  const [classFilter, setClassFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const normalizedData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        score: Number(item.score || 0),
      })),
    [data],
  );

  const classOptions = useMemo(() => {
    const classes = Array.from(
      new Set(normalizedData.map((item) => item.className).filter(Boolean)),
    );
    return classes.map((cls) => ({ value: cls, label: cls }));
  }, [normalizedData]);

  const filteredData = useMemo(() => {
    return normalizedData.filter((item) => {
      const matchClass =
        classFilter === "all" ? true : item.className === classFilter;
      const matchSearch = `${item.nis} ${item.name} ${item.className}`
        .toLowerCase()
        .includes(searchText.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [normalizedData, classFilter, searchText]);

  const slicedData = useMemo(
    () => filteredData.slice(0, visibleCount),
    [filteredData, visibleCount],
  );

  const scoreStats = useMemo(() => {
    if (!filteredData.length) {
      return {
        average: 0,
        passed: 0,
        highest: 0,
      };
    }

    const total = filteredData.reduce(
      (sum, item) => sum + item.score,
      0,
    );
    const passed = filteredData.filter((item) => item.score >= 75).length;
    const highest = filteredData.reduce(
      (max, item) => Math.max(max, item.score),
      0,
    );

    return {
      average: Math.round((total / filteredData.length) * 10) / 10,
      passed,
      highest,
    };
  }, [filteredData]);

  const handleExportExcel = () => {
    const rows = filteredData.map((item, index) => ({
      No: index + 1,
      NIS: item.nis,
      Nama: item.name,
      Kelas: item.className,
      Nilai: item.score,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai");
    const safeName = String(examName || "nilai-ujian")
      .trim()
      .replace(/[/:*?"<>|]+/g, "-");
    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const handleOpenStudent = (student) => {
    if (!student || !examId) return;
    setSearchParams({
      view: "student_answers",
      exam_id: examId,
      exam_name: String(examName || "").replaceAll(" ", "-"),
      student_id: student.id,
      student_name: String(student.name || "-").replaceAll(" ", "-"),
      student_class: String(student.className || "-").replaceAll(" ", "-"),
      student_nis: String(student.nis || "-").replaceAll(" ", "-"),
    });
  };

  const columns = [
    {
      title: "No",
      dataIndex: "no",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "NIS",
      dataIndex: "nis",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Nama Siswa",
      dataIndex: "name",
      width: 240,
      ellipsis: true,
      render: (value, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{value}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.className || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Kelas",
      dataIndex: "className",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Nilai",
      dataIndex: "score",
      width: 120,
      render: (value) => {
        return (
          <Tag
            color={value >= 75 ? "green" : "orange"}
            style={{ borderRadius: 999, margin: 0, fontWeight: 700 }}
          >
            {value}
          </Tag>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 160,
      render: (_, record) => (
        <Button
          size='small'
          type='primary'
          icon={<Eye size={14} />}
          onClick={() => handleOpenStudent(record)}
          block={isMobile}
        >
          Detail Jawaban
        </Button>
      ),
    },
  ];

  const handleScroll = (event) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setVisibleCount((prev) => {
        if (prev >= filteredData.length) return prev;
        return prev + PAGE_SIZE;
      });
    }
  };

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: 24,
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Space orientation='vertical' size={18} style={{ width: "100%" }}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space orientation='vertical' size={4} style={{ minWidth: 0 }}>
              <Text type='secondary'>Analisis Nilai</Text>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Rekap Hasil Ujian Peserta
              </Title>
              <Text type='secondary'>
                Telusuri nilai siswa, filter per kelas, dan buka detail jawaban untuk peninjauan lebih lanjut.
              </Text>
            </Space>
            <Tag color='blue' icon={<Users size={12} />} style={{ margin: 0, borderRadius: 999 }}>
              Total Nilai: {filteredData.length}
            </Tag>
          </Flex>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                label: "Rata-rata",
                value: scoreStats.average,
                color: "#2563eb",
                icon: <Medal size={18} />,
              },
              {
                label: "Lulus >= 75",
                value: scoreStats.passed,
                color: "#16a34a",
                icon: <Users size={18} />,
              },
              {
                label: "Nilai Tertinggi",
                value: scoreStats.highest,
                color: "#d97706",
                icon: <Medal size={18} />,
              },
            ].map((item) => (
              <Card
                key={item.label}
                variant='borderless'
                style={{ borderRadius: 18, background: "#f8fafc" }}
                styles={{ body: { padding: 16 } }}
              >
                <Flex align='center' justify='space-between' gap={12}>
                  <Space orientation='vertical' size={4}>
                    <Text type='secondary'>{item.label}</Text>
                    <Title level={4} style={{ margin: 0, color: item.color }}>
                      {item.value}
                    </Title>
                  </Space>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                </Flex>
              </Card>
            ))}
          </div>

          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space
              wrap
              style={{
                width: isMobile ? "100%" : "auto",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <Input
                allowClear
                prefix={<Search size={14} />}
                placeholder='Cari nama / NIS / kelas'
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                style={{ width: isMobile ? "100%" : 260, maxWidth: "100%" }}
              />
              <Select
                value={classFilter}
                onChange={(value) => {
                  setClassFilter(value);
                  setVisibleCount(PAGE_SIZE);
                }}
                style={{ width: isMobile ? "100%" : 180, maxWidth: "100%" }}
                options={[{ value: "all", label: "Semua Kelas" }, ...classOptions]}
                virtual={false}
              />
            </Space>
            <Button
              icon={<Download size={14} />}
              onClick={handleExportExcel}
              block={isMobile}
            >
              Download Excel
            </Button>
          </Flex>

          <div
            style={{
              maxHeight: 480,
              overflow: "auto",
              borderRadius: 18,
              border: "1px solid rgba(148, 163, 184, 0.14)",
            }}
            onScroll={handleScroll}
          >
            <Table
              rowKey='id'
              columns={columns}
              dataSource={slicedData}
              loading={isLoading}
              pagination={false}
              sticky
              size={isMobile ? "small" : "middle"}
              tableLayout='fixed'
              scroll={isMobile ? { x: 820 } : undefined}
            />
            {slicedData.length >= filteredData.length ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#98a2b3",
                  padding: "8px 0 4px",
                  fontSize: 12,
                }}
              >
                Semua data telah dimuat
              </div>
            ) : null}
          </div>
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default ScoreTable;
