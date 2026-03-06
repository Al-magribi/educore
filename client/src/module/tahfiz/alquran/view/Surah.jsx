import React, { useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Segmented,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { BookOpen, Search, ScrollText } from "lucide-react";

const { Text, Title } = Typography;
const arabicTextStyle = {
  fontFamily:
    "'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', 'Traditional Arabic', serif",
  direction: "rtl",
  unicodeBidi: "isolate",
  letterSpacing: "0.2px",
  lineHeight: 1.5,
};

const normalizeRevelation = (type) => {
  if (!type) return "Tidak diketahui";
  if (type.toLowerCase() === "meccan") return "Makkiyah";
  if (type.toLowerCase() === "medinan") return "Madaniyah";
  return type;
};

const Surah = ({ data = [], isLoading, isFetching, isError, refetch }) => {
  const [search, setSearch] = useState("");
  const [revelationFilter, setRevelationFilter] = useState("all");

  const filteredSurah = useMemo(() => {
    return data.filter((surah) => {
      const text = `${surah.number} ${surah.name_latin} ${surah.name_arabic} ${surah.name_translation}`
        .toLowerCase();

      const matchSearch = text.includes(search.toLowerCase());
      const normalized = (surah.revelation_type || "").toLowerCase();
      const matchType =
        revelationFilter === "all" ? true : normalized === revelationFilter;

      return matchSearch && matchType;
    });
  }, [data, revelationFilter, search]);

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Gagal memuat data surah."
        action={
          <a onClick={refetch} style={{ fontWeight: 600 }}>
            Coba lagi
          </a>
        }
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card
        style={{
          borderRadius: 12,
          border: "1px solid #e8f5e9",
          background: "linear-gradient(135deg, #f6ffed 0%, #ffffff 65%)",
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nomor / nama surah"
              prefix={<Search size={16} />}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} md={12}>
            <Segmented
              block
              value={revelationFilter}
              onChange={setRevelationFilter}
              options={[
                { label: "Semua", value: "all" },
                { label: "Makkiyah", value: "meccan" },
                { label: "Madaniyah", value: "medinan" },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {isLoading ? (
        <Row gutter={[12, 12]}>
          {Array.from({ length: 6 }, (_, index) => (
            <Col xs={24} md={12} xl={8} key={index}>
              <Card style={{ borderRadius: 12 }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : null}

      {!isLoading && !filteredSurah.length ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty description="Surah tidak ditemukan" />
        </Card>
      ) : null}

      <Row gutter={[12, 12]}>
        {filteredSurah.map((surah) => (
          <Col xs={24} md={12} xl={8} key={surah.number}>
            <Card
              hoverable
              style={{
                borderRadius: 12,
                height: "100%",
                border: "1px solid #f0f0f0",
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
              }}
            >
              <Space
                direction="vertical"
                size={10}
                style={{ width: "100%" }}
              >
                <Space
                  align="center"
                  style={{ justifyContent: "space-between", width: "100%" }}
                >
                  <Tag color="blue">Surah {surah.number}</Tag>
                  <Text style={{ ...arabicTextStyle, fontSize: 28 }}>
                    {surah.name_arabic}
                  </Text>
                </Space>

                <div>
                  <Title level={5} style={{ margin: 0 }}>
                    {surah.name_latin}
                  </Title>
                  <Text type="secondary">{surah.name_translation}</Text>
                </div>

                <Space wrap>
                  <Tag icon={<BookOpen size={12} />}>
                    {surah.number_of_verses} ayat
                  </Tag>
                  <Tag icon={<ScrollText size={12} />} color="green">
                    {normalizeRevelation(surah.revelation_type)}
                  </Tag>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {isFetching && !isLoading ? (
        <Text type="secondary">Memperbarui data surah...</Text>
      ) : null}
    </Space>
  );
};

export default Surah;
