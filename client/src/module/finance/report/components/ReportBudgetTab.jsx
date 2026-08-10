import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Flex,
  InputNumber,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Save } from "lucide-react";

import { useSaveBudgetsMutation } from "../../../../service/finance/ApiReport";
import { currencyFormatter } from "../constants";

const { Text } = Typography;

const rupiahInputProps = {
  style: { width: "100%" },
  min: 0,
  formatter: (value) =>
    `Rp ${String(value || 0)}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
  parser: (value) => String(value || "").replace(/[^\d]/g, ""),
};

const kindTag = (kind) =>
  kind === "income" ? (
    <Tag color='green'>Pendapatan</Tag>
  ) : (
    <Tag color='red'>Pengeluaran</Tag>
  );

const percentColor = (value) => {
  if (value === null || value === undefined) return "#94a3b8";
  if (value > 100) return "#dc2626";
  if (value >= 75) return "#d97706";
  return "#16a34a";
};

const ReportBudgetTab = ({ homebaseId, periodeId, items = [] }) => {
  const [draftAmounts, setDraftAmounts] = useState({});
  const [saveBudgets, saveState] = useSaveBudgetsMutation();

  useEffect(() => {
    const next = {};
    for (const item of items) {
      next[`${item.kind}:${item.category}`] = Number(item.budget_amount || 0);
    }
    setDraftAmounts(next);
  }, [items]);

  const rows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        key: `${item.kind}:${item.category}`,
      })),
    [items],
  );

  const isDirty = useMemo(
    () =>
      rows.some(
        (row) =>
          Number(draftAmounts[row.key] ?? 0) !== Number(row.budget_amount || 0),
      ),
    [draftAmounts, rows],
  );

  const handleSave = async () => {
    try {
      await saveBudgets({
        homebase_id: homebaseId,
        periode_id: periodeId,
        items: rows.map((row) => ({
          kind: row.kind,
          category: row.category,
          amount: Number(draftAmounts[row.key] ?? 0),
        })),
      }).unwrap();
      message.success("Anggaran berhasil disimpan");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan anggaran");
    }
  };

  const columns = [
    {
      title: "Uraian",
      dataIndex: "label",
      key: "label",
      render: (value, row) => (
        <Space size={8}>
          {kindTag(row.kind)}
          <span style={{ fontWeight: 600 }}>{value}</span>
        </Space>
      ),
    },
    {
      title: "Anggaran",
      key: "budget_amount",
      width: 210,
      render: (_, row) => (
        <InputNumber
          {...rupiahInputProps}
          value={draftAmounts[row.key] ?? 0}
          onChange={(value) =>
            setDraftAmounts((prev) => ({
              ...prev,
              [row.key]: Number(value || 0),
            }))
          }
        />
      ),
    },
    {
      title: "Realisasi",
      dataIndex: "realized_amount",
      key: "realized_amount",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Selisih",
      dataIndex: "variance",
      key: "variance",
      align: "right",
      render: (_, row) => {
        const budget = Number(draftAmounts[row.key] ?? row.budget_amount ?? 0);
        const variance = Number(row.realized_amount || 0) - budget;
        // Pendapatan: positif = melampaui target. Pengeluaran: positif = melebihi anggaran.
        const good = row.kind === "income" ? variance >= 0 : variance <= 0;
        return (
          <span style={{ fontWeight: 600, color: good ? "#15803d" : "#dc2626" }}>
            {currencyFormatter.format(variance)}
          </span>
        );
      },
    },
    {
      title: "Capaian / Penyerapan",
      key: "percent",
      width: 190,
      render: (_, row) => {
        const budget = Number(draftAmounts[row.key] ?? row.budget_amount ?? 0);
        if (budget <= 0) {
          return <Text type='secondary'>Belum dianggarkan</Text>;
        }
        const percent =
          Math.round((Number(row.realized_amount || 0) / budget) * 1000) / 10;
        return (
          <Progress
            percent={Math.min(percent, 100)}
            size='small'
            strokeColor={
              row.kind === "income" ? "#16a34a" : percentColor(percent)
            }
            format={() => `${percent}%`}
          />
        );
      },
    },
  ];

  if (!periodeId) {
    return (
      <Alert
        type='info'
        showIcon
        message='Pilih periode terlebih dahulu untuk mengelola anggaran (RAPBS).'
      />
    );
  }

  return (
    <>
      <Flex
        justify='space-between'
        align='center'
        gap={12}
        wrap='wrap'
        style={{ marginBottom: 14 }}
      >
        <Text type='secondary'>
          Anggaran berlaku untuk satu periode utuh. Realisasi pendapatan dihitung
          dari kas masuk terkonfirmasi; realisasi pengeluaran dari pengeluaran
          harian dan payroll honorarium terkunci.
        </Text>
        <Button
          type='primary'
          icon={<Save size={15} />}
          disabled={!isDirty}
          loading={saveState.isLoading}
          onClick={handleSave}
        >
          Simpan Anggaran
        </Button>
      </Flex>

      <Table
        rowKey='key'
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 900 }}
        size='middle'
      />
    </>
  );
};

export default ReportBudgetTab;
