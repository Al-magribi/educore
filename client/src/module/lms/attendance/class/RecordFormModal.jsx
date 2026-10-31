import { useEffect } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Form, Input, Modal, Select, TimePicker, message } from 'antd';
import { useSaveClassAttendanceRecordMutation } from '../../../../service/lms/ApiAttendance';
import { modalWidth } from '../report/reportShared';
import { CLASS_STATUS_OPTIONS, timeOnly } from './classAttendanceShared';

const toTimeValue = (value) => {
  const text = timeOnly(value);
  return text ? dayjs(`2000-01-01T${text}`) : null;
};

const RecordFormModal = ({ open, record, students, onClose, isMobile }) => {
  const [form] = Form.useForm();
  const [saveRecord, { isLoading }] = useSaveClassAttendanceRecordMutation();
  const isEdit = Boolean(record);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(
      record
        ? {
            attendance_status: record.attendance_status,
            checkin_time: toTimeValue(record.checkin_at),
            checkout_time: toTimeValue(record.checkout_at),
            notes: record.notes || '',
          }
        : { attendance_date: dayjs(), attendance_status: 'excused' },
    );
  }, [open, record, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const body = {
      attendance_status: values.attendance_status,
      checkin_time: values.checkin_time ? values.checkin_time.format('HH:mm') : null,
      checkout_time: values.checkout_time ? values.checkout_time.format('HH:mm') : null,
      notes: values.notes || '',
    };

    try {
      const result = await saveRecord(
        isEdit
          ? { id: record.id, ...body }
          : {
              ...body,
              user_id: values.user_id,
              attendance_date: values.attendance_date.format('YYYY-MM-DD'),
            },
      ).unwrap();
      message.success(result?.message || 'Data presensi berhasil disimpan.');
      onClose();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan data presensi.');
    }
  };

  return (
    <Modal
      title={isEdit ? `Edit Presensi ${record.full_name}` : 'Tambah Presensi'}
      centered
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isLoading}
      okText="Simpan"
      cancelText="Batal"
      width={modalWidth(isMobile, 520)}>
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        {!isEdit && (
          <>
            <Form.Item
              name="user_id"
              label="Siswa"
              rules={[{ required: true, message: 'Siswa wajib dipilih.' }]}>
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                virtual={false}
                placeholder="Pilih siswa"
                options={students.map((item) => ({
                  value: item.user_id,
                  label: item.full_name,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="attendance_date"
              label="Tanggal"
              rules={[{ required: true, message: 'Tanggal wajib dipilih.' }]}>
              <DatePicker
                inputReadOnly={isMobile}
                format="DD/MM/YYYY"
                disabledDate={(value) => value && value.isAfter(dayjs(), 'day')}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </>
        )}
        <Form.Item
          name="attendance_status"
          label="Status"
          rules={[{ required: true, message: 'Status wajib dipilih.' }]}>
          <Select virtual={false} options={CLASS_STATUS_OPTIONS} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <Form.Item name="checkin_time" label="Jam datang">
            <TimePicker inputReadOnly={isMobile} format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="checkout_time"
            label="Jam pulang"
            dependencies={['checkin_time']}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  const checkin = getFieldValue('checkin_time');
                  if (value && checkin && value.isBefore(checkin, 'minute')) {
                    return Promise.reject(new Error('Tidak boleh sebelum jam datang.'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}>
            <TimePicker inputReadOnly={isMobile} format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="notes" label="Catatan" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={3} placeholder="Contoh: sakit, surat dokter menyusul" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RecordFormModal;
