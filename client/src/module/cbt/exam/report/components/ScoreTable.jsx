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
import { Download, Medal, Search, Users } from "lucide-react";
import * as XLSX from "xlsx";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const PAGE_SIZE = 8;

const ScoreTable = ({
  data,
  examName,
  isMobile = false,
  isLoading = false,
}) => {
  const [classFilter, setClassFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const normalizedData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        score: Number(item.score || 0),
        scoreSingle: Number(item.scoreSingle || 0),
        scoreMulti: Number(item.scoreMulti || 0),
        scoreMatch: Number(item.scoreMatch || 0),
        scoreTrueFalse: Number(item.scoreTrueFalse || 0),
        scoreShort: Number(item.scoreShort || 0),
        scoreEssay: Number(item.scoreEssay || 0),
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

    const total = filteredData.reduce((sum, item) => sum + item.score, 0);
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
      "PG Tunggal": item.scoreSingle,
      "PG Multi": item.scoreMulti,
      Mencocokan: item.scoreMatch,
      "Benar / Salah": item.scoreTrueFalse,
      "Jawaban Singkat": item.scoreShort,
      Uraian: item.scoreEssay,
      "Nilai Akhir": item.score,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai");
    const safeName = String(examName || "nilai-ujian")
      .trim()
      .replace(/[/:*?"<>|]+/g, "-");
    XLSX.writeFile(workbook, `${safeName}.xlsx`);
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
      title: "Nama Siswa",
      dataIndex: "name",
      width: 240,
      ellipsis: true,
      render: (value, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{value}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.nis || "-"} | {record.className || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "PG Tunggal",
      dataIndex: "scoreSingle",
      width: 110,
      align: "center",
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: "PG Multi",
      dataIndex: "scoreMulti",
      width: 110,
      align: "center",
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: "Mencocokan",
      dataIndex: "scoreMatch",
      width: 120,
      align: "center",
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: "Benar / Salah",
      dataIndex: "scoreTrueFalse",
      width: 120,
      align: "center",
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: "Jawaban Singkat",
      dataIndex: "scoreShort",
      width: 130,
      align: "center",
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: "Uraian",
      dataIndex: "scoreEssay",
      width: 100,
      align: "center",
      render: (value) => Number(value || 0).toFixed(2),
    },
    {
      title: "Nilai Akhir",
      dataIndex: "score",
      width: 130,
      align: "center",
      render: (value) => (
        <Tag
          color={value >= 75 ? "green" : "orange"}
          style={{ borderRadius: 999, margin: 0, fontWeight: 700 }}
        >
          {value}
        </Tag>
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

  const loadMore = () => {
    setVisibleCount((prev) => {
      if (prev >= filteredData.length) return prev;
      return prev + PAGE_SIZE;
    });
  };

  const metricItems = [
    {
      label: "Rata-rata",
      value: scoreStats.average,
      color: "#2563eb",
      icon: <Medal size={isMobile ? 16 : 18} />,
    },
    {
      label: isMobile ? "Lulus" : "Lulus >= 75",
      value: scoreStats.passed,
      color: "#16a34a",
      icon: <Users size={isMobile ? 16 : 18} />,
    },
    {
      label: isMobile ? "Tertinggi" : "Nilai Tertinggi",
      value: scoreStats.highest,
      color: "#d97706",
      icon: <Medal size={isMobile ? 16 : 18} />,
    },
  ];

  const renderMobileScoreCard = (item, index) => (
    <Card
      key={item.id}
      size='small'
      variant='borderless'
      style={{
        borderRadius: 16,
        border: "1px solid rgba(148, 163, 184, 0.14)",
        background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
      }}
      styles={{ body: { padding: 14 } }}
    >
      <Flex vertical gap={10}>
        <Flex justify='space-between' align='flex-start' gap={10}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text type='secondary' style={{ fontSize: 11 }}>
              #{index + 1}
            </Text>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.name}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {item.nis || "-"} · {item.className || "-"}
            </Text>
          </div>
          <Tag
            color={item.score >= 75 ? "green" : "orange"}
            style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
          >
            {item.score}
          </Tag>
        </Flex>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {[
            { label: "PG Tunggal", value: item.scoreSingle },
            { label: "PG Multi", value: item.scoreMulti },
            { label: "Mencocokan", value: item.scoreMatch },
            { label: "B/S", value: item.scoreTrueFalse },
            { label: "Singkat", value: item.scoreShort },
            { label: "Uraian", value: item.scoreEssay },
          ].map((scoreItem) => (
            <div
              key={scoreItem.label}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                minWidth: 0,
              }}
            >
              <Text
                type='secondary'
                style={{ fontSize: 11, display: "block" }}
              >
                {scoreItem.label}
              </Text>
              <Text strong style={{ fontSize: 13 }}>
                {Number(scoreItem.value || 0).toFixed(2)}
              </Text>
            </div>
          ))}
        </div>
      </Flex>
    </Card>
  );

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ width: "100%", minWidth: 0 }}
    >
      <Card
        variant='borderless'
        style={{
          borderRadius: isMobile ? 18 : 24,
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}
      >
        <Space
          direction='vertical'
          size={isMobile ? 14 : 18}
          style={{ width: "100%" }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space direction='vertical' size={4} style={{ minWidth: 0, flex: 1 }}>
              <Text type='secondary'>Analisis Nilai</Text>
              <Title
                level={isMobile ? 5 : 4}
                style={{ margin: 0, wordBreak: "break-word" }}
              >
                Rekap Hasil Ujian Peserta
              </Title>
              {!isMobile && (
                <Text type='secondary'>
                  Telusuri nilai siswa dan filter per kelas untuk memantau
                  capaian hasil ujian.
                </Text>
              )}
            </Space>
            <Tag
              color='blue'
              icon={<Users size={12} />}
              style={{ margin: 0, borderRadius: 999, alignSelf: "flex-start" }}
            >
              Total Nilai: {filteredData.length}
            </Tag>
          </Flex>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
              gap: isMobile ? 10 : 12,
              width: "100%",
            }}
          >
            {metricItems.map((item, index) => (
              <Card
                key={item.label}
                variant='borderless'
                style={{
                  borderRadius: isMobile ? 14 : 18,
                  background: "#f8fafc",
                  minWidth: 0,
                  overflow: "hidden",
                  gridColumn:
                    isMobile && index === metricItems.length - 1 && metricItems.length % 2 === 1
                      ? "1 / -1"
                      : undefined,
                }}
                styles={{ body: { padding: isMobile ? 12 : 16 } }}
              >
                <Flex
                  align='center'
                  justify='space-between'
                  gap={isMobile ? 8 : 12}
                  style={{ minWidth: 0 }}
                >
                  <Space direction='vertical' size={2} style={{ minWidth: 0, flex: 1 }}>
                    <Text
                      type='secondary'
                      style={{
                        fontSize: isMobile ? 11 : 14,
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label}
                    </Text>
                    <Title
                      level={isMobile ? 5 : 4}
                      style={{ margin: 0, color: item.color, lineHeight: 1.15 }}
                    >
                      {item.value}
                    </Title>
                  </Space>
                  <div
                    style={{
                      width: isMobile ? 32 : 42,
                      height: isMobile ? 32 : 42,
                      borderRadius: isMobile ? 10 : 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      color: item.color,
                      flexShrink: 0,
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
                options={[
                  { value: "all", label: "Semua Kelas" },
                  ...classOptions,
                ]}
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

          {isMobile ? (
            <Flex vertical gap={10}>
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <Card
                      key={`skeleton-${index}`}
                      loading
                      style={{ borderRadius: 16 }}
                    />
                  ))
                : slicedData.map((item, index) =>
                    renderMobileScoreCard(item, index),
                  )}
              {slicedData.length < filteredData.length ? (
                <Button onClick={loadMore} block>
                  Muat lebih banyak
                </Button>
              ) : slicedData.length > 0 ? (
                <Text
                  type='secondary'
                  style={{ textAlign: "center", fontSize: 12 }}
                >
                  Semua data telah dimuat
                </Text>
              ) : null}
            </Flex>
          ) : (
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
                size='middle'
                tableLayout='fixed'
                scroll={{ x: 1260 }}
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
          )}
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default ScoreTable;
