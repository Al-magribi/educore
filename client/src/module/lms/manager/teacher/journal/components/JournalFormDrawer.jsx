import React, { useEffect, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useGetChaptersQuery } from "../../../../../../service/lms/ApiLms";

const { Text, Title } = Typography;
const { TextArea } = Input;

const JournalFormDrawer = ({
  open,
  onClose,
  onReset,
  onSubmit,
  form,
  editingJournal,
  subjectId,
  subjectName,
  classOptions,
  isClassLoading,
  isMobile,
  isSaving,
}) => {
  const selectedClassId = Form.useWatch("class_id", form);

  const { data: chapterRes, isLoading: isChapterLoading } = useGetChaptersQuery(
    {
      subjectId,
      gradeId: null,
      classId: selectedClassId || null,
    },
    {
      skip: !subjectId || !selectedClassId,
    },
  );

  const chapterOptions = useMemo(() => {
    const chapters = chapterRes?.data || [];
    const options = [...chapters]
      .sort((a, b) => {
        const orderA = Number(a.order_number ?? 9999);
        const orderB = Number(b.order_number ?? 9999);
        if (orderA !== orderB) return orderA - orderB;
        return String(a.title || "").localeCompare(String(b.title || ""));
      })
      .map((item) => ({
        value: item.title,
        label: item.title,
      }));

    const savedMaterial = String(form.getFieldValue("learning_material") || "").trim();
    if (savedMaterial && !options.some((item) => item.value === savedMaterial)) {
      options.unshift({
        value: savedMaterial,
        label: `${savedMaterial} (tersimpan)`,
      });
    }

    return options;
  }, [chapterRes?.data, form]);

  useEffect(() => {
    if (!selectedClassId) {
      form.setFieldValue("learning_material", undefined);
      return;
    }

    const currentMaterial = String(form.getFieldValue("learning_material") || "").trim();
    if (!currentMaterial) return;

    const materialExists = chapterOptions.some(
      (item) => item.value === currentMaterial,
    );
    if (!materialExists) {
      form.setFieldValue("learning_material", undefined);
    }
  }, [chapterOptions, form, selectedClassId]);

  return (
    <Drawer
      title={editingJournal ? "Ubah Jurnal Mengajar" : "Input Jurnal Mengajar"}
      open={open}
      onClose={onClose}
      width={isMobile ? "100%" : 720}
      destroyOnHidden
      styles={{
        header: {
          padding: isMobile ? "16px 16px 0" : "20px 24px 0",
        },
        body: {
          padding: isMobile ? 16 : 24,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        },
      }}
    >
      <Space direction="vertical" size={18} style={{ width: "100%" }}>
        <Card
          bordered={false}
          style={{
            borderRadius: 18,
            background:
              "linear-gradient(135deg, #eff6ff 0%, #f8fbff 55%, #ffffff 100%)",
            border: "1px solid rgba(191, 219, 254, 0.7)",
            boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 16 : 18 } }}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <div>
              <Text type="secondary">Form Jurnal</Text>
              <Title level={5} style={{ margin: "4px 0 2px" }}>
                {editingJournal
                  ? "Perbarui catatan pembelajaran"
                  : "Buat catatan pembelajaran baru"}
              </Title>
              <Text type="secondary">
                Pilih kelas yang diampu, lalu materi pembelajaran akan mengikuti chapter untuk kelas tersebut.
              </Text>
            </div>
            <Tag
              color="blue"
              style={{
                marginRight: 0,
                borderRadius: 999,
                paddingInline: 12,
                height: 34,
                lineHeight: "32px",
              }}
            >
              {subjectName || "-"}
            </Tag>
          </Flex>
        </Card>

        <Card
          bordered={false}
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148, 163, 184, 0.14)",
            boxShadow: "0 16px 34px rgba(15, 23, 42, 0.05)",
          }}
          styles={{ body: { padding: isMobile ? 16 : 20 } }}
        >
          <Form form={form} layout="vertical">
            <Row gutter={[12, 4]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="date"
                  label="Tanggal"
                  rules={[{ required: true, message: "Tanggal wajib diisi." }]}
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD MMM YYYY"
                    allowClear={false}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="meeting_no"
                  label="Pertemuan"
                  rules={[{ required: true, message: "Pertemuan wajib diisi." }]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="class_id"
                  label="Kelas"
                  rules={[{ required: true, message: "Kelas wajib dipilih." }]}
                >
                  <Select
                    placeholder="Pilih kelas sesuai mapel dan guru"
                    options={classOptions}
                    loading={isClassLoading}
                    showSearch
                    optionFilterProp="label"
                    virtual={false}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="learning_material"
                  label="Materi Pembelajaran"
                  rules={[
                    {
                      required: true,
                      message: "Materi pembelajaran wajib dipilih.",
                    },
                  ]}
                  extra={
                    selectedClassId
                      ? "Materi diambil dari chapter yang tersedia untuk kelas ini."
                      : "Pilih kelas terlebih dahulu untuk memuat materi pembelajaran."
                  }
                >
                  <Select
                    placeholder={
                      selectedClassId
                        ? "Pilih materi dari chapter"
                        : "Pilih kelas terlebih dahulu"
                    }
                    options={chapterOptions}
                    loading={isChapterLoading}
                    disabled={!selectedClassId}
                    showSearch
                    optionFilterProp="label"
                    virtual={false}
                    notFoundContent={
                      selectedClassId
                        ? "Belum ada chapter untuk kelas ini."
                        : "Pilih kelas untuk menampilkan materi."
                    }
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="activity"
                  label="Kegiatan"
                  rules={[{ required: true, message: "Kegiatan wajib diisi." }]}
                >
                  <TextArea
                    rows={isMobile ? 6 : 8}
                    placeholder="Tuliskan rangkaian kegiatan belajar, metode, dan catatan penting pembelajaran."
                    maxLength={3000}
                    showCount
                  />
                </Form.Item>
              </Col>
            </Row>

            <Flex justify="end" gap={8} wrap="wrap">
              <Button onClick={onClose}>Batal</Button>
              <Button onClick={onReset}>Reset Form</Button>
              <Button
                type="primary"
                onClick={onSubmit}
                loading={isSaving}
                style={{
                  borderRadius: 12,
                  minWidth: isMobile ? 160 : 190,
                  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.18)",
                }}
              >
                {editingJournal ? "Simpan Perubahan" : "Simpan Jurnal"}
              </Button>
            </Flex>
          </Form>
        </Card>
      </Space>
    </Drawer>
  );
};

export default JournalFormDrawer;
