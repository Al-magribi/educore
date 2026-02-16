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
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useSearchParams } from "react-router-dom";

const { Text } = Typography;

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

  const classOptions = useMemo(() => {
    const classes = Array.from(
      new Set(data.map((item) => item.className).filter(Boolean)),
    );
    return classes.map((cls) => ({ value: cls, label: cls }));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchClass =
        classFilter === "all" ? true : item.className === classFilter;
      const matchSearch = `${item.nis} ${item.name}`
        .toLowerCase()
        .includes(searchText.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [data, classFilter, searchText]);

  const slicedData = useMemo(() => {
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  const handleExportExcel = () => {
    const rows = filteredData.map((item, index) => ({
      No: index + 1,
      NIS: item.nis,
      Nama: item.name,
      Kelas: item.className,
      Nilai: item.score ?? 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai");
    const safeName = String(examName || "nilai-ujian")
      .trim()
      .replace(/[\/:*?"<>|]+/g, "-");
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
      width: 220,
      ellipsis: true,
      render: (value) => <Text strong>{value}</Text>,
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
      render: (value) => (
        <Tag color={value >= 75 ? "green" : "orange"}>{value}</Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Button
          size='small'
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
    <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
      <Flex
        justify='space-between'
        align={isMobile ? "stretch" : "center"}
        wrap='wrap'
        gap={12}
        style={{
          marginBottom: 16,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <Space
          wrap
          style={{
            width: isMobile ? "100%" : "auto",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
          }}
        >
          <Input.Search
            placeholder='Cari nama / NIS'
            allowClear
            onSearch={(value) => {
              setSearchText(value);
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
        <Space
          wrap
          style={{
            width: isMobile ? "100%" : "auto",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
          }}
        >
          <div style={{ width: isMobile ? "100%" : "auto" }}>
            <Tag color='blue'>Total Nilai: {filteredData.length}</Tag>
          </div>
          <Button
            icon={<Download size={14} />}
            onClick={handleExportExcel}
            block={isMobile}
          >
            Download Excel
          </Button>
        </Space>
      </Flex>

      <div style={{ maxHeight: 480, overflow: "auto" }} onScroll={handleScroll}>
        <Table
          rowKey='id'
          columns={columns}
          dataSource={slicedData}
          loading={isLoading}
          pagination={false}
          sticky
          size={isMobile ? "small" : "middle"}
          tableLayout='fixed'
          scroll={isMobile ? { x: 760 } : undefined}
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
    </Card>
  );
};

export default ScoreTable;
