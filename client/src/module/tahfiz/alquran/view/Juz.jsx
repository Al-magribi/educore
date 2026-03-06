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
import { BookMarked, Flag, MoveRight, PencilLine } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { useUpdateJuzLineCountMutation } from "../../../../service/tahfiz/ApiAlquran";

const { Text, Title } = Typography;
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
  const [visibleSurahMap, setVisibleSurahMap] = React.useState({});
  const [updateJuzLineCount, { isLoading: isSaving }] =
    useUpdateJuzLineCountMutation();

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
      message.success(
        `Jumlah baris Juz ${activeJuz.number} berhasil disimpan.`,
      );
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
        type="error"
        showIcon
        message="Gagal memuat data juz."
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
      {isLoading ? (
        <Row gutter={[12, 12]}>
          {Array.from({ length: 6 }, (_, index) => (
            <Col xs={24} md={12} xl={8} key={index}>
              <Card style={{ borderRadius: 12 }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : null}

      {!isLoading && !data.length ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty description="Data juz tidak tersedia" />
        </Card>
      ) : null}

      <Row gutter={[12, 12]}>
        {data.map((item) => (
          <Col xs={24} md={12} xl={8} key={item.number}>
            <Card
              hoverable
              style={{
                borderRadius: 12,
                height: "100%",
                border: "1px solid #f0f0f0",
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
              }}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Space
                  align="center"
                  style={{ justifyContent: "space-between", width: "100%" }}
                >
                  <Tag color="gold">Juz {item.number}</Tag>
                  <Space size={6}>
                    <Tag icon={<BookMarked size={12} />} color="blue">
                      {item.verse_count || "-"} ayat
                    </Tag>
                    <Tag color="cyan">{item.line_count || "-"} baris</Tag>
                  </Space>
                </Space>

                <div>
                  <Text type="secondary">Awal Juz</Text>
                  <Title level={5} style={{ margin: "2px 0 0 0" }}>
                    Surah {item.start_surah_number} (
                    <span style={arabicTextStyle}>{item.start_surah_name}</span>
                    )
                  </Title>
                  <Text>Ayat {item.start_ayah}</Text>
                </div>

                <Space align="center" size={6}>
                  <MoveRight size={16} color="#8c8c8c" />
                  <Text type="secondary">Sampai</Text>
                </Space>

                <div>
                  <Text type="secondary">Akhir Juz</Text>
                  <Title level={5} style={{ margin: "2px 0 0 0" }}>
                    Surah {item.end_surah_number} (
                    <span style={arabicTextStyle}>{item.end_surah_name}</span>)
                  </Title>
                  <Text>Ayat {item.end_ayah}</Text>
                </div>

                <div>
                  <Space
                    align="center"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Text type="secondary">Surah dalam Juz</Text>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => toggleSurahList(item.number)}
                      icon={
                        visibleSurahMap[item.number] ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )
                      }
                    >
                      {visibleSurahMap[item.number]
                        ? "Sembunyikan"
                        : "Tampilkan"}
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
                            {surah.number}.{" "}
                            <span style={arabicTagTextStyle}>{surah.name}</span>
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  ) : (
                    <Text
                      type="secondary"
                      style={{ marginTop: 4, display: "block" }}
                    >
                      {(item.surah_list || []).length} surah disembunyikan
                    </Text>
                  )}
                </div>

                <Tag icon={<Flag size={12} />} color="green">
                  Detail rentang juz lengkap
                </Tag>

                <Button
                  icon={<PencilLine size={14} />}
                  onClick={() => openLineCountModal(item)}
                >
                  Isi Jumlah Baris
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {isFetching && !isLoading ? (
        <Text type="secondary">Memperbarui data juz...</Text>
      ) : null}

      <Modal
        title={
          activeJuz
            ? `Jumlah Baris Juz ${activeJuz.number}`
            : "Jumlah Baris Juz"
        }
        open={Boolean(activeJuz)}
        onCancel={() => setActiveJuz(null)}
        onOk={handleSaveLineCount}
        okText="Simpan"
        cancelText="Batal"
        confirmLoading={isSaving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Jumlah Baris"
            name="line_count"
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
