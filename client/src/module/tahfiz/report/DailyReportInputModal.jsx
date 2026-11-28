import { Col, DatePicker, Form, Row, Select, Typography } from "antd";
import { NotebookPen, Pencil } from "lucide-react";
import dayjs from "dayjs";

import { FormModal } from "../../../components/ui/muse/DataSection";

const { Text } = Typography;

const DailyReportInputModal = ({
  open,
  editingId,
  onCancel,
  form,
  onSubmit,
  students,
  activityTypes,
  surahs,
  maxStartAyat,
  maxEndAyat,
  startAyatOptions,
  endAyatOptions,
  loading,
}) => {
  const surahOptions = surahs.map((item) => ({
    value: item.id,
    label: `${item.number}. ${item.name_latin}`,
  }));

  return (
    <FormModal
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      icon={editingId ? <Pencil size={18} /> : <NotebookPen size={18} />}
      title={editingId ? "Edit Setoran Hafalan" : "Input Setoran Hafalan"}
      description='Isi siswa, jenis, dan rentang ayat yang disetorkan.'
      okText={editingId ? "Perbarui Setoran" : "Simpan Setoran"}
      confirmLoading={loading}
      width={760}
    >
      <Form form={form} layout='vertical' initialValues={{ date: dayjs() }} onFinish={onSubmit}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label='Siswa'
              name='student_id'
              rules={[{ required: true, message: "Siswa wajib dipilih." }]}
            >
              <Select
                options={students.map((item) => ({
                  value: item.student_id,
                  label: `${item.student_name} (${item.class_name || "-"})`,
                }))}
                placeholder='Pilih siswa'
                virtual={false}
                showSearch={{ optionFilterProp: "label" }}
                notFoundContent='Tidak ada siswa pada filter ini'
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              label='Tanggal'
              name='date'
              rules={[{ required: true, message: "Tanggal wajib diisi." }]}
            >
              <DatePicker style={{ width: "100%" }} format='DD MMM YYYY' />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              label='Jenis'
              name='type_id'
              rules={[{ required: true, message: "Jenis setoran wajib dipilih." }]}
            >
              <Select
                options={activityTypes.map((item) => ({ value: item.id, label: item.name }))}
                placeholder='Pilih jenis'
              />
            </Form.Item>
          </Col>
        </Row>

        <Text strong style={{ display: "block", marginBottom: 12 }}>
          Rentang Setoran
        </Text>
        <Row gutter={16}>
          <Col xs={16} md={12}>
            <Form.Item
              label='Surah Awal'
              name='start_surah_id'
              rules={[{ required: true, message: "Surah awal wajib dipilih." }]}
            >
              <Select
                showSearch={{ optionFilterProp: "label" }}
                virtual={false}
                options={surahOptions}
                placeholder='Pilih surah awal'
              />
            </Form.Item>
          </Col>
          <Col xs={8} md={12}>
            <Form.Item
              label='Ayat Awal'
              name='start_ayat'
              rules={[{ required: true, message: "Ayat awal wajib diisi." }]}
            >
              <Select
                placeholder={maxStartAyat ? "Ayat" : "Pilih surah dulu"}
                disabled={!maxStartAyat}
                options={startAyatOptions}
                showSearch={{ optionFilterProp: "label" }}
                virtual={false}
              />
            </Form.Item>
          </Col>
          <Col xs={16} md={12}>
            <Form.Item
              label='Surah Akhir'
              name='end_surah_id'
              rules={[{ required: true, message: "Surah akhir wajib dipilih." }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                showSearch={{ optionFilterProp: "label" }}
                virtual={false}
                options={surahOptions}
                placeholder='Pilih surah akhir'
              />
            </Form.Item>
          </Col>
          <Col xs={8} md={12}>
            <Form.Item
              label='Ayat Akhir'
              name='end_ayat'
              rules={[{ required: true, message: "Ayat akhir wajib diisi." }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder={maxEndAyat ? "Ayat" : "Pilih surah dulu"}
                disabled={!maxEndAyat}
                options={endAyatOptions}
                showSearch={{ optionFilterProp: "label" }}
                virtual={false}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </FormModal>
  );
};

export default DailyReportInputModal;
