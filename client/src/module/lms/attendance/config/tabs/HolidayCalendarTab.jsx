import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, Save, Trash2 } from 'lucide-react';
import {
  useBulkDeleteAttendanceHolidaysMutation,
  useDeleteAttendanceHolidayMutation,
  useGetAttendanceCalendarConfigQuery,
  useGetAttendanceHolidaysQuery,
  useSaveAttendanceHolidayMutation,
  useUpdateAttendanceCalendarConfigMutation,
} from '../../../../../service/lms/ApiAttendance';
import { innerCardStyle, itemVariants } from '../configShared';

const { Text, Paragraph } = Typography;
const MotionDiv = motion.div;

const ROLE_OPTIONS = [
  { value: 'all', label: 'Semua (siswa & guru)' },
  { value: 'student', label: 'Siswa saja' },
  { value: 'teacher', label: 'Guru saja' },
];

const ROLE_TAG_COLORS = {
  all: 'blue',
  student: 'green',
  teacher: 'purple',
};

const HolidayCalendarTab = () => {
  const currentYear = dayjs().year();
  const [calendarForm] = Form.useForm();
  const [holidayForm] = Form.useForm();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { data: configRes, isLoading: loadingConfig } = useGetAttendanceCalendarConfigQuery();
  const [updateCalendarConfig, { isLoading: savingConfig }] = useUpdateAttendanceCalendarConfigMutation();

  const {
    data: holidaysRes,
    isFetching: fetchingHolidays,
    refetch: refetchHolidays,
  } = useGetAttendanceHolidaysQuery({ year: filterYear });

  const [saveHoliday, { isLoading: savingHoliday }] = useSaveAttendanceHolidayMutation();
  const [deleteHoliday] = useDeleteAttendanceHolidayMutation();
  const [bulkDeleteHolidays, { isLoading: bulkDeleting }] = useBulkDeleteAttendanceHolidaysMutation();

  const calendarConfig = configRes?.data;
  const holidays = holidaysRes?.data || [];

  const calendarInitialValues = useMemo(
    () => ({
      skip_saturday: calendarConfig?.skip_saturday === true,
      skip_sunday: calendarConfig?.skip_sunday !== false,
    }),
    [calendarConfig],
  );

  useEffect(() => {
    calendarForm.setFieldsValue(calendarInitialValues);
  }, [calendarForm, calendarInitialValues]);

  const handleSaveCalendarConfig = async () => {
    try {
      const values = await calendarForm.validateFields();
      await updateCalendarConfig({
        skip_saturday: values.skip_saturday === true,
        skip_sunday: values.skip_sunday === true,
      }).unwrap();
      message.success('Pengaturan akhir pekan berhasil disimpan.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan pengaturan akhir pekan.');
    }
  };

  const openCreateHolidayModal = () => {
    setEditingHoliday(null);
    holidayForm.setFieldsValue({
      holiday_date: dayjs(`${filterYear}-01-01`),
      name: '',
      description: '',
      applies_to_role: 'all',
      is_active: true,
    });
    setHolidayModalOpen(true);
  };

  const openEditHolidayModal = (record) => {
    setEditingHoliday(record);
    holidayForm.setFieldsValue({
      holiday_date: dayjs(record.holiday_date),
      name: record.name,
      description: record.description || '',
      applies_to_role: record.applies_to_role || 'all',
      is_active: record.is_active !== false,
    });
    setHolidayModalOpen(true);
  };

  const handleSaveHoliday = async () => {
    try {
      const values = await holidayForm.validateFields();
      await saveHoliday({
        id: editingHoliday?.id,
        holiday_date: values.holiday_date.format('YYYY-MM-DD'),
        name: values.name,
        description: values.description || null,
        applies_to_role: values.applies_to_role,
        is_active: values.is_active === true,
      }).unwrap();
      setHolidayModalOpen(false);
      setEditingHoliday(null);
      message.success(editingHoliday ? 'Hari libur berhasil diperbarui.' : 'Hari libur berhasil ditambahkan.');
      refetchHolidays();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.data?.message || 'Gagal menyimpan hari libur.');
    }
  };

  const handleDeleteHoliday = (record) => {
    Modal.confirm({
      title: 'Hapus hari libur ini?',
      content: `${record.name} (${dayjs(record.holiday_date).format('DD MMM YYYY')})`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          await deleteHoliday(record.id).unwrap();
          message.success('Hari libur berhasil dihapus.');
          setSelectedRowKeys((prev) => prev.filter((key) => String(key) !== String(record.id)));
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus hari libur.');
          throw error;
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: `Hapus ${selectedRowKeys.length} hari libur terpilih?`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: bulkDeleting },
      onOk: async () => {
        try {
          const result = await bulkDeleteHolidays(selectedRowKeys).unwrap();
          message.success(result?.message || 'Hari libur terpilih berhasil dihapus.');
          setSelectedRowKeys([]);
          refetchHolidays();
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus hari libur terpilih.');
          throw error;
        }
      },
    });
  };

  const yearOptions = Array.from({ length: 5 }, (_, index) => {
    const year = currentYear - 1 + index;
    return { value: year, label: String(year) };
  });

  return (
    <Flex vertical gap={16}>
      <MotionDiv variants={itemVariants} initial="hidden" animate="show">
        <Card
          title="Libur Akhir Pekan"
          style={innerCardStyle}
          loading={loadingConfig}
          extra={
            <Button type="primary" icon={<Save size={14} />} loading={savingConfig} onClick={handleSaveCalendarConfig}>
              Simpan
            </Button>
          }>
          <Form form={calendarForm} layout="vertical" initialValues={calendarInitialValues}>
            <Flex gap={24} wrap="wrap">
              <Form.Item
                name="skip_saturday"
                label="Sabtu sebagai hari libur"
                valuePropName="checked"
                style={{ marginBottom: 0 }}>
                <Switch checkedChildren="Libur" unCheckedChildren="Masuk" />
              </Form.Item>
              <Form.Item
                name="skip_sunday"
                label="Minggu sebagai hari libur"
                valuePropName="checked"
                style={{ marginBottom: 0 }}>
                <Switch checkedChildren="Libur" unCheckedChildren="Masuk" />
              </Form.Item>
            </Flex>
            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              Default: Minggu libur, Sabtu masuk. Sesuaikan kebijakan sekolah Anda.
            </Paragraph>
          </Form>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants} initial="hidden" animate="show">
        <Card
          title="Daftar Libur Khusus"
          style={innerCardStyle}
          extra={
            <Flex gap={8} wrap="wrap">
              <Select value={filterYear} onChange={setFilterYear} options={yearOptions} style={{ width: 110 }} />
              <Button type="primary" icon={<Plus size={14} />} onClick={openCreateHolidayModal}>
                Tambah Libur
              </Button>
            </Flex>
          }>
          {selectedRowKeys.length > 0 && (
            <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
              <Text type="secondary">{selectedRowKeys.length} libur terpilih</Text>
              <Button danger icon={<Trash2 size={14} />} loading={bulkDeleting} onClick={handleBulkDelete}>
                Hapus Terpilih
              </Button>
            </Flex>
          )}

          <Table
            rowKey="id"
            size="small"
            loading={fetchingHolidays}
            dataSource={holidays}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            locale={{ emptyText: 'Belum ada libur khusus pada tahun ini.' }}
            columns={[
              {
                title: 'Tanggal',
                dataIndex: 'holiday_date',
                width: 130,
                render: (value) => dayjs(value).format('DD MMM YYYY'),
              },
              {
                title: 'Nama',
                dataIndex: 'name',
                ellipsis: true,
              },
              {
                title: 'Berlaku',
                dataIndex: 'applies_to_role',
                width: 120,
                render: (value) => <Tag color={ROLE_TAG_COLORS[value] || 'default'}>{value}</Tag>,
              },
              {
                title: 'Status',
                dataIndex: 'is_active',
                width: 90,
                render: (value) => (value !== false ? <Tag color="success">Aktif</Tag> : <Tag>Nonaktif</Tag>),
              },
              {
                title: 'Keterangan',
                dataIndex: 'description',
                ellipsis: true,
                render: (value) => value || '-',
              },
              {
                title: 'Aksi',
                width: 150,
                render: (_, record) => (
                  <Flex gap={8}>
                    <Button size="small" onClick={() => openEditHolidayModal(record)}>
                      Edit
                    </Button>
                    <Button size="small" danger onClick={() => handleDeleteHoliday(record)}>
                      Hapus
                    </Button>
                  </Flex>
                ),
              },
            ]}
          />
        </Card>
      </MotionDiv>

      <Modal
        title={editingHoliday ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
        open={holidayModalOpen}
        onCancel={() => {
          setHolidayModalOpen(false);
          setEditingHoliday(null);
        }}
        onOk={handleSaveHoliday}
        confirmLoading={savingHoliday}
        okText="Simpan"
        cancelText="Batal"
        destroyOnHidden>
        <Form form={holidayForm} layout="vertical">
          <Form.Item name="holiday_date" label="Tanggal" rules={[{ required: true, message: 'Tanggal wajib diisi.' }]}>
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="name" label="Nama Libur" rules={[{ required: true, message: 'Nama libur wajib diisi.' }]}>
            <Input placeholder="Contoh: Libur Nasional, Study Tour" />
          </Form.Item>
          <Form.Item name="applies_to_role" label="Berlaku Untuk">
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="Keterangan">
            <Input.TextArea rows={3} placeholder="Keterangan opsional" />
          </Form.Item>
          <Form.Item name="is_active" label="Status" valuePropName="checked">
            <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default HolidayCalendarTab;
