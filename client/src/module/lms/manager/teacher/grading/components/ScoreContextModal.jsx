import React, { useEffect, useMemo, useState } from "react";
import { DatePicker, Form, Modal, Select, Typography } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const ScoreContextModal = ({
  open,
  title = "Pilih Tanggal & Bab",
  okText = "Lanjut",
  requireChapter = true,
  chapterOptional = false,
  chapters = [],
  period,
  initialDate,
  initialChapterId,
  confirmLoading = false,
  onCancel,
  onConfirm,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const chapterOptions = useMemo(
    () =>
      (chapters || []).map((chapter) => ({
        value: chapter.id,
        label: chapter.title,
      })),
    [chapters],
  );

  const periodStart = period?.start ? dayjs(period.start).startOf("day") : null;
  const periodEnd = period?.end ? dayjs(period.end).endOf("day") : null;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      date: initialDate ? dayjs(initialDate) : dayjs(),
      chapterId: initialChapterId,
    });
  }, [form, initialChapterId, initialDate, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const selectedDate = values.date;
      if (!selectedDate || !selectedDate.isValid()) {
        return;
      }
      const monthIndex = selectedDate.month();
      const payload = {
        date: selectedDate.format("YYYY-MM-DD"),
        monthId: selectedDate.format("YYYY-MM"),
        monthName: MONTH_NAMES_ID[monthIndex] || selectedDate.format("MMMM"),
        semester: monthIndex + 1 >= 7 ? 1 : 2,
        chapterId: values.chapterId || null,
      };
      setSubmitting(true);
      await onConfirm?.(payload);
    } catch (error) {
      // validation error — keep modal open
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      cancelText="Batal"
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading || submitting}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Pilih tanggal penilaian
        {requireChapter
          ? " dan bab"
          : chapterOptional
            ? " (bab opsional)"
            : ""}
        .
      </Text>
      <Form form={form} layout="vertical">
        <Form.Item
          name="date"
          label="Tanggal"
          rules={[{ required: true, message: "Tanggal wajib dipilih." }]}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            disabledDate={(current) => {
              if (!current || !periodStart || !periodEnd) return false;
              return (
                current.isBefore(periodStart, "day") ||
                current.isAfter(periodEnd, "day")
              );
            }}
          />
        </Form.Item>
        {(requireChapter || chapterOptional) && (
          <Form.Item
            name="chapterId"
            label="Bab"
            rules={
              requireChapter
                ? [{ required: true, message: "Bab wajib dipilih." }]
                : []
            }
          >
            <Select
              allowClear={chapterOptional || !requireChapter}
              placeholder={requireChapter ? "Pilih bab" : "Bab (opsional)"}
              options={chapterOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ScoreContextModal;
