import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Grid,
  Input,
  Modal,
  Select,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { AlertTriangle, ClipboardX, RefreshCw, ScanLine, Search, Trash2 } from 'lucide-react';
import {
  useBulkDeleteAttendanceScanLogsMutation,
  useDeleteAttendanceScanLogMutation,
  useGetAttendanceScanLogReportQuery,
  useGetRfidDevicesQuery,
} from '../../../../../service/lms/ApiAttendance';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const surfaceCardStyle = {
  borderRadius: 22,
  border: '1px solid #e5edf6',
  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.06)',
};

const statCardStyle = {
  borderRadius: 18,
  border: '1px solid #e2ebf5',
  background: '#ffffff',
  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
};

const RESULT_STATUS_COLORS = {
  accepted: 'green',
  duplicate: 'gold',
  rejected: 'red',
  out_of_window: 'volcano',
  card_inactive: 'orange',
  device_inactive: 'orange',
  user_inactive: 'magenta',
  policy_missing: 'purple',
  not_scheduled: 'blue',
};

const formatScanTimeCell = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YY HH:mm') : value;
};

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};

const formatRawPayload = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

const ScanLogReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [range, setRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [deviceId, setDeviceId] = useState();
  const [resultStatus, setResultStatus] = useState();
  const [userName, setUserName] = useState('');
  const [detailRow, setDetailRow] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { data: devicesRes } = useGetRfidDevicesQuery();
  const { data, isLoading, isFetching, refetch } = useGetAttendanceScanLogReportQuery({
    startDate: range?.[0]?.format('YYYY-MM-DD'),
    endDate: range?.[1]?.format('YYYY-MM-DD'),
    deviceId,
    resultStatus,
    userName: userName.trim() || undefined,
  });
  const [deleteScanLog, { isLoading: deletingRow }] = useDeleteAttendanceScanLogMutation();
  const [bulkDeleteScanLogs, { isLoading: bulkDeleting }] = useBulkDeleteAttendanceScanLogsMutation();

  const rows = data?.data?.rows || [];
  const summary = data?.data?.summary || {};
  const deviceOptions = (devicesRes?.data || []).map((item) => ({
    label: `${item.code} - ${item.name}`,
    value: Number(item.id),
  }));

  const handleDeleteRow = async (id) => {
    try {
      await deleteScanLog(id).unwrap();
      message.success('Log scan berhasil dihapus.');
      setSelectedRowKeys((prev) => prev.filter((key) => String(key) !== String(id)));
      if (detailRow?.id === id) {
        setDetailRow(null);
      }
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus log scan.');
      throw error;
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: `Hapus ${selectedRowKeys.length} log scan terpilih?`,
      content: 'Semua log scan yang dipilih akan dihapus permanen dari sistem.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: bulkDeleting },
      onOk: async () => {
        try {
          const result = await bulkDeleteScanLogs(selectedRowKeys).unwrap();
          message.success(result?.message || 'Log scan terpilih berhasil dihapus.');
          if (detailRow && selectedRowKeys.some((key) => String(key) === String(detailRow.id))) {
            setDetailRow(null);
          }
          setSelectedRowKeys([]);
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus log scan terpilih.');
          throw error;
        }
      },
    });
  };

  const handleRowAction = (action, row) => {
    if (action === 'detail') {
      setDetailRow(row);
      return;
    }

    if (action === 'delete') {
      Modal.confirm({
        title: 'Hapus log scan ini?',
        content: 'Data log scan akan dihapus permanen dari sistem.',
        okText: 'Hapus',
        okType: 'danger',
        cancelText: 'Batal',
        okButtonProps: { loading: deletingRow },
        onOk: () => handleDeleteRow(row.id),
      });
    }
  };

  return (
    <Flex vertical gap={18}>
      <Card style={surfaceCardStyle} bordered={false}>
        <Flex vertical gap={16}>
          <Flex
            justify="space-between"
            align={isMobile ? 'stretch' : 'center'}
            vertical={isMobile}
            gap={12}>
            <div>
              <Text strong style={{ color: '#0f172a', fontSize: 16 }}>
                Laporan Scan RFID
              </Text>
              <div>
                <Text type="secondary">
                  Tampilkan semua log scan dari alat absen RFID, tanpa batasan jam atau device.
                </Text>
              </div>
            </div>
            <Button
              icon={<RefreshCw size={16} />}
              loading={isFetching}
              onClick={() => refetch()}
              style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
              Refresh
            </Button>
          </Flex>

          <Flex
            gap={12}
            align="center"
            wrap={isMobile ? 'wrap' : 'nowrap'}
            style={isMobile ? undefined : { overflowX: 'auto' }}>
            <RangePicker
              value={range}
              onChange={(value) => setRange(value)}
              format="YYYY-MM-DD"
              style={{ flex: isMobile ? '1 1 100%' : '0 0 260px' }}
            />
            <Input
              allowClear
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Filter nama user"
              prefix={<Search size={16} />}
              style={{ flex: isMobile ? '1 1 100%' : '1 1 200px', minWidth: 160 }}
            />
            <Select
              allowClear
              value={deviceId}
              onChange={setDeviceId}
              options={deviceOptions}
              placeholder="Filter device"
              showSearch
              optionFilterProp="label"
              virtual={false}
              style={{ flex: isMobile ? '1 1 100%' : '1 1 220px', minWidth: 180 }}
            />
            <Select
              allowClear
              value={resultStatus}
              onChange={setResultStatus}
              placeholder="Filter result status"
              virtual={false}
              style={{ flex: isMobile ? '1 1 100%' : '0 0 200px' }}
              options={[
                { value: 'accepted', label: 'accepted' },
                { value: 'duplicate', label: 'duplicate' },
                { value: 'rejected', label: 'rejected' },
                { value: 'out_of_window', label: 'out_of_window' },
                { value: 'card_inactive', label: 'card_inactive' },
                { value: 'device_inactive', label: 'device_inactive' },
                { value: 'user_inactive', label: 'user_inactive' },
                { value: 'policy_missing', label: 'policy_missing' },
                { value: 'not_scheduled', label: 'not_scheduled' },
              ]}
            />
          </Flex>
        </Flex>
      </Card>

      <Flex gap={12} wrap="wrap">
        <Card bordered={false} style={{ ...statCardStyle, flex: '1 1 220px' }}>
          <Flex justify="space-between" align="start">
            <Statistic title="Total Log" value={Number(summary.total_records || 0)} />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: '#eff6ff',
                color: '#1d4ed8',
              }}>
              <ScanLine size={18} />
            </span>
          </Flex>
        </Card>
        <Card bordered={false} style={{ ...statCardStyle, flex: '1 1 220px' }}>
          <Flex justify="space-between" align="start">
            <Statistic title="Accepted" value={Number(summary.accepted_count || 0)} />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: '#f0fdf4',
                color: '#166534',
              }}>
              <ClipboardX size={18} />
            </span>
          </Flex>
        </Card>
        <Card bordered={false} style={{ ...statCardStyle, flex: '1 1 220px' }}>
          <Flex justify="space-between" align="start">
            <Statistic
              title="Butuh Tindak Lanjut"
              value={
                Number(summary.rejected_count || 0) +
                Number(summary.out_of_window_count || 0) +
                Number(summary.device_inactive_count || 0) +
                Number(summary.card_inactive_count || 0) +
                Number(summary.user_inactive_count || 0) +
                Number(summary.policy_missing_count || 0)
              }
            />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: '#fef2f2',
                color: '#b91c1c',
              }}>
              <AlertTriangle size={18} />
            </span>
          </Flex>
        </Card>
      </Flex>

      <Card style={surfaceCardStyle} bordered={false}>
        {rows.length > 0 && (
          <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedRowKeys.length > 0
                ? `${selectedRowKeys.length} log scan terpilih`
                : 'Centang baris untuk hapus bulk'}
            </Text>
            <Button
              danger
              icon={<Trash2 size={16} />}
              disabled={selectedRowKeys.length === 0}
              loading={bulkDeleting}
              onClick={handleBulkDelete}>
              Hapus Terpilih
            </Button>
          </Flex>
        )}
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description="Belum ada log scan pada rentang ini." />
        ) : (
          <Table
            rowKey="id"
            loading={isLoading || (isFetching && rows.length > 0)}
            dataSource={rows}
            tableLayout="fixed"
            pagination={{ pageSize: 10 }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={[
              {
                title: 'Waktu Scan',
                dataIndex: 'scanned_at',
                ellipsis: true,
                render: (value) => formatScanTimeCell(value),
              },
              {
                title: 'Device',
                ellipsis: true,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong ellipsis>{row.device_name || '-'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {row.device_code || '-'}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: 'User',
                ellipsis: true,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong ellipsis>{row.user_name || '-'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      UID {row.card_uid || '-'}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: 'Result',
                dataIndex: 'result_status',
                render: (value) => <Tag color={RESULT_STATUS_COLORS[value] || 'default'}>{value}</Tag>,
              },
              {
                title: 'Aksi',
                width: 110,
                render: (_, row) => (
                  <Select
                    placeholder="Aksi"
                    value={null}
                    virtual={false}
                    style={{ width: '100%', maxWidth: 110 }}
                    options={[
                      { value: 'detail', label: 'Detail' },
                      { value: 'delete', label: 'Hapus' },
                    ]}
                    onChange={(value) => handleRowAction(value, row)}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title="Detail Log Scan"
        centered
        open={!!detailRow}
        onCancel={() => setDetailRow(null)}
        footer={null}
        width={720}>
        {detailRow && (
          <Descriptions bordered column={isMobile ? 1 : 2} size="small">
            <Descriptions.Item label="ID Log">{detailRow.id}</Descriptions.Item>
            <Descriptions.Item label="Result">
              <Tag color={RESULT_STATUS_COLORS[detailRow.result_status] || 'default'}>{detailRow.result_status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Waktu Scan" span={2}>
              {formatDetailValue(detailRow.scanned_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Waktu Device">{formatDetailValue(detailRow.device_time_at)}</Descriptions.Item>
            <Descriptions.Item label="Diterima Server">
              {formatDetailValue(detailRow.server_received_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Device">
              {formatDetailValue(detailRow.device_name)} ({formatDetailValue(detailRow.device_code)})
            </Descriptions.Item>
            <Descriptions.Item label="Device ID">{formatDetailValue(detailRow.device_id)}</Descriptions.Item>
            <Descriptions.Item label="User">{formatDetailValue(detailRow.user_name)}</Descriptions.Item>
            <Descriptions.Item label="User ID">{formatDetailValue(detailRow.user_id)}</Descriptions.Item>
            <Descriptions.Item label="UID Kartu" span={2}>
              {formatDetailValue(detailRow.card_uid)}
            </Descriptions.Item>
            <Descriptions.Item label="Source">{formatDetailValue(detailRow.scan_source)}</Descriptions.Item>
            <Descriptions.Item label="Action">{formatDetailValue(detailRow.scan_action)}</Descriptions.Item>
            <Descriptions.Item label="Attendance ID">{formatDetailValue(detailRow.attendance_id)}</Descriptions.Item>
            <Descriptions.Item label="Dibuat">{formatDetailValue(detailRow.created_at)}</Descriptions.Item>
            <Descriptions.Item label="Alasan Penolakan" span={2}>
              {formatDetailValue(detailRow.rejection_reason)}
            </Descriptions.Item>
            <Descriptions.Item label="Raw Payload" span={2}>
              <pre
                style={{
                  margin: 0,
                  maxHeight: 220,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 12,
                }}>
                {formatRawPayload(detailRow.raw_payload)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Flex>
  );
};

export default ScanLogReport;
