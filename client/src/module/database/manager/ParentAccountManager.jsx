import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Grid,
  Input,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Database,
  Link2,
  Pencil,
  Trash2,
  UserRoundCheck,
  Users,
} from "lucide-react";
import useDebounced from "../../../utils/useDebounced";
import {
  useCreateParentAccountMutation,
  useDeleteParentAccountMutation,
  useGetParentAccountsQuery,
  useGetParentReferenceStudentsQuery,
  useUpdateParentAccountMutation,
} from "../../../service/database/ApiDatabase";
import ParentAccountForm from "./ParentAccountForm";
import ParentImportDrawer from "./ParentImportDrawer";
import { downloadParentTemplate } from "./parentImportTemplate";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ParentAccountManager = ({ scope = "all" }) => {
  const screens = useBreakpoint();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const debouncedSearch = useDebounced(search, 400);

  const { data, isLoading, isFetching } = useGetParentAccountsQuery({
    page,
    limit: 10,
    search: debouncedSearch,
    scope,
  });
  const { data: referenceData, isFetching: isFetchingStudents } =
    useGetParentReferenceStudentsQuery({ scope });
  const [createParentAccount, { isLoading: isCreating }] =
    useCreateParentAccountMutation();
  const [updateParentAccount, { isLoading: isUpdating }] =
    useUpdateParentAccountMutation();
  const [deleteParentAccount, { isLoading: isDeleting }] =
    useDeleteParentAccountMutation();

  const isSaving = isCreating || isUpdating;
  const parentItems = data?.data || [];
  const summary = data?.summary || {
    total_parents: 0,
    active_parents: 0,
    total_student_links: 0,
    parents_with_multiple_students: 0,
  };
  const studentOptions = referenceData?.data || [];

  const mappedStudentOptions = useMemo(() => {
    const selectedStudentMap = new Map(
      (selectedParent?.students || []).map((item) => [
        item.student_id,
        {
          student_id: item.student_id,
          full_name: item.full_name,
          nis: item.nis,
          class_name: item.class_name,
        },
      ]),
    );
    const mergedStudents = [...studentOptions];

    selectedStudentMap.forEach((value, key) => {
      if (!mergedStudents.some((item) => item.student_id === key)) {
        mergedStudents.push(value);
      }
    });

    return mergedStudents.map((item) => ({
      value: item.student_id,
      label: `${item.full_name} (${item.nis || "-"})`,
      searchLabel: `${item.full_name} ${item.nis || ""} ${item.class_name || ""}`,
    }));
  }, [selectedParent, studentOptions]);

  const handleOpenCreate = () => {
    setSelectedParent(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (selectedParent) {
        await updateParentAccount({
          id: selectedParent.parent_user_id,
          scope,
          ...values,
        }).unwrap();
        message.success("Akun orang tua berhasil diperbarui.");
      } else {
        await createParentAccount({ ...values, scope }).unwrap();
        message.success("Akun orang tua berhasil dibuat.");
      }

      setIsFormOpen(false);
      setSelectedParent(null);
    } catch (error) {
      message.error(error?.data?.message || "Akun orang tua gagal disimpan.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteParentAccount({ id, scope }).unwrap();
      message.success("Akun orang tua berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Akun orang tua gagal dihapus.");
    }
  };

  const columns = [
    {
      title: "Nama Akun",
      key: "parent",
      render: (_, record) => (
        <Space vertical size={0}>
          <Text strong>{record.full_name}</Text>
          <Text type='secondary'>{record.username}</Text>
        </Space>
      ),
    },
    {
      title: "Kontak",
      key: "contact",
      responsive: ["md"],
      render: (_, record) => (
        <Space vertical size={0}>
          <Text>{record.phone || "-"}</Text>
          <Text type='secondary'>{record.email || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Relasi Siswa",
      key: "students",
      width: 260,
      render: (_, record) => (
        <Space vertical size={4}>
          <Tag color='blue'>{record.total_students} siswa</Tag>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {(record.students || [])
              .slice(0, 2)
              .map((item) => `${item.full_name} (${item.nis || "-"})`)
              .join(", ") || "-"}
            {record.total_students > 2
              ? ` +${record.total_students - 2} lainnya`
              : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 110,
      align: "center",
      render: (value) => (
        <Tag color={value ? "green" : "default"}>
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Button
            type='text'
            icon={<Pencil size={14} />}
            onClick={() => {
              setSelectedParent(record);
              setIsFormOpen(true);
            }}
          />
          <Popconfirm
            title='Hapus akun orang tua?'
            description='Akun login dan seluruh relasi siswa akan dihapus.'
            onConfirm={() => handleDelete(record.parent_user_id)}
          >
            <Button
              type='text'
              danger
              loading={isDeleting}
              icon={<Trash2 size={14} />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const summaryCards = [
    {
      key: "total",
      title: "Total Akun",
      value: summary.total_parents,
      icon: <Users size={16} />,
    },
    {
      key: "active",
      title: "Akun Aktif",
      value: summary.active_parents,
      icon: <UserRoundCheck size={16} />,
    },
  ];

  return (
    <Space vertical size={16} style={{ width: "100%" }}>
      <Alert
        type='info'
        showIcon
        icon={<Database size={16} />}
        title='Manajemen Akun Orang Tua'
        description='Admin dan wali kelas dapat membuat akun orang tua, menghubungkan satu akun ke lebih dari satu siswa, mengubah akses, dan import data dari Excel.'
      />

      <Row gutter={[16, 16]}>
        {summaryCards.map((item) => (
          <Col xs={24} sm={12} key={item.key}>
            <Card>
              <Statistic
                title={item.title}
                value={item.value}
                prefix={item.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Space
          orientation={screens.md ? "horizontal" : "vertical"}
          size={12}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder='Cari nama, username, telepon, email, nama siswa, atau NIS'
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            style={{ width: screens.md ? 420 : "100%" }}
          />

          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                downloadParentTemplate({ students: studentOptions })
              }
              loading={isFetchingStudents}
            >
              Template
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setIsImportOpen(true)}
            >
              Import Excel
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
            >
              Tambah Orang Tua
            </Button>
          </Space>
        </Space>
      </Card>

      <Card
        title='Daftar Akun Orang Tua'
        styles={{ body: { overflowX: "hidden" } }}
      >
        <Table
          rowKey='parent_user_id'
          loading={isLoading || isFetching}
          dataSource={parentItems}
          columns={columns}
          scroll={{ x: 960 }}
          expandable={{
            expandedRowRender: (record) => (
              <Space vertical size={8} style={{ width: "100%" }}>
                <Text strong>Siswa Terhubung</Text>
                <Row gutter={[12, 12]}>
                  {(record.students || []).map((item) => (
                    <Col xs={24} md={12} xl={8} key={item.student_id}>
                      <Card size='small'>
                        <Space vertical size={0}>
                          <Text strong>{item.full_name}</Text>
                          <Text type='secondary'>NIS: {item.nis || "-"}</Text>
                          <Text type='secondary'>
                            {item.grade_name || "-"} | {item.class_name || "-"}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Space>
            ),
          }}
          locale={{ emptyText: "Akun orang tua belum tersedia." }}
          pagination={{
            current: page,
            pageSize: 10,
            total: data?.meta?.total_data || 0,
            showSizeChanger: false,
            onChange: (nextPage) => setPage(nextPage),
          }}
        />
      </Card>

      <ParentAccountForm
        open={isFormOpen}
        onCancel={() => {
          setIsFormOpen(false);
          setSelectedParent(null);
        }}
        onSubmit={handleSubmit}
        loading={isSaving}
        parentRecord={selectedParent}
        studentOptions={mappedStudentOptions}
      />

      <ParentImportDrawer
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        studentOptions={studentOptions}
        scope={scope}
      />
    </Space>
  );
};

export default ParentAccountManager;
