import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  QRCode,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography,
  message,
} from 'antd';
import { motion } from 'framer-motion';
import { MessageCircle, Play, RefreshCw, RotateCcw, Save, Send, Smartphone } from 'lucide-react';
import {
  useGetWhatsappNotificationBatchesQuery,
  useGetWhatsappNotificationConfigQuery,
  useGetWhatsappNotificationLogsQuery,
  useGetWhatsappSessionQuery,
  useReconnectWhatsappSessionMutation,
  useRetryFailedWhatsappBatchMutation,
  useRunWhatsappNotificationNowMutation,
  useSendWhatsappTestMessageMutation,
  useUpdateWhatsappNotificationConfigMutation,
} from '../../../../../../service/lms/ApiAttendance';
import { innerCardStyle, itemVariants } from '../configShared';

const { Text, Paragraph, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const SESSION_STATUS_META = {
  disconnected: { label: 'Terputus', color: 'default' },
  initializing: { label: 'Memulai', color: 'processing' },
  qr_pending: { label: 'Scan QR', color: 'warning' },
  authenticated: { label: 'Terautentikasi', color: 'processing' },
  ready: { label: 'Terhubung', color: 'success' },
  auth_failure: { label: 'Gagal Autentikasi', color: 'error' },
};

const BATCH_STATUS_COLORS = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
};

const DELIVERY_STATUS_COLORS = {
  queued: 'default',
  sent: 'success',
  failed: 'error',
  skipped: 'warning',
};

const DEFAULT_TEMPLATE = `Assalamu'alaikum Bapak/Ibu {parent_name},

Berikut laporan kehadiran anak Anda hari ini ({date_label}):

{students_block}

Terima kasih.
-{school_name}`;

const parseSendTime = (value) => {
  if (!value) return dayjs('08:00', 'HH:mm');
  const text = String(value);
  if (text.length >= 5) return dayjs(text.slice(0, 5), 'HH:mm');
  return dayjs('08:00', 'HH:mm');
};

const shouldPollSession = (status) => ['initializing', 'qr_pending', 'authenticated', 'disconnected'].includes(status);

const WhatsappFeatureTab = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [configForm] = Form.useForm();
  const [testPhone, setTestPhone] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [autoStartSession, setAutoStartSession] = useState(true);
  const [sessionStatus, setSessionStatus] = useState('disconnected');

  const { data: configRes, isLoading: loadingConfig } = useGetWhatsappNotificationConfigQuery();
  const [updateConfig, { isLoading: savingConfig }] = useUpdateWhatsappNotificationConfigMutation();

  const config = configRes?.data;

  const {
    data: sessionRes,
    isFetching: fetchingSession,
    refetch: refetchSession,
  } = useGetWhatsappSessionQuery(
    { autoStart: autoStartSession },
    {
      pollingInterval: shouldPollSession(sessionStatus) ? 3000 : 0,
    },
  );

  const session = sessionRes?.data;
  const activeSessionStatus = session?.session_status || 'disconnected';

  useEffect(() => {
    setSessionStatus(activeSessionStatus);
  }, [activeSessionStatus]);

  const {
    data: batchesRes,
    isFetching: fetchingBatches,
    refetch: refetchBatches,
  } = useGetWhatsappNotificationBatchesQuery({
    limit: 20,
  });

  const { data: logsRes, isFetching: fetchingLogs } = useGetWhatsappNotificationLogsQuery(
    { batchId: selectedBatchId, limit: 100 },
    { skip: !selectedBatchId },
  );

  const [reconnectSession, { isLoading: reconnecting }] = useReconnectWhatsappSessionMutation();
  const [sendTestMessage, { isLoading: sendingTest }] = useSendWhatsappTestMessageMutation();
  const [retryFailedBatch, { isLoading: retryingBatch }] = useRetryFailedWhatsappBatchMutation();
  const [runNow, { isLoading: runningNow }] = useRunWhatsappNotificationNowMutation();

  const batches = batchesRes?.data || [];
  const logs = logsRes?.data || [];

  const configInitialValues = useMemo(
    () => ({
      is_enabled: config?.is_enabled === true,
      send_time: parseSendTime(config?.send_time),
      send_delay_min_seconds: Number(config?.send_delay_min_seconds ?? 15),
      send_delay_max_seconds: Number(config?.send_delay_max_seconds ?? 20),
      skip_on_holiday: config?.skip_on_holiday !== false,
      message_template: config?.message_template || DEFAULT_TEMPLATE,
    }),
    [config],
  );

  const avgDelaySeconds = useMemo(() => {
    const min = Number(configInitialValues.send_delay_min_seconds || 15);
    const max = Number(configInitialValues.send_delay_max_seconds || 20);
    return Math.round((min + max) / 2);
  }, [configInitialValues.send_delay_min_seconds, configInitialValues.send_delay_max_seconds]);

  useEffect(() => {
    if (!config) return;
    configForm.setFieldsValue(configInitialValues);
  }, [config, configForm, configInitialValues]);

  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(Number(batches[0].id));
    }
  }, [batches, selectedBatchId]);

  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      await updateConfig({
        is_enabled: values.is_enabled === true,
        send_time: values.send_time?.format('HH:mm'),
        send_delay_min_seconds: Number(values.send_delay_min_seconds),
        send_delay_max_seconds: Number(values.send_delay_max_seconds),
        skip_on_holiday: values.skip_on_holiday !== false,
        message_template: values.message_template,
      }).unwrap();
      message.success('Konfigurasi WhatsApp berhasil disimpan.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan konfigurasi WhatsApp.');
    }
  };

  const handleReconnect = async () => {
    try {
      setAutoStartSession(true);
      await reconnectSession().unwrap();
      message.info('Sesi WhatsApp dihubungkan ulang. Scan QR jika diminta.');
      refetchSession();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghubungkan ulang sesi WhatsApp.');
    }
  };

  const handleSendTest = async () => {
    const phone = testPhone.trim();
    if (!phone) {
      message.warning('Masukkan nomor telepon uji coba.');
      return;
    }

    try {
      await sendTestMessage({ phone }).unwrap();
      message.success('Pesan uji coba berhasil dikirim.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal mengirim pesan uji coba.');
    }
  };

  const handleRunNow = () => {
    Modal.confirm({
      title: 'Jalankan pengiriman WhatsApp sekarang?',
      content:
        'Batch laporan kehadiran hari ini akan dikirim ke orang tua sesuai konfigurasi. Proses bisa memakan waktu lama tergantung jumlah penerima.',
      okText: 'Jalankan',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const result = await runNow({}).unwrap();
          message.success(result?.message || 'Batch WhatsApp diproses.');
          refetchBatches();
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menjalankan batch WhatsApp.');
          throw error;
        }
      },
    });
  };

  const handleRetryBatch = async (batchId) => {
    try {
      const result = await retryFailedBatch(batchId).unwrap();
      message.success(result?.message || 'Retry pesan gagal selesai.');
      refetchBatches();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal retry batch.');
    }
  };

  const sessionMeta = SESSION_STATUS_META[activeSessionStatus] || SESSION_STATUS_META.disconnected;

  return (
    <Flex vertical gap={16}>
      <Flex gap={16} vertical={isMobile}>
        <MotionDiv variants={itemVariants} initial="hidden" animate="show" style={{ flex: 1 }}>
          <Card
            title="Konfigurasi Pengiriman"
            style={innerCardStyle}
            loading={loadingConfig}
            extra={
              <Button type="primary" icon={<Save size={14} />} loading={savingConfig} onClick={handleSaveConfig}>
                Simpan
              </Button>
            }>
            <Form form={configForm} layout="vertical" initialValues={configInitialValues}>
              <Form.Item name="is_enabled" label="Aktifkan Notifikasi WhatsApp" valuePropName="checked">
                <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
              </Form.Item>

              <Flex gap={12} wrap="wrap">
                <Form.Item
                  name="send_time"
                  label="Jam Kirim (WIB)"
                  rules={[{ required: true, message: 'Jam kirim wajib diisi.' }]}
                  style={{ flex: '1 1 160px', minWidth: 160 }}>
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="send_delay_min_seconds"
                  label="Jeda Min (detik)"
                  rules={[{ required: true, message: 'Wajib diisi.' }]}
                  style={{ flex: '1 1 140px', minWidth: 140 }}>
                  <InputNumber min={1} max={120} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="send_delay_max_seconds"
                  label="Jeda Max (detik)"
                  rules={[{ required: true, message: 'Wajib diisi.' }]}
                  style={{ flex: '1 1 140px', minWidth: 140 }}>
                  <InputNumber min={1} max={120} style={{ width: '100%' }} />
                </Form.Item>
              </Flex>

              <Form.Item name="skip_on_holiday" label="Lewati Hari Libur" valuePropName="checked">
                <Switch checkedChildren="Ya" unCheckedChildren="Tidak" />
              </Form.Item>

              <Form.Item
                name="message_template"
                label="Template Pesan"
                rules={[{ required: true, message: 'Template pesan wajib diisi.' }]}
                extra={
                  <Text type="secondary">
                    Placeholder: {'{parent_name}'}, {'{date_label}'}, {'{students_block}'}, {'{school_name}'}
                  </Text>
                }>
                <Input.TextArea rows={10} />
              </Form.Item>

              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Estimasi durasi batch: ~{avgDelaySeconds} detik rata-rata per orang tua. Untuk ~400 penerima, proses
                bisa ±{Math.round((400 * avgDelaySeconds) / 60)} menit.
              </Paragraph>
            </Form>
          </Card>
        </MotionDiv>

        <MotionDiv
          variants={itemVariants}
          initial="hidden"
          animate="show"
          style={{ flex: isMobile ? '1 1 auto' : '0 0 360px' }}>
          <Card
            title="Sesi WhatsApp"
            style={innerCardStyle}
            extra={
              <Button icon={<RefreshCw size={14} />} loading={fetchingSession} onClick={() => refetchSession()}>
                Refresh
              </Button>
            }>
            <Flex vertical gap={16}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Status">
                  <Tag color={sessionMeta.color}>{sessionMeta.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Nomor Terhubung">
                  {session?.connected_phone ? `+${session.connected_phone}` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Client Aktif">
                  {session?.client_ready ? <Tag color="success">Ya</Tag> : <Tag>Belum</Tag>}
                </Descriptions.Item>
                {session?.last_error ? (
                  <Descriptions.Item label="Error Terakhir">
                    <Text type="danger">{session.last_error}</Text>
                  </Descriptions.Item>
                ) : null}
              </Descriptions>

              {session?.qr_code ? (
                <Flex vertical align="center" gap={8}>
                  <Smartphone size={18} color="#16a34a" />
                  <Title level={5} style={{ margin: 0 }}>
                    Scan QR dengan WhatsApp
                  </Title>
                  <QRCode value={session.qr_code} size={isMobile ? 180 : 220} />
                  <Text type="secondary" style={{ textAlign: 'center' }}>
                    Buka WhatsApp di HP → Perangkat Tertaut → Tautkan Perangkat
                  </Text>
                </Flex>
              ) : activeSessionStatus === 'ready' ? (
                <Alert type="success" showIcon message="WhatsApp siap mengirim pesan." />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="WhatsApp belum terhubung"
                  description="Klik Hubungkan Ulang untuk memunculkan QR code."
                />
              )}

              <Flex gap={8} vertical={isMobile}>
                <Button icon={<RotateCcw size={14} />} loading={reconnecting} onClick={handleReconnect}>
                  Hubungkan Ulang
                </Button>
                <Button
                  type="primary"
                  icon={<Play size={14} />}
                  loading={runningNow}
                  disabled={activeSessionStatus !== 'ready'}
                  onClick={handleRunNow}>
                  Kirim Sekarang
                </Button>
              </Flex>

              <Card size="small" title="Uji Coba Kirim" style={{ borderRadius: 12 }}>
                <Flex gap={8} vertical={isMobile}>
                  <Input
                    value={testPhone}
                    onChange={(event) => setTestPhone(event.target.value)}
                    placeholder="Nomor WA, contoh: 08123456789"
                    prefix={<MessageCircle size={16} />}
                  />
                  <Button
                    type="default"
                    icon={<Send size={14} />}
                    loading={sendingTest}
                    disabled={activeSessionStatus !== 'ready'}
                    onClick={handleSendTest}
                    block={isMobile}>
                    Kirim Pesan Uji
                  </Button>
                </Flex>
              </Card>
            </Flex>
          </Card>
        </MotionDiv>
      </Flex>

      <MotionDiv variants={itemVariants} initial="hidden" animate="show">
        <Card
          title="Riwayat Batch Pengiriman"
          style={innerCardStyle}
          extra={
            <Button icon={<RefreshCw size={14} />} loading={fetchingBatches} onClick={refetchBatches}>
              Refresh
            </Button>
          }>
          <Table
            rowKey="id"
            size="small"
            loading={fetchingBatches}
            dataSource={batches}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selectedBatchId ? [selectedBatchId] : [],
              onChange: (keys) => setSelectedBatchId(keys[0] ? Number(keys[0]) : null),
            }}
            onRow={(record) => ({
              onClick: () => setSelectedBatchId(Number(record.id)),
              style: { cursor: 'pointer' },
            })}
            columns={[
              {
                title: 'Tanggal',
                dataIndex: 'attendance_date',
                render: (value) => (value ? dayjs(value).format('DD MMM YYYY') : '-'),
              },
              {
                title: 'Status',
                dataIndex: 'batch_status',
                render: (value) => <Tag color={BATCH_STATUS_COLORS[value] || 'default'}>{value}</Tag>,
              },
              {
                title: 'Penerima',
                dataIndex: 'total_recipients',
              },
              {
                title: 'Terkirim',
                dataIndex: 'sent_count',
              },
              {
                title: 'Gagal',
                dataIndex: 'failed_count',
              },
              {
                title: 'Aksi',
                width: 120,
                render: (_, row) =>
                  Number(row.failed_count) > 0 ? (
                    <Button
                      size="small"
                      loading={retryingBatch}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRetryBatch(row.id);
                      }}>
                      Retry
                    </Button>
                  ) : (
                    '-'
                  ),
              },
            ]}
          />
        </Card>
      </MotionDiv>

      {selectedBatchId ? (
        <MotionDiv variants={itemVariants} initial="hidden" animate="show">
          <Card title="Log Pengiriman Batch Terpilih" style={innerCardStyle}>
            <Table
              rowKey="id"
              size="small"
              loading={fetchingLogs}
              dataSource={logs}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              columns={[
                {
                  title: 'Orang Tua',
                  dataIndex: 'parent_name',
                  ellipsis: true,
                },
                {
                  title: 'Telepon',
                  dataIndex: 'phone',
                  width: 140,
                },
                {
                  title: 'Status',
                  dataIndex: 'delivery_status',
                  width: 110,
                  render: (value) => <Tag color={DELIVERY_STATUS_COLORS[value] || 'default'}>{value}</Tag>,
                },
                {
                  title: 'Waktu Kirim',
                  dataIndex: 'sent_at',
                  width: 150,
                  render: (value) => (value ? dayjs(value).format('DD MMM YY HH:mm') : '-'),
                },
                {
                  title: 'Error',
                  dataIndex: 'error_message',
                  ellipsis: true,
                  render: (value) => value || '-',
                },
              ]}
            />
          </Card>
        </MotionDiv>
      ) : null}
    </Flex>
  );
};

export default WhatsappFeatureTab;
