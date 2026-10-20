import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Flex,
  Form,
  Grid,
  Input,
  Tag,
  Typography,
  message,
} from 'antd';
import { motion } from 'framer-motion';
import { ExternalLink, MessageCircle, RefreshCw, Save, Send } from 'lucide-react';
import {
  useGetTelegramNotificationConfigQuery,
  useGetTelegramStatusQuery,
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

const DEFAULT_TEACHER_CHECKIN = `Assalamu'alaikum {teacher_name},

Absensi DATANG tercatat.
Tanggal: {date_label}
Jam: {time_label}{device_line}

Terima kasih.`;

const DEFAULT_TEACHER_CHECKOUT = `Assalamu'alaikum {teacher_name},

Absensi PULANG tercatat.
Tanggal: {date_label}
Jam: {time_label}{device_line}

Terima kasih.`;

const DEFAULT_STUDENT_CHECKIN = `Assalamu'alaikum {student_name},

Presensi datang kamu sudah tercatat.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

const DEFAULT_STUDENT_CHECKOUT = `Assalamu'alaikum {student_name},

Presensi pulang kamu sudah tercatat.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

const DEFAULT_PARENT_CHECKIN = `Assalamu'alaikum {parent_name},

Anak Anda, {student_name}, sudah datang di sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

const DEFAULT_PARENT_CHECKOUT = `Assalamu'alaikum {parent_name},

Anak Anda, {student_name}, sudah pulang dari sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

const GATE_PLACEHOLDERS =
  '{teacher_name}, {student_name}, {parent_name}, {date_label}, {time_label}, {action}, {school_name}, {device_name}, {device_line}, {class_name}, {nis}, {status_label}';

const TEMPLATE_GROUPS = [
  {
    key: 'parent',
    label: 'Orang Tua — tiap anak tap datang & pulang',
    fields: [
      { name: 'parent_checkin_template', label: 'Pesan Datang ke Orang Tua', fallback: DEFAULT_PARENT_CHECKIN },
      { name: 'parent_checkout_template', label: 'Pesan Pulang ke Orang Tua', fallback: DEFAULT_PARENT_CHECKOUT },
    ],
  },
  {
    key: 'student',
    label: 'Siswa — tap datang & pulang',
    fields: [
      { name: 'student_checkin_template', label: 'Pesan Datang Siswa', fallback: DEFAULT_STUDENT_CHECKIN },
      { name: 'student_checkout_template', label: 'Pesan Pulang Siswa', fallback: DEFAULT_STUDENT_CHECKOUT },
    ],
  },
  {
    key: 'teacher',
    label: 'Guru — tap datang & pulang',
    fields: [
      { name: 'teacher_checkin_template', label: 'Pesan Datang Guru', fallback: DEFAULT_TEACHER_CHECKIN },
      { name: 'teacher_checkout_template', label: 'Pesan Pulang Guru', fallback: DEFAULT_TEACHER_CHECKOUT },
    ],
  },
];

const TEMPLATE_FIELDS = TEMPLATE_GROUPS.flatMap((group) => group.fields);

const StatusRow = ({ label, children }) => (
  <Flex justify="space-between" align="flex-start" gap={12} wrap="wrap">
    <Text type="secondary">{label}</Text>
    <div style={{ textAlign: 'right', minWidth: 0 }}>{children}</div>
  </Flex>
);

const TelegramFeatureTab = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [configForm] = Form.useForm();
  const [testChatId, setTestChatId] = useState('');
  const [botTokenInput, setBotTokenInput] = useState('');

  const { data: configRes, isLoading: loadingConfig, refetch: refetchConfig } =
    useGetTelegramNotificationConfigQuery();
  const [updateConfig, { isLoading: savingConfig }] = useUpdateTelegramNotificationConfigMutation();
  const [verifyBot, { isLoading: verifyingBot }] = useVerifyTelegramBotMutation();
  const [sendTestMessage, { isLoading: sendingTest }] = useSendTelegramTestMessageMutation();

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
  const botMeta = BOT_STATUS_META[botStatus] || BOT_STATUS_META.disconnected;
  const bindStats = status?.bind_stats || config?.bind_stats || { total_parents: 0, bound_parents: 0 };

  const configInitialValues = useMemo(
    () =>
      Object.fromEntries(
        TEMPLATE_FIELDS.map((field) => [field.name, config?.[field.name] || field.fallback]),
      ),
    [config],
  );

  useEffect(() => {
    if (!config) return;
    configForm.setFieldsValue(configInitialValues);
    setBotTokenInput('');
  }, [config, configForm, configInitialValues]);

  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      const payload = Object.fromEntries(
        TEMPLATE_FIELDS.map((field) => [field.name, values[field.name]]),
      );

      if (botTokenInput.trim()) {
        payload.bot_token = botTokenInput.trim();
      }

      await updateConfig(payload).unwrap();
      message.success('Konfigurasi Telegram berhasil disimpan.');
      setBotTokenInput('');
      refetchConfig();
      refetchStatus();
    } catch (error) {
      if (error?.errorFields) return;
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

  return (
    <Flex gap={16} vertical={isMobile} align="flex-start">
      <MotionDiv
        variants={itemVariants}
        initial="hidden"
        animate="show"
        style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
        <Card
          title="Notifikasi Per Tap"
          style={innerCardStyle}
          loading={loadingConfig}
          styles={{ body: { padding: isMobile ? 12 : 20 } }}
          extra={
            <Button type="primary" icon={<Save size={14} />} loading={savingConfig} onClick={handleSaveConfig}>
              {isMobile ? null : 'Simpan'}
            </Button>
          }>
         
          <Form form={configForm} layout="vertical" initialValues={configInitialValues}>
            <Form.Item
              label="Bot Token (per satuan)"
              extra={
                <Text type="secondary">
                  Ambil dari BotFather. Kosongkan jika tidak ingin mengganti token yang sudah tersimpan
                  {config?.bot_token_masked ? ` (${config.bot_token_masked})` : ''}.
                </Text>
              }>
              <Input.Password
                value={botTokenInput}
                onChange={(event) => setBotTokenInput(event.target.value)}
                placeholder={config?.has_bot_token ? 'Token sudah tersimpan — isi untuk mengganti' : '123456:ABC-DEF...'}
              />
            </Form.Item>

            <Collapse
              size="small"
              defaultActiveKey={['parent']}
              items={TEMPLATE_GROUPS.map((group) => ({
                key: group.key,
                label: group.label,
                children: group.fields.map((field, index) => (
                  <Form.Item
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    rules={[{ required: true, message: `${field.label} wajib diisi.` }]}
                    extra={
                      index === group.fields.length - 1 ? (
                        <Text type="secondary" style={{ wordBreak: 'break-word' }}>
                          Placeholder: {GATE_PLACEHOLDERS}
                        </Text>
                      ) : null
                    }>
                    <Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} />
                  </Form.Item>
                )),
              }))}
            />
          </Form>
        </Card>
      </MotionDiv>

      <MotionDiv
        variants={itemVariants}
        initial="hidden"
        animate="show"
        style={{ flex: isMobile ? '1 1 auto' : '0 0 360px', width: isMobile ? '100%' : undefined }}>
        <Card
          title="Status Bot Telegram"
          style={innerCardStyle}
          styles={{ body: { padding: isMobile ? 12 : 20 } }}
          extra={
            <Button
              icon={<RefreshCw size={14} />}
              loading={fetchingStatus}
              onClick={() => {
                refetchStatus();
                refetchConfig();
              }}>
              {isMobile ? null : 'Refresh'}
            </Button>
          }>
          <Flex vertical gap={16}>
            <Card size="small" style={{ borderRadius: 12, background: '#f8fafc' }}>
              <Flex vertical gap={10}>
                <StatusRow label="Status">
                  <Tag color={botMeta.color} style={{ marginInlineEnd: 0 }}>
                    {botMeta.label}
                  </Tag>
                </StatusRow>
                <StatusRow label="Username Bot">
                  <Text strong>{status?.bot_username ? `@${status.bot_username}` : '-'}</Text>
                </StatusRow>
                <StatusRow label="Orang Tua Terhubung">
                  <Text strong>
                    {bindStats.bound_parents || 0} / {bindStats.total_parents || 0}
                  </Text>
                </StatusRow>
                {status?.last_error ? (
                  <StatusRow label="Error Terakhir">
                    <Text type="danger" style={{ wordBreak: 'break-word' }}>
                      {status.last_error}
                    </Text>
                  </StatusRow>
                ) : null}
              </Flex>
            </Card>

            {canSendMessages ? (
              <Alert
                type="success"
                showIcon
                message="Bot siap mengirim notifikasi."
                description="Orang tua, guru, dan siswa menghubungkan Telegram lewat tombol di portal masing-masing, lalu tekan Start."
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                message="Bot belum siap"
                description="Simpan bot token dari BotFather, lalu verifikasi."
              />
            )}

            <Button icon={<RefreshCw size={14} />} loading={verifyingBot} onClick={handleVerifyBot} block>
              Verifikasi Bot
            </Button>

            {status?.bot_deep_link_base ? (
              <Button
                href={status.bot_deep_link_base}
                target="_blank"
                rel="noreferrer"
                icon={<ExternalLink size={14} />}
                block>
                Buka Bot di Telegram
              </Button>
            ) : null}

            <Card size="small" title="Uji Coba Kirim" style={{ borderRadius: 12 }}>
              <Flex gap={8} vertical>
                <Input
                  value={testChatId}
                  onChange={(event) => setTestChatId(event.target.value)}
                  placeholder="chat_id, contoh: 123456789"
                  prefix={<MessageCircle size={16} />}
                />
                <Button
                  icon={<Send size={14} />}
                  loading={sendingTest}
                  disabled={!canSendMessages}
                  onClick={handleSendTest}
                  block>
                  Kirim Pesan Uji
                </Button>
              </Flex>
              <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                Chat ID didapat setelah pengguna menekan Start di bot Telegram.
              </Paragraph>
            </Card>
          </Flex>
        </Card>
      </MotionDiv>
    </Flex>
  );
};

export default TelegramFeatureTab;
