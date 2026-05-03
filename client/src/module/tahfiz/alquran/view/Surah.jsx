import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Segmented,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { BookOpen, List, Search, ScrollText } from "lucide-react";
import { useGetSurahAyahListQuery } from "../../../../service/tahfiz/ApiAlquran";
import AyahDetailPanel from "./AyahDetailPanel";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const arabicTextStyle = {
  fontFamily:
    "'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', 'Traditional Arabic', serif",
  direction: "rtl",
  unicodeBidi: "isolate",
  letterSpacing: "0.2px",
  lineHeight: 1.5,
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

const normalizeRevelation = (type) => {
  if (!type) return "Tidak diketahui";
  if (type.toLowerCase() === "meccan") return "Makkiyah";
  if (type.toLowerCase() === "medinan") return "Madaniyah";
  return type;
};

const Surah = ({ data = [], isLoading, isFetching, isError, refetch }) => {
  const screens = useBreakpoint();
  const [search, setSearch] = useState("");
  const [revelationFilter, setRevelationFilter] = useState("all");
  const [activeSurah, setActiveSurah] = useState(null);
  const ayahQuery = useGetSurahAyahListQuery(activeSurah?.number, {
    skip: !activeSurah?.number,
  });

  const filteredSurah = useMemo(() => {
    return data.filter((surah) => {
      const text =
        `${surah.number} ${surah.name_latin} ${surah.name_arabic} ${surah.name_translation}`.toLowerCase();

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
        type='error'
        showIcon
        message='Gagal memuat data surah.'
        action={
          <a onClick={refetch} style={{ fontWeight: 600 }}>
            Coba lagi
          </a>
        }
      />
    );
  }

  if (activeSurah) {
    return (
      <AyahDetailPanel
        title={`Surah ${activeSurah.number} - ${activeSurah.name_latin}`}
        subtitle={activeSurah.name_arabic}
        onBack={() => setActiveSurah(null)}
        isLoading={ayahQuery.isLoading}
        isError={ayahQuery.isError}
        errorMessage='Gagal memuat ayat surah.'
        items={ayahQuery.data || []}
        arabicTextStyle={arabicTextStyle}
        renderMeta={(ayah, context = {}) => (
          <Flex
            gap={8}
            align={context.isMobile ? "flex-start" : "center"}
            wrap='wrap'
            vertical={context.isMobile}
          >
            <Tag
              color='blue'
              style={{ margin: 0, borderRadius: 999, fontWeight: 600 }}
            >
              Ayat {ayah.ayah_number}
            </Tag>
            <Text type='secondary'>Juz {ayah.juz_number}</Text>
          </Flex>
        )}
      />
    );
  }

  return (
    <Space direction='vertical' size={16} style={{ width: "100%" }}>
      <Card
        style={{
          borderRadius: 20,
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 70%)",
        }}
      >
        <Row gutter={[12, 12]} align='middle'>
          <Col xs={24} md={14}>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Cari nomor / nama surah'
              prefix={<Search size={16} color='#1d4ed8' />}
              allowClear
              size='large'
              style={{ borderRadius: 12 }}
            />
          </Col>
          <Col xs={24} md={10}>
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
              <Card style={{ borderRadius: 16 }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : null}

      {!isLoading && !filteredSurah.length ? (
        <Card style={{ borderRadius: 16 }}>
          <Empty description='Surah tidak ditemukan' />
        </Card>
      ) : null}

      <Row gutter={[12, 12]}>
        {filteredSurah.map((surah, index) => (
          <Col xs={24} md={12} xl={8} key={surah.number}>
            <MotionDiv
              variants={itemVariants}
              initial='hidden'
              animate='show'
              transition={{ delay: Math.min(index * 0.02, 0.18) }}
              whileHover={{ y: -4 }}
              style={{ height: "100%" }}
            >
              <Card
                hoverable
                style={{
                  borderRadius: 18,
                  height: "100%",
                  border: "1px solid #dbeafe",
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, rgba(239,246,255,0.6) 100%)",
                }}
                styles={{ body: { padding: screens.md ? 18 : 14 } }}
              >
                <Space direction='vertical' size={10} style={{ width: "100%" }}>
                  <Space
                    align='center'
                    style={{ justifyContent: "space-between", width: "100%" }}
                  >
                    <Tag
                      style={{
                        margin: 0,
                        borderRadius: 999,
                        color: "#1d4ed8",
                        borderColor: "#bfdbfe",
                        background: "#eff6ff",
                        fontWeight: 600,
                      }}
                    >
                      Surah {surah.number}
                    </Tag>
                    <Text
                      style={{
                        ...arabicTextStyle,
                        fontSize: 28,
                        color: "#0f172a",
                      }}
                    >
                      {surah.name_arabic}
                    </Text>
                  </Space>

                  <div>
                    <Title level={5} style={{ margin: 0 }}>
                      {surah.name_latin}
                    </Title>
                    <Text type='secondary'>{surah.name_translation}</Text>
                  </div>

                  <Space wrap>
                    <Tag icon={<BookOpen size={12} />} color='blue'>
                      {surah.number_of_verses} ayat
                    </Tag>
                    <Tag icon={<ScrollText size={12} />} color='cyan'>
                      {normalizeRevelation(surah.revelation_type)}
                    </Tag>
                  </Space>

                  <Button
                    type='default'
                    icon={<List size={14} />}
                    onClick={() => setActiveSurah(surah)}
                    style={{ borderRadius: 10 }}
                  >
                    Lihat Ayat
                  </Button>
                </Space>
              </Card>
            </MotionDiv>
          </Col>
        ))}
      </Row>

      {isFetching && !isLoading ? (
        <Text type='secondary'>Memperbarui data surah...</Text>
      ) : null}
    </Space>
  );
};

export default Surah;
