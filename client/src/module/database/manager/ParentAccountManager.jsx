import React, { useMemo, useState } from "react";
import {
  Alert,
  App,
  Avatar,
  Button,
  Divider,
  Empty,
  Flex,
  Grid,
  List,
  Pagination,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { Link2, Mail, Phone, UserRound, UserRoundCheck, Users, UsersRound } from "lucide-react";
import useDebounced from "../../../utils/useDebounced";
import {
  useCreateParentAccountMutation,
  useDeleteParentAccountMutation,
  useGetParentAccountsQuery,
  useGetParentReferenceStudentsQuery,
  useUpdateParentAccountMutation,
} from "../../../service/database/ApiDatabase";
import { StatCard } from "../../../components/ui/muse";
import { DataListCard, EditDeleteActions } from "../../../components/ui/muse/DataSection";
import { museColors, museRadius } from "../../../config/theme";
import ParentAccountForm from "./ParentAccountForm";
import ParentImportDrawer from "./ParentImportDrawer";
import { downloadParentTemplate } from "./parentImportTemplate";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const PAGE_SIZE = 10;

const ParentAvatar = ({ size = 40 }) => (
  <Avatar
    size={size}
    icon={<UserRound size={Math.round(size / 2)} />}
    style={{ background: museColors.navy, flexShrink: 0 }}
  />
);

const LinkedStudents = ({ students = [], max = 2 }) => {
  if (!students.length) {
    return <Text type='secondary'>Belum terhubung</Text>;
  }

  const visible = students.slice(0, max);
  const rest = students.slice(max);

  return (
    <Flex gap={6} wrap>
      {visible.map((item) => (
        <Tag key={item.student_id} color='blue' style={{ margin: 0 }}>
          {item.full_name}
          {item.class_name ? ` · ${item.class_name}` : ""}
        </Tag>
      ))}
      {rest.length ? (
        <Tooltip title={rest.map((item) => item.full_name).join(", ")}>
          <Tag style={{ margin: 0, cursor: "help" }}>+{rest.length} lainnya</Tag>
        </Tooltip>
      ) : null}
    </Flex>
  );
};

const StatusTag = ({ active }) => (
  <Tag color={active ? "success" : "default"} style={{ margin: 0 }}>
    {active ? "Aktif" : "Nonaktif"}
  </Tag>
);

const ParentAccountManager = ({ scope = "all" }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const debouncedSearch = useDebounced(search, 400);

  const { data, isLoading, isFetching, error } = useGetParentAccountsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    scope,
  });
  const { data: referenceData, isFetching: isFetchingStudents } =
    useGetParentReferenceStudentsQuery({ scope });
  const [createParentAccount, { isLoading: isCreating }] = useCreateParentAccountMutation();
  const [updateParentAccount, { isLoading: isUpdating }] = useUpdateParentAccountMutation();
  const [deleteParentAccount, { isLoading: isDeleting }] = useDeleteParentAccountMutation();

  const parentItems = data?.data || [];
  const totalData = data?.meta?.total_data || 0;
  const summary = data?.summary || {};
  const studentOptions = useMemo(() => referenceData?.data || [], [referenceData]);

  const mappedStudentOptions = useMemo(() => {
    const merged = [...studentOptions];
    (selectedParent?.students || []).forEach((item) => {
      if (!merged.some((option) => option.student_id === item.student_id)) {
        merged.push(item);
      }
    });

    return merged.map((item) => ({
      value: item.student_id,
      label: `${item.full_name} (${item.nis || "-"})${item.class_name ? ` · ${item.class_name}` : ""}`,
    }));
  }, [selectedParent, studentOptions]);

  const openForm = (record = null) => {
    setSelectedParent(record);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedParent(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (selectedParent) {
        await updateParentAccount({ id: selectedParent.parent_user_id, scope, ...values }).unwrap();
        message.success("Akun orang tua berhasil diperbarui");
      } else {
        await createParentAccount({ ...values, scope }).unwrap();
        message.success("Akun orang tua berhasil dibuat");
      }
      closeForm();
    } catch (err) {
      message.error(err?.data?.message || "Akun orang tua gagal disimpan");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteParentAccount({ id, scope }).unwrap();
      message.success("Akun orang tua berhasil dihapus");
    } catch (err) {
      message.error(err?.data?.message || "Akun orang tua gagal dihapus");
    }
  };

  const renderActions = (record) => (
    <Flex gap={4} justify='flex-end'>
      <EditDeleteActions
        onEdit={() => openForm(record)}
        onDelete={() => handleDelete(record.parent_user_id)}
        deleteTitle={`Hapus akun ${record.full_name}?`}
        deleteDescription='Akun login dan seluruh relasi siswa akan dihapus.'
        deleting={isDeleting}
      />
    </Flex>
  );

  const columns = [
    {
      title: "AKUN ORANG TUA",
      key: "parent",
      render: (_, record) => (
        <Flex align='center' gap={12}>
          <ParentAvatar />
          <div style={{ minWidth: 0 }}>
            <Text strong ellipsis style={{ display: "block", maxWidth: 240 }}>
              {record.full_name}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              @{record.username || "-"}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: "KONTAK",
      key: "contact",
      render: (_, record) => (
        <div>
          <Text style={{ display: "block" }}>{record.phone || "-"}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.email || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "SISWA TERHUBUNG",
      key: "students",
      render: (_, record) => <LinkedStudents students={record.students} />,
    },
    {
      title: "STATUS",
      dataIndex: "is_active",
      key: "is_active",
      width: 110,
      render: (value) => <StatusTag active={value} />,
    },
    {
      title: "AKSI",
      key: "action",
      width: 100,
      align: "right",
      render: (_, record) => renderActions(record),
    },
  ];

  const paginationProps = {
    current: page,
    pageSize: PAGE_SIZE,
    total: totalData,
    showSizeChanger: false,
    showLessItems: isMobile,
    size: isMobile ? "small" : "default",
    showTotal: isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} dari ${total} akun`,
    onChange: setPage,
  };

  const emptyText = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        debouncedSearch
          ? "Tidak ada akun yang cocok dengan pencarian."
          : "Belum ada akun orang tua. Tambahkan manual atau import dari Excel."
      }
    />
  );

  return (
    <>
      <Flex vertical gap={isMobile ? 16 : 24}>
        <div
          style={{
            display: "grid",
            gap: isMobile ? 16 : 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <StatCard title='Total Akun' value={summary.total_parents || 0} icon={<Users size={24} />} />
          <StatCard
            title='Akun Aktif'
            value={summary.active_parents || 0}
            note='Dapat dipakai untuk login'
            icon={<UserRoundCheck size={24} />}
            tone='success'
          />
          <StatCard
            title='Relasi Siswa'
            value={summary.total_student_links || 0}
            note='Koneksi akun ke siswa'
            icon={<Link2 size={24} />}
            tone='cyan'
          />
          <StatCard
            title='Akun Multi-Siswa'
            value={summary.parents_with_multiple_students || 0}
            note='Terhubung ke lebih dari 1 siswa'
            icon={<UsersRound size={24} />}
            tone='purple'
          />
        </div>

        <DataListCard
          icon={<Users size={16} />}
          title='Akun Orang Tua'
          count={totalData}
          unit='akun'
          searchProps={{
            placeholder: "Cari nama, username, kontak, atau siswa",
            value: search,
            onChange: (event) => {
              setSearch(event.target.value);
              setPage(1);
            },
          }}
          extra={
            <>
              <Button
                icon={<DownloadOutlined />}
                loading={isFetchingStudents}
                onClick={() => downloadParentTemplate({ students: studentOptions })}
              >
                Template
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => setIsImportOpen(true)}>
                Import
              </Button>
            </>
          }
          onAdd={() => openForm(null)}
          addLabel='Tambah Akun'
        >
          {error ? (
            <div style={{ padding: isMobile ? 16 : 24 }}>
              <Alert
                type='error'
                showIcon
                title='Gagal memuat akun orang tua'
                description={error?.data?.message || "Coba muat ulang halaman."}
              />
            </div>
          ) : isMobile ? (
            <div style={{ padding: 16 }}>
              <List
                dataSource={parentItems}
                loading={isLoading || isFetching}
                locale={{ emptyText }}
                renderItem={(record) => (
                  <List.Item style={{ padding: 0, marginBottom: 12, border: 0 }}>
                    <div
                      style={{
                        width: "100%",
                        padding: 16,
                        borderRadius: museRadius.card,
                        border: `1px solid ${museColors.divider}`,
                      }}
                    >
                      <Flex justify='space-between' align='start' gap={8}>
                        <Flex align='center' gap={12} style={{ minWidth: 0 }}>
                          <ParentAvatar size={36} />
                          <div style={{ minWidth: 0 }}>
                            <Text strong ellipsis style={{ display: "block" }}>
                              {record.full_name}
                            </Text>
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              @{record.username || "-"}
                            </Text>
                          </div>
                        </Flex>
                        {renderActions(record)}
                      </Flex>
                      <Divider style={{ margin: "12px 0" }} />
                      <Flex vertical gap={8}>
                        <Flex gap={12} wrap>
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            <Phone size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                            {record.phone || "-"}
                          </Text>
                          <Text type='secondary' style={{ fontSize: 12 }} ellipsis>
                            <Mail size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                            {record.email || "-"}
                          </Text>
                        </Flex>
                        <LinkedStudents students={record.students} />
                        <div>
                          <StatusTag active={record.is_active} />
                        </div>
                      </Flex>
                    </div>
                  </List.Item>
                )}
              />
              {totalData > PAGE_SIZE ? (
                <Flex justify='center'>
                  <Pagination {...paginationProps} />
                </Flex>
              ) : null}
            </div>
          ) : (
            <Table
              rowKey='parent_user_id'
              loading={isLoading || isFetching}
              dataSource={parentItems}
              columns={columns}
              scroll={{ x: 960 }}
              locale={{ emptyText }}
              pagination={{ ...paginationProps, style: { padding: "0 24px" } }}
            />
          )}
        </DataListCard>
      </Flex>

      <ParentAccountForm
        open={isFormOpen}
        onCancel={closeForm}
        onSubmit={handleSubmit}
        loading={isCreating || isUpdating}
        parentRecord={selectedParent}
        studentOptions={mappedStudentOptions}
      />

      <ParentImportDrawer
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        studentOptions={studentOptions}
        scope={scope}
      />
    </>
  );
};

export default ParentAccountManager;
