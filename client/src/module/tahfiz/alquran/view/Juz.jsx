import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Col,
  Empty,
  Flex,
  Form,
  Grid,
  InputNumber,
  Row,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { BookMarked, ChevronDown, ChevronUp, List, MoveRight, PencilLine, Rows3 } from "lucide-react";

import { IconBox, MuseCard } from "../../../../components/ui/muse";
import { FormModal } from "../../../../components/ui/muse/DataSection";
import {
  useGetJuzAyahListQuery,
  useUpdateJuzLineCountMutation,
} from "../../../../service/tahfiz/ApiAlquran";
import AyahDetailPanel from "./AyahDetailPanel";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const arabicTextStyle = {
  fontFamily: "'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', 'Traditional Arabic', serif",
  direction: "rtl",
  unicodeBidi: "isolate",
  letterSpacing: "0.2px",
  lineHeight: 1.5,
};

const arabicTagTextStyle = {
  ...arabicTextStyle,
  fontSize: 18,
  lineHeight: 1.75,
  fontWeight: 600,
};

const getDisplaySurahName = (value, surahNumber) => value || `Surah ${surahNumber ?? "-"}`;

const Juz = ({ data = [], isLoading, isFetching, isError, refetch }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [activeJuz, setActiveJuz] = useState(null);
  const [activeJuzAyah, setActiveJuzAyah] = useState(null);
  const [visibleSurahMap, setVisibleSurahMap] = useState({});
  const [updateJuzLineCount, { isLoading: isSaving }] = useUpdateJuzLineCountMutation();
  const ayahQuery = useGetJuzAyahListQuery(activeJuzAyah?.number, {
    skip: !activeJuzAyah?.number,
  });

  const openLineCountModal = (juz) => {
    setActiveJuz(juz);
    form.setFieldsValue({ line_count: juz?.line_count ?? undefined });
  };

  const handleSaveLineCount = async () => {
    try {
      const values = await form.validateFields();
      await updateJuzLineCount({
        number: activeJuz.number,
        line_count: values.line_count,
      }).unwrap();
      message.success(`Jumlah baris Juz ${activeJuz.number} berhasil disimpan.`);
      setActiveJuz(null);
      form.resetFields();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.data?.message || "Gagal menyimpan jumlah baris.");
    }
  };

  const toggleSurahList = (juzNumber) => {
    setVisibleSurahMap((prev) => ({ ...prev, [juzNumber]: !prev[juzNumber] }));
  };

  if (activeJuzAyah) {
    return (
      <AyahDetailPanel
        title={`Ayat Juz ${activeJuzAyah.number}`}
        onBack={() => setActiveJuzAyah(null)}
        isLoading={ayahQuery.isLoading}
        isError={ayahQuery.isError}
        errorMessage='Gagal memuat ayat juz.'
        items={ayahQuery.data || []}
        arabicTextStyle={arabicTextStyle}
        renderMeta={(ayah) => (
          <>
            <Tag color='blue' style={{ margin: 0 }}>
              {ayah.surah_number}:{ayah.ayah_number}
            </Tag>
            <Text type='secondary'>{ayah.surah_name}</Text>
            {ayah.audio_url ? (
              <audio
                controls
                preload='none'
                src={ayah.audio_url}
                aria-label={`Audio ayat ${ayah.surah_number}:${ayah.ayah_number}`}
                style={{ width: 240, maxWidth: "100%", height: 32 }}
              />
            ) : null}
          </>
        )}
      />
    );
  }

  const gap = isMobile ? 16 : 24;

  const renderBoundary = (label, surahNumber, surahName, ayah) => (
    <div style={{ minWidth: 0 }}>
      <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
        {label}
      </Text>
      <Text strong style={{ display: "block" }}>
        Surah {surahNumber}{" "}
        <span style={arabicTextStyle}>{getDisplaySurahName(surahName, surahNumber)}</span>
      </Text>
      <Text type='secondary' style={{ fontSize: 12 }}>
        Ayat {ayah}
      </Text>
    </div>
  );

  return (
    <Flex vertical gap={gap}>
      {isError ? (
        <Alert
          type='error'
          showIcon
          title='Gagal memuat data juz'
          action={
            <Button size='small' onClick={refetch}>
              Coba lagi
            </Button>
          }
        />
      ) : null}

      {isFetching && !isLoading ? <Text type='secondary'>Memperbarui data juz…</Text> : null}

      {isLoading ? (
        <Row gutter={[gap, gap]}>
          {Array.from({ length: 6 }, (_, index) => (
            <Col xs={24} md={12} xl={8} key={index}>
              <MuseCard>
                <Skeleton active paragraph={{ rows: 4 }} />
              </MuseCard>
            </Col>
          ))}
        </Row>
      ) : null}

      {!isLoading && !isError && !data.length ? (
        <MuseCard>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Data juz belum tersedia.' />
        </MuseCard>
      ) : null}

      <Row gutter={[gap, gap]}>
        {data.map((item) => {
          const surahList = item.surah_list || [];
          const isSurahVisible = Boolean(visibleSurahMap[item.number]);
          return (
            <Col xs={24} md={12} xl={8} key={item.number}>
              <MuseCard style={{ height: "100%" }} styles={{ body: { height: "100%" } }}>
                <Flex vertical gap={12} style={{ height: "100%" }}>
                  <Flex justify='space-between' align='center' gap={12}>
                    <Flex align='center' gap={10}>
                      <IconBox
                        icon={<span style={{ fontWeight: 700, fontSize: 14 }}>{item.number}</span>}
                        tone='primarySoft'
                        size={40}
                      />
                      <Text strong style={{ fontSize: 16 }}>
                        Juz {item.number}
                      </Text>
                    </Flex>
                    <Flex gap={6} wrap justify='flex-end'>
                      <Tag icon={<BookMarked size={12} />} style={{ marginInlineEnd: 0 }}>
                        {item.verse_count || "-"} ayat
                      </Tag>
                      <Tag
                        icon={<Rows3 size={12} />}
                        color={item.line_count ? "default" : "warning"}
                        style={{ marginInlineEnd: 0 }}
                      >
                        {item.line_count ? `${item.line_count} baris` : "Baris belum diisi"}
                      </Tag>
                    </Flex>
                  </Flex>

                  <Flex align='center' gap={8}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renderBoundary("Awal", item.start_surah_number, item.start_surah_name, item.start_ayah)}
                    </div>
                    <MoveRight size={16} aria-hidden style={{ flexShrink: 0, opacity: 0.45 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renderBoundary("Akhir", item.end_surah_number, item.end_surah_name, item.end_ayah)}
                    </div>
                  </Flex>

                  <div>
                    <Button
                      type='link'
                      size='small'
                      style={{ paddingInline: 0 }}
                      onClick={() => toggleSurahList(item.number)}
                      aria-expanded={isSurahVisible}
                      icon={isSurahVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      iconPlacement='end'
                    >
                      {isSurahVisible ? "Sembunyikan" : "Tampilkan"} {surahList.length} surah
                    </Button>
                    {isSurahVisible ? (
                      <Flex
                        gap={6}
                        wrap
                        style={{ marginTop: 6, maxHeight: 170, overflow: "auto", paddingRight: 4 }}
                      >
                        {surahList.map((surah) => (
                          <Tag key={`${item.number}-${surah.number}`} style={{ marginInlineEnd: 0 }}>
                            {surah.number}.{" "}
                            <span style={arabicTagTextStyle}>
                              {getDisplaySurahName(surah.name, surah.number)}
                            </span>
                          </Tag>
                        ))}
                      </Flex>
                    ) : null}
                  </div>

                  <Flex gap={8} style={{ marginTop: "auto" }}>
                    <Button icon={<List size={16} />} onClick={() => setActiveJuzAyah(item)}>
                      Lihat Ayat
                    </Button>
                    <Tooltip title='Isi jumlah baris juz ini'>
                      <Button
                        type='text'
                        icon={<PencilLine size={16} />}
                        onClick={() => openLineCountModal(item)}
                      >
                        Jumlah Baris
                      </Button>
                    </Tooltip>
                  </Flex>
                </Flex>
              </MuseCard>
            </Col>
          );
        })}
      </Row>

      <FormModal
        open={Boolean(activeJuz)}
        onCancel={() => setActiveJuz(null)}
        onOk={handleSaveLineCount}
        icon={<Rows3 size={18} />}
        title={activeJuz ? `Jumlah Baris Juz ${activeJuz.number}` : "Jumlah Baris Juz"}
        description='Dipakai untuk menghitung target dan capaian berbasis baris.'
        confirmLoading={isSaving}
        width={420}
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            label='Jumlah Baris'
            name='line_count'
            style={{ marginBottom: 0 }}
            rules={[
              { required: true, message: "Jumlah baris wajib diisi." },
              { type: "number", min: 0, message: "Jumlah baris harus angka 0 atau lebih." },
            ]}
          >
            <InputNumber min={0} style={{ width: "100%" }} placeholder='Contoh: 300' />
          </Form.Item>
        </Form>
      </FormModal>
    </Flex>
  );
};

export default Juz;
