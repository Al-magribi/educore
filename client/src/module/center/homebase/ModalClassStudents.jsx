import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Table,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  Spin,
  Empty,
  Grid,
  Card,
} from 'antd';
import { SearchOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import { useGetHomebaseClassStudentsQuery } from '../../../service/center/ApiHomebase';

const { Text, Title } = Typography;
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
              style={{ borderRadius: 999, width: 'fit-content', margin: 0 }}>
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
          <Tag color={value ? 'success' : 'default'} style={{ borderRadius: 999 }}>
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
      title={null}
      styles={{
        body: {
          padding: isMobile ? 16 : 20,
          background: '#f8fafc',
        },
      }}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, #0f172a, #1d4ed8 60%, #0f766e)',
          }}
          styles={{ body: { padding: 18 } }}>
          <Space align="start" size={14}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(255,255,255,0.14)',
                color: '#e0f2fe',
                fontSize: 18,
              }}>
              <TeamOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#f8fafc' }}>
                Siswa Kelas {classData?.name || '-'}
              </Title>
              <Text style={{ color: 'rgba(226,232,240,0.9)' }}>
                Filter berdasarkan nama, NIS, NISN, dan periode ajaran.
              </Text>
            </div>
          </Space>
        </Card>

        <Card variant="borderless" style={{ borderRadius: 18 }} styles={{ body: { padding: 16 } }}>
          <Space wrap size={[10, 10]} style={{ width: '100%' }}>
            <Input
              allowClear
              placeholder="Filter nama"
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: isMobile ? '100%' : 180 }}
            />
            <Input
              allowClear
              placeholder="Filter NIS"
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              style={{ width: isMobile ? '100%' : 140 }}
            />
            <Input
              allowClear
              placeholder="Filter NISN"
              value={nisn}
              onChange={(e) => setNisn(e.target.value)}
              style={{ width: isMobile ? '100%' : 140 }}
            />
            <Select
              style={{ width: isMobile ? '100%' : 220 }}
              value={selectedPeriodeId ? Number(selectedPeriodeId) : undefined}
              onChange={(val) => {
                setPeriodeId(val);
                setPage(1);
              }}
              placeholder="Pilih Periode"
              suffixIcon={<CalendarOutlined style={{ color: '#64748b' }} />}
              options={periods.map((p) => ({
                value: p.id,
                label: `${p.name}${p.is_active ? ' - Aktif' : ''}`,
              }))}
            />
          </Space>
        </Card>

        {isLoading ? (
          <div style={{ minHeight: 220, display: 'grid', placeItems: 'center' }}>
            <Spin size="large" />
          </div>
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
