import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Table,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  Skeleton,
  Empty,
  Grid,
} from 'antd';
import { SearchOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import { useGetHomebaseClassStudentsQuery } from '../../../service/center/ApiHomebase';
import { CardTitle } from '../../../components/ui/muse';
import { museColors } from '../../../config/theme';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ModalClassStudents = ({ open, homebaseId, classData, onCancel }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [periodeId, setPeriodeId] = useState(null);
  const [debounced, setDebounced] = useState({ name: '', nis: '', nisn: '' });

  useEffect(() => {
    if (!open) {
      setPage(1);
      setName('');
      setNis('');
      setNisn('');
      setPeriodeId(null);
      setDebounced({ name: '', nis: '', nisn: '' });
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced({ name: name.trim(), nis: nis.trim(), nisn: nisn.trim() });
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [name, nis, nisn]);

  const { data, isFetching, isLoading } = useGetHomebaseClassStudentsQuery(
    {
      homebase_id: homebaseId,
      class_id: classData?.id,
      periode_id: periodeId ?? undefined,
      name: debounced.name,
      nis: debounced.nis,
      nisn: debounced.nisn,
      page,
      limit: 10,
    },
    { skip: !open || !homebaseId || !classData?.id },
  );

  const periods = data?.periods || [];
  const selectedPeriodeId = periodeId ?? data?.selected_periode_id ?? undefined;
  const students = data?.data || [];
  const total = data?.total || 0;

  const columns = useMemo(
    () => [
      {
        title: 'NIS',
        dataIndex: 'nis',
        key: 'nis',
        width: 120,
        render: (value) => <Text strong>{value || '-'}</Text>,
      },
      {
        title: 'NISN',
        dataIndex: 'nisn',
        key: 'nisn',
        width: 130,
        render: (value) => value || '-',
      },
      {
        title: 'Nama',
        dataIndex: 'student_name',
        key: 'student_name',
        render: (value, record) => (
          <Space orientation="vertical" size={2}>
            <Text strong>{value || '-'}</Text>
            <Tag
              color={record.gender === 'L' ? 'blue' : record.gender === 'P' ? 'magenta' : 'default'}
              style={{ width: 'fit-content', margin: 0 }}>
              {record.gender === 'L' ? 'Laki Laki' : record.gender === 'P' ? 'Perempuan' : '-'}
            </Tag>
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'is_active',
        key: 'is_active',
        width: 110,
        render: (value) => (
          <Tag color={value ? 'success' : 'default'} style={{ margin: 0 }}>
            {value ? 'Aktif' : 'Nonaktif'}
          </Tag>
        ),
      },
    ],
    [],
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={isMobile ? '100%' : 920}
      destroyOnHidden
      title={
        <CardTitle
          icon={<TeamOutlined />}
          title={`Siswa Kelas ${classData?.name || '-'}`}
          description="Filter berdasarkan nama, NIS, NISN, dan periode ajaran."
        />
      }>
      <Space orientation="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
        <Space wrap size={[8, 8]} style={{ width: '100%' }}>
          <Input
            aria-label="Filter nama"
            allowClear
            placeholder="Filter nama"
            prefix={<SearchOutlined style={{ color: museColors.muted }} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: isMobile ? '100%' : 200 }}
          />
          <Input
            aria-label="Filter NIS"
            allowClear
            placeholder="Filter NIS"
            value={nis}
            onChange={(e) => setNis(e.target.value)}
            style={{ width: isMobile ? '100%' : 140 }}
          />
          <Input
            aria-label="Filter NISN"
            allowClear
            placeholder="Filter NISN"
            value={nisn}
            onChange={(e) => setNisn(e.target.value)}
            style={{ width: isMobile ? '100%' : 140 }}
          />
          <Select
            aria-label="Pilih periode"
            style={{ width: isMobile ? '100%' : 220 }}
            value={selectedPeriodeId ? Number(selectedPeriodeId) : undefined}
            onChange={(val) => {
              setPeriodeId(val);
              setPage(1);
            }}
            placeholder="Pilih Periode"
            prefix={<CalendarOutlined style={{ color: museColors.muted }} />}
            options={periods.map((p) => ({
              value: p.id,
              label: `${p.name}${p.is_active ? ' · Aktif' : ''}`,
            }))}
          />
        </Space>

        {isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : students.length === 0 ? (
          <Empty description="Tidak ada siswa pada filter / periode ini" />
        ) : (
          <Table
            rowKey="user_id"
            columns={columns}
            dataSource={students}
            loading={isFetching}
            pagination={{
              current: page,
              pageSize: 10,
              total,
              onChange: (nextPage) => setPage(nextPage),
              showSizeChanger: false,
              showTotal: (value) => `${value} siswa`,
            }}
            scroll={{ x: 640 }}
            size="middle"
          />
        )}
      </Space>
    </Modal>
  );
};

export default ModalClassStudents;
