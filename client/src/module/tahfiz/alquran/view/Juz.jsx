import React from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  InputNumber,
  Modal,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  BookMarked,
  Eye,
  EyeOff,
  Flag,
  List,
  MoveRight,
  PencilLine,
} from "lucide-react";
import {
  useGetJuzAyahListQuery,
  useUpdateJuzLineCountMutation,
} from "../../../../service/tahfiz/ApiAlquran";
import AyahDetailPanel from "./AyahDetailPanel";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const arabicTextStyle = {
  fontFamily:
    "'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', 'Traditional Arabic', serif",
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

const Juz = ({ data = [], isLoading, isFetching, isError, refetch }) => {
  const [form] = Form.useForm();
  const [activeJuz, setActiveJuz] = React.useState(null);
  const [activeJuzAyah, setActiveJuzAyah] = React.useState(null);
  const [visibleSurahMap, setVisibleSurahMap] = React.useState({});
  const [updateJuzLineCount, { isLoading: isSaving }] =
    useUpdateJuzLineCountMutation();
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
    setVisibleSurahMap((prev) => ({
      ...prev,
      [juzNumber]: !prev[juzNumber],
    }));
  };

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat data juz.'
        action={
          <a onClick={refetch} style={{ fontWeight: 600 }}>
            Coba lagi
          </a>
        }
      />
    );
  }

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
            <Tag color='blue'>
              {ayah.surah_number}:{ayah.ayah_number}
            </Tag>
            <Text type='secondary'>{ayah.surah_name}</Text>
            {ayah.audio_url ? (
              <audio
                controls
                preload='none'
                src={ayah.audio_url}
                style={{ width: 240, height: 32 }}
              />
            ) : null}
          </>
        )}
      />
    );
  }

  return (
    <Space direction='vertical' size={16} style={{ width: "100%" }}>
      {isLoading ? (
        <Row gutter={[12, 12]}>
          {Array.from({ length: 6 }, (_, index) => (
            <Col xs={24} md={12} xl={8} key={index}>
              <Card style={{ borderRadius: 16 }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : null}

      {!isLoading && !data.length ? (
        <Card style={{ borderRadius: 16 }}>
          <Empty description='Data juz tidak tersedia' />
        </Card>
      ) : null}

      <Row gutter={[12, 12]}>
        {data.map((item, index) => (
          <Col xs={24} md={12} xl={8} key={item.number}>
            <MotionDiv
              variants={cardVariants}
              initial='hidden'
              animate='show'
              transition={{ delay: Math.min(index * 0.025, 0.2) }}
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
                    "linear-gradient(180deg, #ffffff 0%, rgba(239,246,255,0.55) 100%)",
                }}
              >
                <Space direction='vertical' size={12} style={{ width: "100%" }}>
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
                      Juz {item.number}
                    </Tag>
                    <Space size={6} wrap>
                      <Tag icon={<BookMarked size={12} />} color='blue'>
                        {item.verse_count || "-"} ayat
                      </Tag>
                      <Tag color='cyan'>{item.line_count || "-"} baris</Tag>
                    </Space>
                  </Space>

                  <div>
                    <Text type='secondary'>Awal Juz</Text>
                    <Title level={5} style={{ margin: "2px 0 0 0" }}>
                      Surah {item.start_surah_number} (
                      <span style={arabicTextStyle}>{item.start_surah_name}</span>)
                    </Title>
                    <Text>Ayat {item.start_ayah}</Text>
                  </div>

                  <Space align='center' size={6}>
                    <MoveRight size={16} color='#64748b' />
                    <Text type='secondary'>Sampai</Text>
                  </Space>

                  <div>
                    <Text type='secondary'>Akhir Juz</Text>
                    <Title level={5} style={{ margin: "2px 0 0 0" }}>
                      Surah {item.end_surah_number} (
                      <span style={arabicTextStyle}>{item.end_surah_name}</span>)
                    </Title>
                    <Text>Ayat {item.end_ayah}</Text>
                  </div>

                  <div>
                    <Space
                      align='center'
                      style={{ width: "100%", justifyContent: "space-between" }}
                    >
                      <Text type='secondary'>Surah dalam Juz</Text>
                      <Button
                        type='link'
                        size='small'
                        onClick={() => toggleSurahList(item.number)}
                        icon={
                          visibleSurahMap[item.number] ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )
                        }
                      >
                        {visibleSurahMap[item.number] ? "Sembunyikan" : "Tampilkan"}
                      </Button>
                    </Space>

                    {visibleSurahMap[item.number] ? (
                      <div
                        style={{
                          marginTop: 6,
                          maxHeight: 170,
                          overflow: "auto",
                          paddingRight: 4,
                        }}
                      >
                        <Space wrap>
                          {(item.surah_list || []).map((surah) => (
                            <Tag key={`${item.number}-${surah.number}`}>
                              {surah.number}. <span style={arabicTagTextStyle}>{surah.name}</span>
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    ) : (
                      <Text type='secondary' style={{ marginTop: 4, display: "block" }}>
                        {(item.surah_list || []).length} surah disembunyikan
                      </Text>
                    )}
                  </div>

                  <Tag icon={<Flag size={12} />} color='blue'>
                    Detail rentang juz lengkap
                  </Tag>

                  <Button
                    type='primary'
                    icon={<PencilLine size={14} />}
                    onClick={() => openLineCountModal(item)}
                    style={{ borderRadius: 10 }}
                  >
                    Isi Jumlah Baris
                  </Button>
                  <Button
                    type='default'
                    icon={<List size={14} />}
                    onClick={() => setActiveJuzAyah(item)}
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
        <Text type='secondary'>Memperbarui data juz...</Text>
      ) : null}

      <Modal
        title={activeJuz ? `Jumlah Baris Juz ${activeJuz.number}` : "Jumlah Baris Juz"}
        open={Boolean(activeJuz)}
        onCancel={() => setActiveJuz(null)}
        onOk={handleSaveLineCount}
        okText='Simpan'
        cancelText='Batal'
        confirmLoading={isSaving}
        destroyOnHidden
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            label='Jumlah Baris'
            name='line_count'
            rules={[
              { required: true, message: "Jumlah baris wajib diisi." },
              {
                type: "number",
                min: 0,
                message: "Jumlah baris harus angka >= 0.",
              },
            ]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

    </Space>
  );
};

export default Juz;
