import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useGetTeacherJournalsQuery } from "../../../../../../service/lms/ApiJournal";

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
  const appliedMeetingClassRef = useRef(null);
  const [meetingSyncKey, setMeetingSyncKey] = useState(0);

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

  const { data: classJournalRes, isFetching: isMeetingLoading } =
    useGetTeacherJournalsQuery(
      {
        subjectId,
        classId: selectedClassId || null,
      },
      {
        skip: !open || !subjectId || !selectedClassId,
      },
    );

  const nextMeetingNo = useMemo(() => {
    const journals = classJournalRes?.data || [];
    if (!journals.length) return 1;

    const maxMeeting = journals.reduce((max, item) => {
      if (
        editingJournal?.id &&
        Number(item.id) === Number(editingJournal.id)
      ) {
        return max;
      }
      const meetingNo = Number(item.meeting_no) || 0;
      return meetingNo > max ? meetingNo : max;
    }, 0);

    return maxMeeting + 1;
  }, [classJournalRes?.data, editingJournal?.id]);

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
    if (!open) {
      appliedMeetingClassRef.current = null;
      return;
    }

    if (!selectedClassId) {
      form.setFieldValue("meeting_no", undefined);
      form.setFieldValue("learning_material", undefined);
      appliedMeetingClassRef.current = null;
      return;
    }

    if (isMeetingLoading) return;

    if (
      Number(appliedMeetingClassRef.current) === Number(selectedClassId)
    ) {
      return;
    }

    const keepEditingMeeting =
      editingJournal &&
      Number(editingJournal.class_id) === Number(selectedClassId);

    form.setFieldValue(
      "meeting_no",
      keepEditingMeeting
        ? Number(editingJournal.meeting_no)
        : nextMeetingNo,
    );
    appliedMeetingClassRef.current = selectedClassId;
  }, [
    editingJournal,
    form,
    isMeetingLoading,
    meetingSyncKey,
    nextMeetingNo,
    open,
    selectedClassId,
  ]);

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

  const handleReset = () => {
    appliedMeetingClassRef.current = null;
    onReset?.();
    setMeetingSyncKey((key) => key + 1);
  };

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
                Pilih kelas terlebih dahulu. Nomor pertemuan dihitung otomatis dari jurnal kelas tersebut.
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
                    allowClear
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="meeting_no"
                  label="Pertemuan"
                  rules={[{ required: true, message: "Pertemuan wajib diisi." }]}
                  extra={
                    selectedClassId
                      ? "Dihitung otomatis dari jumlah jurnal kelas ini (bisa diubah)."
                      : "Pilih kelas terlebih dahulu untuk menghitung pertemuan."
                  }
                >
                  <InputNumber
                    min={1}
                    style={{ width: "100%" }}
                    disabled={!selectedClassId}
                    placeholder={
                      selectedClassId
                        ? isMeetingLoading
                          ? "Menghitung..."
                          : "Nomor pertemuan"
                        : "Pilih kelas dulu"
                    }
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

            <Flex
              justify={isMobile ? "stretch" : "end"}
              gap={8}
              wrap='wrap'
              vertical={isMobile}
            >
              <Button onClick={onClose} block={isMobile}>
                Batal
              </Button>
              <Button onClick={handleReset} block={isMobile}>
                Reset Form
              </Button>
              <Button
                type='primary'
                onClick={onSubmit}
                loading={isSaving}
                block={isMobile}
                style={{
                  borderRadius: 12,
                  minWidth: isMobile ? undefined : 190,
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
