import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Segmented,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { BookOpen, List, ScrollText } from "lucide-react";

import { IconBox, MuseCard } from "../../../../components/ui/muse";
import { museColors } from "../../../../config/theme";
import { useGetSurahAyahListQuery } from "../../../../service/tahfiz/ApiAlquran";
import AyahDetailPanel from "./AyahDetailPanel";

const { Text } = Typography;
const { useBreakpoint } = Grid;

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

const getSurahArabicName = (surah) =>
  surah?.name_arabic || surah?.name_latin || `Surah ${surah?.number ?? "-"}`;

const getSurahTranslation = (surah) =>
  surah?.name_translation || normalizeRevelation(surah?.revelation_type);

const Surah = ({ data = [], isLoading, isFetching, isError, refetch }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [search, setSearch] = useState("");
  const [revelationFilter, setRevelationFilter] = useState("all");
  const [activeSurah, setActiveSurah] = useState(null);
  const ayahQuery = useGetSurahAyahListQuery(activeSurah?.number, {
    skip: !activeSurah?.number,
  });

  const filteredSurah = useMemo(() => {
    return data.filter((surah) => {
      const text =
        `${surah.number || ""} ${surah.name_latin || ""} ${surah.name_arabic || ""} ${surah.name_translation || ""}`.toLowerCase();

      const matchSearch = text.includes(search.toLowerCase());
      const normalized = (surah.revelation_type || "").toLowerCase();
      const matchType =
        revelationFilter === "all" ? true : normalized === revelationFilter;

      return matchSearch && matchType;
    });
  }, [data, revelationFilter, search]);

  if (activeSurah) {
    return (
      <AyahDetailPanel
        title={`Surah ${activeSurah.number} - ${activeSurah.name_latin}`}
        subtitle={getSurahArabicName(activeSurah)}
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
            <Tag color='blue' style={{ margin: 0 }}>
              Ayat {ayah.ayah_number}
            </Tag>
            <Text type='secondary'>Juz {ayah.juz_number}</Text>
          </Flex>
        )}
      />
    );
  }

  const gap = isMobile ? 16 : 24;

  return (
    <Flex vertical gap={gap}>
      {isError ? (
        <Alert
          type='error'
          showIcon
          title='Gagal memuat data surah'
          action={
            <Button size='small' onClick={refetch}>
              Coba lagi
            </Button>
          }
        />
      ) : null}

      <MuseCard>
        <Flex gap={12} wrap align='center'>
          <Input.Search
            aria-label='Cari surah'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Cari nomor / nama surah'
            allowClear
            style={{ flex: "1 1 240px", maxWidth: isMobile ? "100%" : 360 }}
          />
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <Segmented
              aria-label='Filter jenis surah'
              value={revelationFilter}
              onChange={setRevelationFilter}
              options={[
                { label: "Semua", value: "all" },
                { label: "Makkiyah", value: "meccan" },
                { label: "Madaniyah", value: "medinan" },
              ]}
            />
          </div>
          <Text type='secondary' style={{ marginInlineStart: "auto" }}>
            {isFetching && !isLoading
              ? "Memperbarui data…"
              : `${filteredSurah.length.toLocaleString("id-ID")} surah`}
          </Text>
        </Flex>
      </MuseCard>

      {isLoading ? (
        <Row gutter={[gap, gap]}>
          {Array.from({ length: 6 }, (_, index) => (
            <Col xs={24} md={12} xl={8} key={index}>
              <MuseCard>
                <Skeleton active paragraph={{ rows: 3 }} />
              </MuseCard>
            </Col>
          ))}
        </Row>
      ) : null}

      {!isLoading && !isError && !filteredSurah.length ? (
        <MuseCard>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description='Surah tidak ditemukan. Coba kata kunci atau filter lain.'
          />
        </MuseCard>
      ) : null}

      <Row gutter={[gap, gap]}>
        {filteredSurah.map((surah) => (
          <Col xs={24} md={12} xl={8} key={surah.number}>
            <MuseCard style={{ height: "100%" }} styles={{ body: { height: "100%" } }}>
              <Flex vertical gap={12} style={{ height: "100%" }}>
                <Flex justify='space-between' align='center' gap={12}>
                  <IconBox
                    icon={<span style={{ fontWeight: 700, fontSize: 14 }}>{surah.number}</span>}
                    tone='primarySoft'
                    size={40}
                  />
                  <Text
                    style={{
                      ...arabicTextStyle,
                      fontSize: 26,
                      color: museColors.navy,
                    }}
                  >
                    {getSurahArabicName(surah)}
                  </Text>
                </Flex>

                <div>
                  <Text strong style={{ display: "block", fontSize: 16 }}>
                    {surah.name_latin || `Surah ${surah.number}`}
                  </Text>
                  <Text type='secondary'>{getSurahTranslation(surah)}</Text>
                </div>

                <Flex gap={6} wrap>
                  <Tag icon={<BookOpen size={12} />} style={{ marginInlineEnd: 0 }}>
                    {surah.number_of_verses} ayat
                  </Tag>
                  <Tag icon={<ScrollText size={12} />} style={{ marginInlineEnd: 0 }}>
                    {normalizeRevelation(surah.revelation_type)}
                  </Tag>
                </Flex>

                <Button
                  icon={<List size={16} />}
                  onClick={() => setActiveSurah(surah)}
                  style={{ marginTop: "auto", alignSelf: "flex-start" }}
                >
                  Lihat Ayat
                </Button>
              </Flex>
            </MuseCard>
          </Col>
        ))}
      </Row>
    </Flex>
  );
};

export default Surah;
