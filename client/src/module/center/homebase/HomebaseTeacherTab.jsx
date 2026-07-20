import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Divider,
  Dropdown,
  Empty,
  Flex,
  Grid,
  Input,
  List,
  Modal,
  message,
  Pagination,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import TeacherForm from '../../admin/academic/teacher/TeacherForm';
import {
  useAddHomebaseTeacherMutation,
  useDeleteHomebaseTeacherMutation,
  useGetHomebaseOptionsQuery,
  useGetHomebaseTeachersQuery,
  useUpdateHomebaseTeacherMutation,
} from '../../../service/center/ApiHomebase';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const TeachingAllocations = ({ allocations, compact = false }) => {
  const groupedData = useMemo(() => {
    if (!allocations || allocations.length === 0) return [];
    const map = {};
    allocations.forEach((item) => {
      const subjectName = item.subject_name || 'Lainnya';
      if (!map[subjectName]) {
        map[subjectName] = [];
      }
      map[subjectName].push(item.class_name || 'Semua Kelas');
    });
    return Object.entries(map);
  }, [allocations]);

  if (groupedData.length === 0) {
    return <Text type="secondary">-</Text>;
  }

  const content = (
    <Flex vertical gap="small" style={{ maxWidth: 250 }}>
      {groupedData.map(([subject, classes]) => (
        <div key={subject}>
          <Text strong>{subject}</Text>
          <br />
          <Text type="secondary">Mengajar di: {classes.join(', ')}</Text>
        </div>
      ))}
    </Flex>
  );

  return (
    <Popover content={content} title="Detail Mengajar" trigger="hover">
      <Flex vertical gap="small">
        {groupedData.slice(0, compact ? 1 : 2).map(([subject, classes]) => (
          <Text key={subject} ellipsis>
            <ReadOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            {subject} ({classes.length} kelas)
          </Text>
        ))}
        {groupedData.length > (compact ? 1 : 2) && (
          <Text type="secondary">+{groupedData.length - (compact ? 1 : 2)} mapel lainnya...</Text>
        )}
      </Flex>
    </Popover>
  );
};

const TeacherDetailModal = ({ open, teacher, onCancel }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const allocationGroups = useMemo(() => {
    const allocations = teacher?.allocations || [];
    if (!allocations.length) return [];

    const map = {};
    allocations.forEach((item) => {
      const subjectName = item.subject_name || 'Lainnya';
      if (!map[subjectName]) map[subjectName] = [];
      map[subjectName].push(item.class_name || 'Semua Kelas');
    });
    return Object.entries(map);
  }, [teacher?.allocations]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={isMobile ? '100%' : 720}
      destroyOnHidden
      title={null}
      styles={{
        body: {
          padding: isMobile ? 16 : 20,
          background: '#f8fafc',
        },
      }}>
      {!teacher ? (
        <Empty description="Data guru tidak tersedia" />
      ) : (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0f172a, #1d4ed8 60%, #0f766e)',
            }}
            styles={{ body: { padding: 18 } }}>
            <Flex align="center" gap={14}>
              <Avatar
                size={56}
                src={teacher.img_url}
                icon={<UserOutlined />}
                style={{ background: 'rgba(255,255,255,0.18)', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <Title level={4} style={{ margin: 0, color: '#f8fafc' }} ellipsis>
                  {teacher.full_name || '-'}
                </Title>
                <Text style={{ color: 'rgba(226,232,240,0.9)' }}>@{teacher.username || '-'}</Text>
              </div>
            </Flex>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 18 }} styles={{ body: { padding: 16 } }}>
            <Descriptions
              column={isMobile ? 1 : 2}
              size="small"
              styles={{ label: { color: '#64748b', fontWeight: 600 } }}>
              <Descriptions.Item label="NIP / NIY">{teacher.nip || '-'}</Descriptions.Item>
              <Descriptions.Item label="No RFID">{teacher.rfid_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="Telepon">{teacher.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{teacher.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Jenis Kelamin">
                {teacher.gender === 'L' ? 'Laki Laki' : teacher.gender === 'P' ? 'Perempuan' : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status Akun">
                <Tag color={teacher.is_active ? 'success' : 'default'} style={{ borderRadius: 999 }}>
                  {teacher.is_active ? 'Aktif' : 'Nonaktif'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Wali Kelas" span={2}>
                {teacher.is_homeroom || teacher.homeroom_class?.name ? (
                  <Tag icon={<TeamOutlined />} color="success" style={{ borderRadius: 999 }}>
                    {teacher.homeroom_class?.name || 'Wali Kelas'}
                  </Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            variant="borderless"
            title="Alokasi Mengajar"
            style={{ borderRadius: 18 }}
            styles={{ body: { padding: 16 } }}>
            {allocationGroups.length === 0 ? (
              <Empty description="Belum ada alokasi mengajar" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                {allocationGroups.map(([subject, classes]) => (
                  <Card
                    key={subject}
                    size="small"
                    style={{ borderRadius: 14, background: '#f8fafc' }}
                    styles={{ body: { padding: 12 } }}>
                    <Text strong>{subject}</Text>
                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary">Kelas: {classes.join(', ')}</Text>
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Space>
      )}
    </Modal>
  );
};

const ActionMenu = ({ record, onDetail, onEdit, onDelete, loadingDelete }) => {
  const items = [
    {
      key: 'detail',
      icon: <InfoCircleOutlined />,
      label: 'Detail',
      onClick: () => onDetail(record),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => onEdit(record),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Hapus',
      danger: true,
      disabled: loadingDelete,
      onClick: () => {
        Modal.confirm({
          title: 'Hapus Guru?',
          content: `Data guru ${record.full_name || ''} akan dihapus dan tidak dapat dibatalkan.`,
          okText: 'Ya, Hapus',
          cancelText: 'Batal',
          okButtonProps: { danger: true },
          onOk: () => onDelete(record.id),
        });
      },
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Button size="small">
        Aksi <DownOutlined />
      </Button>
    </Dropdown>
  );
};

const HomebaseTeacherTab = ({ homebaseId }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [detailTeacher, setDetailTeacher] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: teachersData,
    isFetching,
    isLoading,
    refetch,
  } = useGetHomebaseTeachersQuery(
    {
      id: homebaseId,
      page,
      limit: pageSize,
      search: debouncedSearch,
    },
    { skip: !homebaseId },
  );

  const { data: optionsData } = useGetHomebaseOptionsQuery(homebaseId, {
    skip: !homebaseId || !isModalOpen,
  });

  const [addTeacher, { isLoading: isAdding }] = useAddHomebaseTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateHomebaseTeacherMutation();
  const [deleteTeacher, { isLoading: isDeleting }] = useDeleteHomebaseTeacherMutation();

  const teachers = teachersData?.data || [];
  const total = teachersData?.total || 0;
  const classesData = optionsData?.classes || [];
  const subjectsData = optionsData?.subjects || [];

  const openCreate = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const openEdit = (teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const openDetail = (teacher) => {
    setDetailTeacher(teacher);
    setIsDetailOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setDetailTeacher(null);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTeacher({ homebase_id: homebaseId, id }).unwrap();
      message.success('Guru berhasil dihapus');
      const nextTotal = Math.max(total - 1, 0);
      const lastPage = Math.max(1, Math.ceil(nextTotal / pageSize));
      if (page > lastPage) {
        setPage(lastPage);
      } else {
        refetch();
      }
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus guru');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const formattedAllocations = [];
      if (values.allocations?.length) {
        values.allocations.forEach((group) => {
          if (group.class_ids?.length) {
            group.class_ids.forEach((classId) => {
              formattedAllocations.push({
                subject_id: group.subject_id,
                class_id: classId,
              });
            });
          }
        });
      }

      const payload = { ...values, allocations: formattedAllocations };

      if (editingTeacher) {
        await updateTeacher({
          homebase_id: homebaseId,
          id: editingTeacher.id,
          ...payload,
        }).unwrap();
        message.success('Data guru berhasil diperbarui');
      } else {
        await addTeacher({
          homebase_id: homebaseId,
          ...payload,
        }).unwrap();
        message.success('Guru baru berhasil ditambahkan');
      }

      closeModal();
      refetch();
    } catch (error) {
      message.error(error?.data?.message || 'Terjadi kesalahan saat menyimpan guru');
    }
  };

  const columns = [
    {
      title: 'Nama Guru',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 240,
      fixed: 'left',
      render: (text, record) => (
        <Flex align="center" gap={12}>
          <Avatar src={record.img_url} icon={<UserOutlined />} size={42} />
          <Flex vertical>
            <Text strong>{text}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              NIP: {record.nip || '-'}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'No RFID',
      dataIndex: 'rfid_no',
      key: 'rfid_no',
      width: 150,
      render: (value) => (
        <Text strong style={{ fontFamily: 'monospace' }}>
          {value || '-'}
        </Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_, record) => (
        <Space wrap size={[6, 6]}>
          {record.is_homeroom && (
            <Tag icon={<TeamOutlined />} color="success" style={{ borderRadius: 999 }}>
              Wali Kelas {record.homeroom_class?.name ? `· ${record.homeroom_class.name}` : ''}
            </Tag>
          )}
          <Tag
            color={record.gender === 'L' ? 'blue' : record.gender === 'P' ? 'magenta' : 'default'}
            style={{ borderRadius: 999 }}>
            {record.gender === 'L' ? 'Laki Laki' : record.gender === 'P' ? 'Perempuan' : '-'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Mengajar',
      dataIndex: 'allocations',
      key: 'allocations',
      width: 250,
      render: (allocations) => <TeachingAllocations allocations={allocations} />,
    },
    {
      title: 'Aksi',
      key: 'action',
      align: 'right',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <ActionMenu
          record={record}
          onDetail={openDetail}
          onEdit={openEdit}
          onDelete={handleDelete}
          loadingDelete={isDeleting}
        />
      ),
    },
  ];

  const displayedCount = teachers.length;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <>
      <Card
        variant="borderless"
        style={{
          borderRadius: 24,
          border: '1px solid rgba(148, 163, 184, 0.14)',
        }}
        styles={{ body: { padding: 16 } }}>
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
          <Space wrap size={[10, 10]} style={{ width: '100%', justifyContent: 'space-between' }}>
            <Input
              allowClear
              placeholder="Cari nama, NIP, RFID, atau kontak..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: isMobile ? '100%' : 360, width: isMobile ? '100%' : 360 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 999 }}>
              Tambah Guru
            </Button>
          </Space>

          <Flex wrap="wrap" gap={10} justify="space-between" align="center">
            <Text type="secondary">
              Menampilkan <Text strong>{displayedCount}</Text> data
              {total > 0 ? (
                <>
                  {' '}
                  (baris {rangeStart}-{rangeEnd} dari <Text strong>{total}</Text> total)
                </>
              ) : null}
            </Text>
            <Space size={8}>
              <Text type="secondary">Tampil per halaman</Text>
              <Select
                value={pageSize}
                style={{ width: 90 }}
                options={[
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                  { value: 50, label: '50' },
                ]}
                onChange={(value) => {
                  setPage(1);
                  setPageSize(value);
                }}
              />
            </Space>
          </Flex>

          {isMobile ? (
            <>
              <List
                dataSource={teachers}
                loading={isLoading || isFetching}
                locale={{ emptyText: <Empty description="Belum ada data guru pada homebase ini" /> }}
                renderItem={(record) => (
                  <List.Item style={{ padding: 0, marginBottom: 10 }}>
                    <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.18 }} style={{ width: '100%' }}>
                      <Card size="small" style={{ width: '100%', borderRadius: 18 }}>
                        <Flex justify="space-between" align="start" gap={10}>
                          <Space align="start">
                            <Avatar src={record.img_url} icon={<UserOutlined />} />
                            <Flex vertical>
                              <Text strong>{record.full_name}</Text>
                              <Text type="secondary">NIP: {record.nip || '-'}</Text>
                              <Text type="secondary">RFID: {record.rfid_no || '-'}</Text>
                            </Flex>
                          </Space>
                          <ActionMenu
                            record={record}
                            onDetail={openDetail}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            loadingDelete={isDeleting}
                          />
                        </Flex>
                        <Divider style={{ margin: '10px 0' }} />
                        <Flex vertical gap={8}>
                          {record.is_homeroom && (
                            <Tag
                              icon={<TeamOutlined />}
                              color="success"
                              style={{ width: 'fit-content', borderRadius: 999 }}>
                              Wali Kelas {record.homeroom_class?.name ? `· ${record.homeroom_class.name}` : ''}
                            </Tag>
                          )}
                          <TeachingAllocations allocations={record.allocations} compact />
                        </Flex>
                      </Card>
                    </MotionDiv>
                  </List.Item>
                )}
              />
              <Flex justify="center">
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(nextPage, nextSize) => {
                    setPage(nextPage);
                    setPageSize(nextSize || pageSize);
                  }}
                  showSizeChanger={false}
                  showTotal={(value) => `${value} guru`}
                />
              </Flex>
            </>
          ) : (
            <Table
              rowKey="id"
              columns={columns}
              dataSource={teachers}
              loading={isLoading || isFetching}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: false,
                showTotal: (items, range) => `Menampilkan ${range[0]}-${range[1]} dari ${items} data`,
              }}
              onChange={(pager) => {
                setPage(pager.current || 1);
                setPageSize(pager.pageSize || pageSize);
              }}
              size="middle"
              locale={{ emptyText: <Empty description="Belum ada data guru pada homebase ini" /> }}
            />
          )}
        </Space>
      </Card>

      <TeacherForm
        open={isModalOpen}
        onCancel={closeModal}
        onSubmit={handleSubmit}
        initialValues={editingTeacher}
        loading={isAdding || isUpdating}
        classesData={classesData}
        subjectsData={subjectsData}
      />

      <TeacherDetailModal open={isDetailOpen} teacher={detailTeacher} onCancel={closeDetail} />
    </>
  );
};

export default HomebaseTeacherTab;
