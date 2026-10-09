import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { Lock, Unlock } from "lucide-react";

import {
  useGetClosingsQuery,
  useLockClosingMutation,
  useUnlockClosingMutation,
} from "../../../../service/finance/ApiReport";
import { cardStyle } from "../constants";

const { Text, Title } = Typography;

const ReportClosingsPanel = ({ homebaseId, embedded = false }) => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [notes, setNotes] = useState("");

  const { data: response, isFetching } = useGetClosingsQuery(
    { homebase_id: homebaseId, year },
    { skip: !homebaseId },
  );
  const [lockClosing, lockState] = useLockClosingMutation();
  const [unlockClosing, unlockState] = useUnlockClosingMutation();

  const months = response?.data?.months || [];
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => {
      const value = current - 2 + index;
      return { value, label: String(value) };
    });
  }, []);

  const handleLock = (month, monthLabel) => {
    Modal.confirm({
      title: `Tutup buku ${monthLabel} ${year}?`,
      content:
        "Setelah ditutup, pengeluaran harian dan perubahan angka honorarium pada bulan ini ditolak. Kunci dapat dibuka kembali kapan saja untuk koreksi.",
      okText: "Tutup Buku",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await lockClosing({
            homebase_id: homebaseId,
            year,
            month,
            notes: notes.trim() || undefined,
          }).unwrap();
          message.success(`Tutup buku ${monthLabel} ${year} berhasil dikunci`);
          setNotes("");
        } catch (error) {
          message.error(error?.data?.message || "Gagal mengunci periode");
          throw error;
        }
      },
    });
  };

  const handleUnlock = (row) => {
    Modal.confirm({
      title: `Buka kunci ${row.month_label} ${year}?`,
      content:
        "Setelah dibuka, pengeluaran harian dan payroll honorarium pada bulan ini dapat dikoreksi lagi. Setelah selesai, kunci kembali (tutup buku) agar laporan tetap aman.",
      okText: "Buka kunci",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await unlockClosing({
            id: row.lock_id,
            homebase_id: homebaseId,
          }).unwrap();
          message.success(
            `${row.month_label} ${year} dibuka kembali — data siap dikoreksi`,
          );
        } catch (error) {
          message.error(error?.data?.message || "Gagal membuka kunci periode");
          throw error;
        }
      },
    });
  };

  const columns = [
    {
      title: "Bulan",
      dataIndex: "month_label",
      key: "month_label",
      render: (value) => <span style={{ fontWeight: 600 }}>{value}</span>,
    },
    {
      title: "Status",
      dataIndex: "locked",
      key: "locked",
      width: 140,
      render: (locked) =>
        locked ? (
          <Tag color='red'>Terkunci</Tag>
        ) : (
          <Tag color='green'>Terbuka</Tag>
        ),
    },
    {
      title: "Dikunci oleh",
      key: "locked_meta",
      render: (_, row) =>
        row.locked ? (
          <div>
            <div>{row.locked_by_name || "-"}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {row.locked_at
                ? dayjs(row.locked_at).format("DD MMM YYYY HH:mm")
                : "-"}
            </div>
          </div>
        ) : (
          <Text type='secondary'>—</Text>
        ),
    },
    {
      title: "Catatan",
      dataIndex: "notes",
      key: "notes",
      render: (value) => value || <Text type='secondary'>—</Text>,
    },
    {
      title: "Aksi",
      key: "actions",
      width: 170,
      render: (_, row) =>
        row.locked ? (
          <Button
            size='small'
            type='primary'
            icon={<Unlock size={14} />}
            loading={unlockState.isLoading}
            disabled={!row.lock_id}
            onClick={() => handleUnlock(row)}
          >
            Buka kunci
          </Button>
        ) : (
          <Button
            size='small'
            danger
            icon={<Lock size={14} />}
            loading={lockState.isLoading}
            onClick={() => handleLock(row.month, row.month_label)}
          >
            Tutup Buku
          </Button>
        ),
    },
  ];

  const content = (
    <>
      <Flex
        justify='space-between'
        align='flex-start'
        gap={12}
        wrap='wrap'
        style={{ marginBottom: 14 }}
      >
        <div>
          {!embedded ? (
            <Title level={5} style={{ margin: 0 }}>
              Tutup Buku Bulanan
            </Title>
          ) : null}
          <Text type='secondary'>
            Bulan terkunci menolak perubahan pengeluaran harian dan angka
            honorarium. Kunci selalu dapat dibuka kembali untuk koreksi.
          </Text>
        </div>
        <Space wrap>
          <Select
            value={year}
            options={yearOptions}
            style={{ width: 110 }}
            onChange={setYear}
          />
          <Input
            allowClear
            placeholder='Catatan tutup buku (opsional)'
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            style={{ minWidth: 220 }}
          />
        </Space>
      </Flex>

      <Alert
        type='info'
        showIcon
        style={{ marginBottom: 14 }}
        message='Alur koreksi: Buka kunci tutup buku → Unlock honorarium (jika terkunci) → perbaiki data → Lock honorarium → Tutup buku kembali.'
      />

      <Table
        rowKey='month'
        columns={columns}
        dataSource={months}
        loading={isFetching}
        pagination={false}
        size='middle'
        scroll={{ x: 780 }}
      />
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card style={cardStyle} styles={{ body: { padding: 18 } }}>
      {content}
    </Card>
  );
};

export default ReportClosingsPanel;
