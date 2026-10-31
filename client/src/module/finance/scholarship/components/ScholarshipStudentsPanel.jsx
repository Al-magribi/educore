import {
  Button,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Power, Trash2, UserPlus } from "lucide-react";

const { Text } = Typography;

const SYNC_WARNING =
  "Tagihan siswa akan disinkron ulang. Due tidak akan turun di bawah pembayaran confirmed/pending; jika beasiswa dicabut, tagihan yang sebelumnya ter-cover bisa naik kembali.";

const buildStudentOptionLabel = (item = {}) => {
  const name = item.full_name || item.student_name || `Siswa #${item.id}`;
  const className = item.class_name || "-";
  const nis = item.nis || "-";
  return `${name} · ${className} · NIS ${nis}`;
};

const ScholarshipStudentsPanel = ({
  scholarship,
  students = [],
  loading,
  optionsStudents = [],
  optionsLoading,
  periodes = [],
  grades = [],
  classes = [],
  studentFilter,
  onStudentFilterChange,
  onAssign,
  onDeactivate,
  onReactivate,
  onHardRemove,
  assigning,
  removing,
  toggling,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [assignForm] = Form.useForm();
  const scholarshipActive = scholarship?.is_active !== false;
  const busy = assigning || removing || toggling;

  if (!scholarship) {
    return <Empty description='Pilih beasiswa di tab Daftar terlebih dahulu' />;
  }

  const activeAssignedIds = new Set(
    students
      .filter((item) => item.is_active !== false)
      .map((item) => Number(item.student_id))
      .filter(Boolean),
  );
  const assignOptions = optionsStudents
    .filter((item) => !activeAssignedIds.has(Number(item.id)))
    .map((item) => ({
      value: Number(item.id),
      label: buildStudentOptionLabel(item),
    }));

  const handleAssign = async () => {
    if (!scholarshipActive) {
      message.warning(
        "Aktifkan beasiswa terlebih dahulu sebelum menambah penerima",
      );
      return;
    }
    try {
      const values = await assignForm.validateFields();
      await onAssign(values.student_ids || []);
      assignForm.resetFields();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.data?.message || "Gagal menambah penerima");
    }
  };

  const handleDeactivate = (record) => {
    Modal.confirm({
      title: `Nonaktifkan ${record.student_name}?`,
      content: SYNC_WARNING,
      okText: "Nonaktifkan",
      okButtonProps: { danger: true, loading: removing || toggling },
      cancelText: "Batal",
      onOk: () => onDeactivate([record.student_id]),
    });
  };

  const handleReactivate = (record) => {
    Modal.confirm({
      title: `Aktifkan kembali ${record.student_name}?`,
      content: SYNC_WARNING,
      okText: "Aktifkan",
      okButtonProps: { loading: toggling },
      cancelText: "Batal",
      onOk: () => onReactivate(record.student_id),
    });
  };

  const handleHardRemove = (record) => {
    Modal.confirm({
      title: `Hapus permanen ${record.student_name}?`,
      content: `${SYNC_WARNING} Riwayat assign penerima akan dihapus.`,
      okText: "Hapus permanen",
      okButtonProps: { danger: true, loading: removing },
      cancelText: "Batal",
      onOk: () => onHardRemove([record.student_id]),
    });
  };

  const columns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.nis || "-"} · {record.class_name || "-"} ·{" "}
            {record.grade_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 110,
      render: (value) => (
        <Tag color={value ? "green" : "default"} style={{ borderRadius: 999 }}>
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Periode terbaru",
      dataIndex: "periode_name",
      width: 160,
      render: (value) => value || "-",
    },
    {
      title: "Aksi",
      key: "action",
      width: isMobile ? 120 : 200,
      render: (_, record) => (
        <Space wrap size={4}>
          {record.is_active !== false ? (
            <Button
              size='small'
              icon={<Power size={14} />}
              disabled={busy || !scholarshipActive}
              onClick={() => handleDeactivate(record)}
            >
              {isMobile ? "" : "Nonaktif"}
            </Button>
          ) : (
            <Button
              size='small'
              type='primary'
              ghost
              icon={<Power size={14} />}
              disabled={busy || !scholarshipActive}
              onClick={() => handleReactivate(record)}
            >
              {isMobile ? "" : "Aktifkan"}
            </Button>
          )}
          <Button
            size='small'
            danger
            icon={<Trash2 size={14} />}
            disabled={busy}
            onClick={() => handleHardRemove(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Space direction='vertical' size={14} style={{ width: "100%" }}>
      <Flex justify='space-between' align='center' gap={8} wrap='wrap'>
        <div>
          <Text strong>{scholarship.name}</Text>
          <div>
            <Text type='secondary'>
              {students.filter((item) => item.is_active !== false).length}{" "}
              penerima aktif
              {!scholarshipActive ? " · beasiswa nonaktif" : ""}
            </Text>
          </div>
        </div>
      </Flex>

      <Form
        form={assignForm}
        layout={isMobile ? "vertical" : "inline"}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 16,
          background: "#f8fafc",
          border: "1px solid rgba(148,163,184,0.18)",
          opacity: scholarshipActive ? 1 : 0.7,
        }}
      >
        <Form.Item style={{ marginBottom: isMobile ? 8 : 0 }}>
          <Select
            allowClear
            placeholder='Periode'
            style={{ width: isMobile ? "100%" : 160 }}
            value={studentFilter.periode_id}
            onChange={(value) =>
              onStudentFilterChange({ ...studentFilter, periode_id: value })
            }
            options={periodes.map((item) => ({
              value: Number(item.id),
              label: item.name,
            }))}
            virtual={false}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: isMobile ? 8 : 0 }}>
          <Select
            allowClear
            placeholder='Tingkat'
            style={{ width: isMobile ? "100%" : 140 }}
            value={studentFilter.grade_id}
            onChange={(value) =>
              onStudentFilterChange({
                ...studentFilter,
                grade_id: value,
                class_id: undefined,
              })
            }
            options={grades.map((item) => ({
              value: Number(item.id),
              label: item.name,
            }))}
            virtual={false}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: isMobile ? 8 : 0 }}>
          <Select
            allowClear
            placeholder='Kelas'
            style={{ width: isMobile ? "100%" : 140 }}
            value={studentFilter.class_id}
            onChange={(value) =>
              onStudentFilterChange({ ...studentFilter, class_id: value })
            }
            options={classes.map((item) => ({
              value: Number(item.id),
              label: item.name,
            }))}
            virtual={false}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: isMobile ? 8 : 0 }}>
          <Input.Search
            allowClear
            placeholder='Cari siswa'
            style={{ width: isMobile ? "100%" : 180 }}
            value={studentFilter.search}
            onChange={(event) =>
              onStudentFilterChange({
                ...studentFilter,
                search: event.target.value,
              })
            }
          />
        </Form.Item>
        <Form.Item
          name='student_ids'
          rules={[{ required: true, message: "Pilih minimal satu siswa" }]}
          style={{
            marginBottom: isMobile ? 8 : 0,
            minWidth: isMobile ? "100%" : 260,
          }}
        >
          <Select
            mode='multiple'
            allowClear
            showSearch
            optionFilterProp='label'
            placeholder={
              assignOptions.length
                ? "Pilih siswa"
                : "Tidak ada siswa sesuai filter"
            }
            loading={optionsLoading}
            disabled={!scholarshipActive || busy}
            options={assignOptions}
            style={{ width: isMobile ? "100%" : 280 }}
            virtual={false}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type='primary'
            icon={<UserPlus size={14} />}
            loading={assigning}
            disabled={!scholarshipActive || busy}
            onClick={handleAssign}
          >
            Tambah
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey='id'
        loading={loading}
        dataSource={students}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 720 }}
        locale={{
          emptyText: <Empty description='Belum ada penerima beasiswa' />,
        }}
      />
    </Space>
  );
};

export default ScholarshipStudentsPanel;
