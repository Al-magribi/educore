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
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography,
  message,
} from 'antd';
import { motion } from 'framer-motion';
import { ExternalLink, MessageCircle, Play, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import {
  useDeleteTelegramNotificationBatchLogsMutation,
  useDeleteTelegramNotificationBatchMutation,
  useDeleteTelegramNotificationLogMutation,
  useGetTelegramNotificationBatchesQuery,
  useGetTelegramNotificationConfigQuery,
  useGetTelegramNotificationLogsQuery,
  useGetTelegramStatusQuery,
  useRetryFailedTelegramBatchMutation,
  useRunTelegramNotificationNowMutation,
  useSendTelegramTestMessageMutation,
  useUpdateTelegramNotificationConfigMutation,
  useVerifyTelegramBotMutation,
} from '../../../../../service/lms/ApiAttendance';
import { innerCardStyle, itemVariants } from '../configShared';

const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const BOT_STATUS_META = {
  disconnected: { label: 'Belum dikonfigurasi', color: 'default' },
  ready: { label: 'Siap', color: 'success' },
  invalid_token: { label: 'Token tidak valid', color: 'error' },
  error: { label: 'Error', color: 'error' },
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

const formatTelegramTime = (value) => {
  if (!value) return '08:00';
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
};

const TelegramFeatureTab = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [configForm] = Form.useForm();
  const [testChatId, setTestChatId] = useState('');
  const [botTokenInput, setBotTokenInput] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  const { data: configRes, isLoading: loadingConfig, refetch: refetchConfig } =
    useGetTelegramNotificationConfigQuery();
  const [updateConfig, { isLoading: savingConfig }] = useUpdateTelegramNotificationConfigMutation();
  const [verifyBot, { isLoading: verifyingBot }] = useVerifyTelegramBotMutation();

  const config = configRes?.data;

  const {
    data: statusRes,
    isFetching: fetchingStatus,
    refetch: refetchStatus,
  } = useGetTelegramStatusQuery(undefined, {
    pollingInterval: 10000,
    refetchOnMountOrArgChange: true,
  });

  const status = statusRes?.data || config;
  const botStatus = status?.bot_status || 'disconnected';
  const canSendMessages = status?.bot_ready === true || botStatus === 'ready';

  const {
    data: batchesRes,
    isFetching: fetchingBatches,
    refetch: refetchBatches,
  } = useGetTelegramNotificationBatchesQuery({
    limit: 20,
  });

  const { data: logsRes, isFetching: fetchingLogs } = useGetTelegramNotificationLogsQuery(
    { batchId: selectedBatchId, limit: 100 },
    { skip: !selectedBatchId },
  );

  const [sendTestMessage, { isLoading: sendingTest }] = useSendTelegramTestMessageMutation();
  const [retryFailedBatch, { isLoading: retryingBatch }] = useRetryFailedTelegramBatchMutation();
  const [deleteBatch, { isLoading: deletingBatch }] = useDeleteTelegramNotificationBatchMutation();
  const [deleteBatchLogs, { isLoading: deletingBatchLogs }] =
    useDeleteTelegramNotificationBatchLogsMutation();
  const [deleteLog, { isLoading: deletingLog }] = useDeleteTelegramNotificationLogMutation();
  const [runNow, { isLoading: runningNow }] = useRunTelegramNotificationNowMutation();

  const batches = batchesRes?.data || [];
  const logs = logsRes?.data || [];

  const configInitialValues = useMemo(
    () => ({
      is_enabled: config?.is_enabled === true,
      send_time: parseSendTime(config?.send_time),
      skip_on_holiday: config?.skip_on_holiday !== false,
      message_template: config?.message_template || DEFAULT_TEMPLATE,
    }),
    [config],
  );

  useEffect(() => {
    if (!config) return;
    configForm.setFieldsValue(configInitialValues);
    setBotTokenInput('');
  }, [config, configForm, configInitialValues]);

  useEffect(() => {
    if (!batches.length) {
      if (selectedBatchId) setSelectedBatchId(null);
      return;
    }

    const selectedExists = batches.some((batch) => Number(batch.id) === Number(selectedBatchId));
    if (!selectedBatchId || !selectedExists) {
      setSelectedBatchId(Number(batches[0].id));
    }
  }, [batches, selectedBatchId]);

  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      const payload = {
        is_enabled: values.is_enabled === true,
        send_time: values.send_time?.format('HH:mm'),
        skip_on_holiday: values.skip_on_holiday !== false,
        message_template: values.message_template,
      };

      if (botTokenInput.trim()) {
        payload.bot_token = botTokenInput.trim();
      }

      await updateConfig(payload).unwrap();
      message.success('Konfigurasi Telegram berhasil disimpan.');
      setBotTokenInput('');
      refetchConfig();
      refetchStatus();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan konfigurasi Telegram.');
    }
  };

  const handleVerifyBot = async () => {
    try {
      const result = await verifyBot(
        botTokenInput.trim() ? { bot_token: botTokenInput.trim() } : {},
      ).unwrap();
      message.success(result?.message || 'Bot Telegram terverifikasi.');
      refetchConfig();
      refetchStatus();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal memverifikasi bot Telegram.');
    }
  };

  const handleSendTest = async () => {
    const chatId = testChatId.trim();
    if (!chatId) {
      message.warning('Masukkan chat_id Telegram untuk uji coba.');
      return;
    }

    try {
      await sendTestMessage({ chat_id: chatId }).unwrap();
      message.success('Pesan uji coba berhasil dikirim.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal mengirim pesan uji coba.');
    }
  };

  const handleRunNow = () => {
    Modal.confirm({
      title: 'Jalankan pengiriman Telegram sekarang?',
      content:
        'Batch laporan kehadiran hari ini akan dikirim ke orang tua yang sudah bind Telegram.',
      okText: 'Jalankan',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const result = await runNow({}).unwrap();
          message.success(result?.message || 'Batch Telegram diproses.');
          refetchBatches();
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menjalankan batch Telegram.');
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

  const handleDeleteBatch = (batch) => {
    const batchDate = batch.attendance_date ? dayjs(batch.attendance_date).format('DD MMM YYYY') : '-';

    Modal.confirm({
      title: 'Hapus riwayat batch ini?',
      content: `Batch tanggal ${batchDate} beserta semua log pengiriman akan dihapus permanen.`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: deletingBatch },
      onOk: async () => {
        try {
          const result = await deleteBatch(batch.id).unwrap();
          message.success(result?.message || 'Riwayat batch berhasil dihapus.');
          if (Number(selectedBatchId) === Number(batch.id)) {
            setSelectedBatchId(null);
          }
          refetchBatches();
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus batch.');
          throw error;
        }
      },
    });
  };

  const handleDeleteBatchLogs = () => {
    if (!selectedBatchId) return;

    Modal.confirm({
      title: 'Hapus semua log batch ini?',
      content: 'Semua log pengiriman pada batch terpilih akan dihapus permanen. Data batch tetap ada.',
      okText: 'Hapus Log',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: deletingBatchLogs },
      onOk: async () => {
        try {
          const result = await deleteBatchLogs(selectedBatchId).unwrap();
          message.success(result?.message || 'Log pengiriman berhasil dihapus.');
          refetchBatches();
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus log batch.');
          throw error;
        }
      },
    });
  };

  const handleDeleteLog = (log) => {
    Modal.confirm({
      title: 'Hapus log pengiriman ini?',
      content: `Log untuk ${log.parent_name || 'orang tua'} (${log.chat_id}) akan dihapus permanen.`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: deletingLog },
      onOk: async () => {
        try {
          const result = await deleteLog(log.id).unwrap();
          message.success(result?.message || 'Log pengiriman berhasil dihapus.');
          refetchBatches();
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus log.');
          throw error;
        }
      },
    });
  };

  const selectedBatch = batches.find((batch) => Number(batch.id) === Number(selectedBatchId));
  const canDeleteSelectedBatchLogs =
    Boolean(selectedBatch) && selectedBatch.batch_status !== 'running' && logs.length > 0;

  const botMeta = BOT_STATUS_META[botStatus] || BOT_STATUS_META.disconnected;
  const bindStats = status?.bind_stats || config?.bind_stats || { total_parents: 0, bound_parents: 0 };

  const scheduleStatus = useMemo(() => {
    if (config?.is_default) {
      return {
        type: 'warning',
        message: 'Konfigurasi belum disimpan',
        description: 'Isi bot token, aktifkan notifikasi, lalu klik Simpan.',
      };
    }

    if (!config?.is_enabled) {
      return {
        type: 'info',
        message: 'Notifikasi otomatis nonaktif',
        description: 'Aktifkan dan simpan konfigurasi untuk menjadwalkan pengiriman harian.',
      };
    }

    const sendTime = formatTelegramTime(config?.send_time);
    const lastRunLabel = config?.last_run_date
      ? dayjs(config.last_run_date).format('DD MMM YYYY')
      : null;
    const ranToday =
      config?.last_run_date &&
      dayjs(config.last_run_date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');

    return {
      type: ranToday ? 'success' : 'info',
      message: `Batch otomatis setiap hari pukul ${sendTime} WIB`,
      description: ranToday
        ? 'Sudah berjalan hari ini. Riwayat batch akan muncul di bawah.'
        : lastRunLabel
          ? `Terakhir berjalan: ${lastRunLabel}. Jika jam kirim sudah lewat, batch akan catch-up dalam 1 menit.`
          : 'Belum pernah berjalan. Batch dimulai otomatis pada jam kirim, atau segera jika jam kirim sudah lewat.',
    };
  }, [config]);

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
            <Alert
              type={scheduleStatus.type}
              showIcon
              message={scheduleStatus.message}
              description={scheduleStatus.description}
              style={{ marginBottom: 16 }}
            />
            <Form form={configForm} layout="vertical" initialValues={configInitialValues}>
              <Form.Item name="is_enabled" label="Aktifkan Notifikasi Telegram" valuePropName="checked">
                <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
              </Form.Item>

              <Form.Item
                label="Bot Token (per homebase)"
                extra={
                  <Text type="secondary">
                    Ambil dari BotFather. Token tersimpan terenkripsi ringan di UI (masked). Kosongkan jika tidak ingin
                    mengganti token yang sudah tersimpan
                    {config?.bot_token_masked ? ` (${config.bot_token_masked})` : ''}.
                  </Text>
                }>
                <Input.Password
                  value={botTokenInput}
                  onChange={(event) => setBotTokenInput(event.target.value)}
                  placeholder={config?.has_bot_token ? 'Token sudah tersimpan — isi untuk mengganti' : '123456:ABC-DEF...'}
                />
              </Form.Item>

              <Form.Item
                name="send_time"
                label="Jam Kirim (WIB)"
                rules={[{ required: true, message: 'Jam kirim wajib diisi.' }]}
                style={{ maxWidth: 220 }}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>

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
            </Form>
          </Card>
        </MotionDiv>

        <MotionDiv
          variants={itemVariants}
          initial="hidden"
          animate="show"
          style={{ flex: isMobile ? '1 1 auto' : '0 0 360px' }}>
          <Card
            title="Status Bot Telegram"
            style={innerCardStyle}
            extra={
              <Button
                icon={<RefreshCw size={14} />}
                loading={fetchingStatus}
                onClick={() => {
                  refetchStatus();
                  refetchConfig();
                }}>
                Refresh
              </Button>
            }>
            <Flex vertical gap={16}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Status">
                  <Tag color={botMeta.color}>{botMeta.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Username Bot">
                  {status?.bot_username ? `@${status.bot_username}` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Orang Tua Terhubung">
                  <Text>
                    {bindStats.bound_parents || 0} dari {bindStats.total_parents || 0} sudah bind Telegram
                  </Text>
                </Descriptions.Item>
                {status?.last_error ? (
                  <Descriptions.Item label="Error Terakhir">
                    <Text type="danger">{status.last_error}</Text>
                  </Descriptions.Item>
                ) : null}
              </Descriptions>

              {canSendMessages ? (
                <Alert
                  type="success"
                  showIcon
                  message="Bot siap mengirim notifikasi."
                  description="Orang tua menghubungkan Telegram lewat tombol di portal orang tua, lalu tekan Start."
                />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="Bot belum siap"
                  description="Simpan bot token dari BotFather, lalu verifikasi."
                />
              )}

              <Flex gap={8} vertical={isMobile}>
                <Button icon={<RefreshCw size={14} />} loading={verifyingBot} onClick={handleVerifyBot}>
                  Verifikasi Bot
                </Button>
                <Button
                  type="primary"
                  icon={<Play size={14} />}
                  loading={runningNow}
                  disabled={!canSendMessages}
                  onClick={handleRunNow}>
                  Kirim Sekarang
                </Button>
              </Flex>

              {status?.bot_deep_link_base ? (
                <Button
                  href={status.bot_deep_link_base}
                  target="_blank"
                  rel="noreferrer"
                  icon={<ExternalLink size={14} />}
                  block={isMobile}>
                  Buka Bot di Telegram
                </Button>
              ) : null}

              <Card size="small" title="Uji Coba Kirim" style={{ borderRadius: 12 }}>
                <Flex gap={8} vertical={isMobile}>
                  <Input
                    value={testChatId}
                    onChange={(event) => setTestChatId(event.target.value)}
                    placeholder="chat_id, contoh: 123456789"
                    prefix={<MessageCircle size={16} />}
                  />
                  <Button
                    type="default"
                    icon={<Send size={14} />}
                    loading={sendingTest}
                    disabled={!canSendMessages}
                    onClick={handleSendTest}
                    block={isMobile}>
                    Kirim Pesan Uji
                  </Button>
                </Flex>
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                  Chat ID didapat setelah orang tua Start bot di Telegram.
                </Paragraph>
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
                width: 180,
                render: (_, row) => {
                  const isRunning = row.batch_status === 'running';

                  return (
                    <Space size={4} onClick={(event) => event.stopPropagation()}>
                      {Number(row.failed_count) > 0 ? (
                        <Button size="small" loading={retryingBatch} onClick={() => handleRetryBatch(row.id)}>
                          Retry
                        </Button>
                      ) : null}
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        loading={deletingBatch}
                        disabled={isRunning}
                        onClick={() => handleDeleteBatch(row)}
                      />
                    </Space>
                  );
                },
              },
            ]}
          />
        </Card>
      </MotionDiv>

      {selectedBatchId ? (
        <MotionDiv variants={itemVariants} initial="hidden" animate="show">
          <Card
            title="Log Pengiriman Batch Terpilih"
            style={innerCardStyle}
            extra={
              <Button
                danger
                icon={<Trash2 size={14} />}
                loading={deletingBatchLogs}
                disabled={!canDeleteSelectedBatchLogs}
                onClick={handleDeleteBatchLogs}>
                Hapus Semua Log
              </Button>
            }>
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
                  title: 'Chat ID',
                  dataIndex: 'chat_id',
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
                {
                  title: 'Aksi',
                  width: 72,
                  render: (_, row) => (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<Trash2 size={14} />}
                      loading={deletingLog}
                      disabled={selectedBatch?.batch_status === 'running'}
                      onClick={() => handleDeleteLog(row)}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </MotionDiv>
      ) : null}
    </Flex>
  );
};

export default TelegramFeatureTab;
