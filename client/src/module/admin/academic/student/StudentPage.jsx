import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Avatar,
  Button,
  Divider,
  Empty,
  Flex,
  Grid,
  List,
  Popconfirm,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { Pencil, Trash2, User, UserCheck, Users } from 'lucide-react';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import {
  useGetStudentsQuery,
  useLazyExportStudentsQuery,
  useAddStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
} from '../../../../service/academic/ApiStudent';

import StudentForm from './StudentForm';
import ImportStudent from './ImportStudent';
import { downloadStudentExcel } from './studentImportTemplate';
import { StatCard } from '../../../../components/ui/muse';
import { DataListCard } from '../../../../components/ui/muse/DataSection';
import { museColors, museRadius } from '../../../../config/theme';

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const getAkademikLabel = (record) => {
  if (record.current_grade && record.current_class) {
    return `${record.current_grade} - ${record.current_class}`;
  }
  const latestClass = record.class_history?.[0];
  return latestClass ? `${latestClass.grade} - ${latestClass.class}` : 'Belum diatur';
};

const StudentAvatar = ({ record, size = 40 }) => (
  <Avatar
    size={size}
    icon={<User size={size === 40 ? 20 : 18} />}
    style={{
      background: record.gender === 'P' ? museColors.female : museColors.primary,
      flexShrink: 0,
    }}
  />
);

const StudentPage = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [accumulatedData, setAccumulatedData] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const loadMoreRef = useRef(null);
  const { data: apiData, isFetching } = useGetStudentsQuery({
    page,
    limit: 12,
    search,
  });

  const [fetchExport] = useLazyExportStudentsQuery();
  const [addStudent, { isLoading: isAdding }] = useAddStudentMutation();
  const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (apiData?.data) {
      if (page === 1) {
        setAccumulatedData(apiData.data);
      } else {
        setAccumulatedData((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const newUniqueItems = apiData.data.filter((item) => !existingIds.has(item.id));
          return [...prev, ...newUniqueItems];
        });
      }

      const currentCount = (page - 1) * 12 + apiData.data.length;
      setHasMore(currentCount < apiData.totalData);
    }
  }, [apiData, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
    setHasMore(true);
    setAccumulatedData([]);
  };

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching && hasMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, root: null },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isFetching, hasMore, accumulatedData.length]);

  const handleOpenDrawer = (record = null) => {
    setEditingItem(record);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const rfidNo =
        values.rfid_no === undefined || values.rfid_no === null || `${values.rfid_no}`.trim() === ''
          ? null
          : `${values.rfid_no}`.trim().toUpperCase();

      if (editingItem) {
        const payload = {
          full_name: values.full_name,
          nis: values.nis,
          nisn: values.nisn,
          rfid_no: rfidNo,
          gender: values.gender,
          is_active: values.is_active,
          class_id: values.class_id,
        };

        if (values.password && `${values.password}`.trim() !== "") {
          payload.password = `${values.password}`.trim();
        }

        await updateStudent({ id: editingItem.id, ...payload }).unwrap();
        setAccumulatedData((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...payload } : item)),
        );
        message.success('Data siswa berhasil diperbarui');
      } else {
        const payload = {
          username: values.username,
          password: values.password,
          full_name: values.full_name,
          nis: values.nis,
          nisn: values.nisn,
          rfid_no: rfidNo,
          gender: values.gender,
          class_id: values.class_id,
        };

        await addStudent(payload).unwrap();
        setPage(1);
        message.success('Siswa baru berhasil ditambahkan');
      }
      setIsDrawerOpen(false);
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan data siswa');
    }
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const result = await fetchExport().unwrap();
      const students = result?.data || [];
      downloadStudentExcel({
        students,
        classes: result?.classes || [],
      });
      message.success(
        students.length > 0
          ? `File berisi ${students.length} data siswa periode aktif siap diunduh.`
          : 'Template berhasil diunduh. Belum ada data siswa di periode aktif.',
      );
    } catch (error) {
      message.error(error?.data?.message || 'Gagal mengunduh data siswa.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImportFinish = () => {
    setPage(1);
    setHasMore(true);
    setAccumulatedData([]);
  };

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id).unwrap();
      setAccumulatedData((prev) => prev.filter((item) => item.id !== id));
      message.success('Data siswa berhasil dihapus');
    } catch {
      message.error('Gagal menghapus data siswa');
    }
  };

  const totalStudents = apiData?.totalData || 0;
  const activeStudents = accumulatedData.filter((item) => item.is_active).length;
  const loadedStudents = accumulatedData.length;
  const renderActions = (record, size) => (
    <Flex gap={4} justify="flex-end">
      <Tooltip title="Edit data">
        <Button
          size={size}
          type="text"
          aria-label="Edit data siswa"
          icon={<Pencil size={16} />}
          onClick={() => handleOpenDrawer(record)}
        />
      </Tooltip>
      <Popconfirm
        title={`Hapus ${record.full_name}?`}
        description="Riwayat akademik akan ikut terhapus."
        onConfirm={() => handleDelete(record.id)}
        okText="Ya, Hapus"
        cancelText="Batal"
        okButtonProps={{ danger: true, loading: isDeleting }}>
        <Tooltip title="Hapus data">
          <Button size={size} type="text" danger aria-label="Hapus data siswa" icon={<Trash2 size={16} />} />
        </Tooltip>
      </Popconfirm>
    </Flex>
  );

  const renderStatusTags = (record) => (
    <Flex gap={6} wrap="wrap">
      <Tag color={record.is_active ? 'success' : 'default'} style={{ margin: 0 }}>
        {record.is_active ? 'Aktif' : 'Nonaktif'}
      </Tag>
      <Tag color={record.gender === 'P' ? 'magenta' : 'blue'} style={{ margin: 0 }}>
        {record.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
      </Tag>
    </Flex>
  );

  const columns = [
    {
      title: 'PROFIL SISWA',
      dataIndex: 'full_name',
      key: 'profil',
      render: (text, record) => (
        <Flex align="center" gap={12}>
          <StudentAvatar record={record} />
          <div style={{ minWidth: 0 }}>
            <Text strong ellipsis style={{ display: 'block', maxWidth: 240 }}>
              {text}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              NIS {record.username || '-'} · RFID {record.rfid_no || '-'}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'AKADEMIK',
      key: 'akademik',
      render: (_, record) => (
        <div>
          <Text strong style={{ display: 'block' }}>
            {getAkademikLabel(record)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            NIS {record.nis || '-'}
            {record.nisn ? ` · NISN ${record.nisn}` : ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      width: 190,
      render: (_, record) => renderStatusTags(record),
    },
    {
      title: 'AKSI',
      key: 'aksi',
      width: 100,
      align: 'right',
      render: (_, record) => renderActions(record),
    },
  ];

  return (
    <>
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
        <div
          style={{
            display: 'grid',
            gap: isMobile ? 16 : 24,
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}>
          <StatCard title="Total Siswa" value={totalStudents} icon={<Users size={24} />} tone="primary" />
          <StatCard
            title="Aktif"
            value={activeStudents}
            note="Dari data yang sudah dimuat"
            icon={<UserCheck size={24} />}
            tone="success"
          />
        </div>

        <DataListCard
          flush={!isMobile}
          title="Daftar Siswa"
          count={totalStudents}
          unit="siswa"
          description={
            loadedStudents < totalStudents && !isMobile
              ? `${loadedStudents} dimuat, gulir untuk memuat lagi`
              : undefined
          }
          searchProps={{
            placeholder: 'Cari nama, NIS, NISN, atau RFID...',
            onChange: handleSearch,
          }}
          extra={
            <>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadExcel} loading={isDownloading}>
                Download
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => setIsImportOpen(true)}>
                Import
              </Button>
            </>
          }
          onAdd={() => handleOpenDrawer(null)}
          addLabel="Tambah Siswa">
          {isMobile ? (
            <List
              dataSource={accumulatedData}
              loading={isFetching && page === 1}
              locale={{
                emptyText: <Empty description="Belum ada data siswa. Tambahkan manual atau import Excel." />,
              }}
              renderItem={(record) => (
                <List.Item style={{ padding: 0, marginBottom: 12 }}>
                  <div
                    style={{
                      width: '100%',
                      padding: 16,
                      borderRadius: museRadius.card,
                      border: `1px solid ${museColors.divider}`,
                    }}>
                    <Flex justify="space-between" align="start" gap={10}>
                      <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                        <StudentAvatar record={record} size={36} />
                        <div style={{ minWidth: 0 }}>
                          <Text strong ellipsis style={{ display: 'block' }}>
                            {record.full_name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {getAkademikLabel(record)}
                          </Text>
                        </div>
                      </Flex>
                      {renderActions(record, 'small')}
                    </Flex>
                    <Divider style={{ margin: '12px 0' }} />
                    <Flex vertical gap={6}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        NIS {record.nis || '-'}
                        {record.nisn ? ` · NISN ${record.nisn}` : ''} · RFID {record.rfid_no || '-'}
                      </Text>
                      {renderStatusTags(record)}
                    </Flex>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Table
              dataSource={accumulatedData}
              columns={columns}
              pagination={false}
              rowKey="id"
              loading={isFetching && page === 1}
              sticky
              locale={{
                emptyText: 'Belum ada data siswa. Tambahkan manual atau import Excel.',
              }}
            />
          )}
          <div ref={loadMoreRef} style={{ height: 1, width: '100%' }} aria-hidden />
          {isFetching && page > 1 ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Text type="secondary">Memuat data...</Text>
            </div>
          ) : null}
          {!hasMore && accumulatedData.length > 0 ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Text type="secondary">Semua data siswa sudah dimuat</Text>
            </div>
          ) : null}
        </DataListCard>
      </MotionDiv>

      <StudentForm
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editingItem}
        isLoading={isAdding || isUpdating}
      />

      <ImportStudent
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onFinish={handleImportFinish}
      />
    </>
  );
};

export default StudentPage;
