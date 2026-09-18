import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  FileSpreadsheet,
  Lock,
  Pencil,
  RefreshCw,
  Trash2,
  Unlock,
  WandSparkles,
} from "lucide-react";

import { LoadApp } from "../../../../components";
import {
  useDeleteHonorPayrollMutation,
  useGenerateHonorPayrollMutation,
  useGetHonorPayrollByIdQuery,
  useGetHonorPayrollsQuery,
  useLazyGetHonorariumPreviewQuery,
  useLockHonorPayrollMutation,
  useRecalcHonorPayrollMutation,
  useUnlockHonorPayrollMutation,
  useUpdateHonorPayrollLineMutation,
} from "../../../../service/finance/ApiHonorarium";
import { cardStyle, currencyFormatter, rupiahInputProps } from "../constants";
import { exportHonorPayrollExcel } from "../utils/exportHonorPayrollExcel";
import {
  findSuspiciousJamLines,
  formatHonorDateRange,
  getJamThreshold,
  isSuspiciousJam,
} from "../utils/honorDateJam";

const { Text, Title } = Typography;
const { TextArea } = Input;
const MotionDiv = motion.div;

const MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const HonorariumPayrollPreviewPanel = ({
  homebaseId,
  homebases = [],
  periodes = [],
  lockHomebase = false,
  onHomebaseChange,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [jamMode, setJamMode] = useState("mati");
  const [periodeId, setPeriodeId] = useState(undefined);
  const [selectedPayrollId, setSelectedPayrollId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();

  const defaultPeriodeId = useMemo(() => {
    const active = periodes.find((item) => item.is_default || item.is_active);
    return active
      ? Number(active.id)
      : periodes[0]
        ? Number(periodes[0].id)
        : undefined;
  }, [periodes]);

  const effectivePeriodeId = periodeId || defaultPeriodeId;

  const yearOptions = useMemo(() => {
    const base = now.getFullYear();
    return [base - 1, base, base + 1].map((value) => ({
      value,
      label: String(value),
    }));
  }, [now]);

  const listQuery = useGetHonorPayrollsQuery(
    { homebase_id: homebaseId, year },
    { skip: !homebaseId },
  );
  const payrolls = listQuery.data?.data || [];

  useEffect(() => {
    if (!homebaseId) {
      setSelectedPayrollId(null);
      return;
    }

    const matched = payrolls.find(
      (item) => Number(item.year) === Number(year) && Number(item.month) === Number(month),
    );
    setSelectedPayrollId(matched ? matched.id : null);
  }, [homebaseId, year, month, payrolls]);

  const detailQuery = useGetHonorPayrollByIdQuery(
    { id: selectedPayrollId, homebase_id: homebaseId },
    { skip: !homebaseId || !selectedPayrollId },
  );

  const detail = detailQuery.data?.data || null;
  const units = detail?.units || [];
  const isLocked = detail?.status === "locked";

  const [generatePayroll, generateState] = useGenerateHonorPayrollMutation();
  const [recalcPayroll, recalcState] = useRecalcHonorPayrollMutation();
  const [updateLine, updateLineState] = useUpdateHonorPayrollLineMutation();
  const [lockPayroll, lockState] = useLockHonorPayrollMutation();
  const [unlockPayroll, unlockState] = useUnlockHonorPayrollMutation();
  const [deletePayroll, deleteState] = useDeleteHonorPayrollMutation();
  const [fetchPreview] = useLazyGetHonorariumPreviewQuery();

  const suspiciousLines = useMemo(
    () =>
      findSuspiciousJamLines(
        (detail?.units || []).flatMap((unit) => unit.lines || []),
        detail?.jam_mode || jamMode,
      ),
    [detail, jamMode],
  );

  const flatRows = useMemo(() => {
    const rows = [];
    for (const unit of units) {
      rows.push({
        key: `unit-${unit.unit_id}`,
        row_type: "unit",
        unit_name: unit.unit_name,
      });
      for (const line of unit.lines || []) {
        rows.push({
          ...line,
          key: `line-${line.id}`,
          row_type: "line",
        });
      }
      rows.push({
        key: `subtotal-${unit.unit_id}`,
        row_type: "subtotal",
        unit_name: unit.unit_name,
        total_penerimaan: unit.subtotal,
      });
    }
    return rows;
  }, [units]);

  const confirmSuspiciousJam = (lines, mode) =>
    new Promise((resolve) => {
      const threshold = getJamThreshold(mode);
      const modeLabel = mode === "hidup" ? "jam hidup (bulanan)" : "jam mati (mingguan)";
      Modal.confirm({
        title: "Jam di luar kewajaran",
        width: 520,
        content: (
          <Flex vertical gap={8}>
            <Text>
              Ada baris dengan jam di atas ambang wajar{" "}
              <Text strong>
                {threshold} ({modeLabel})
              </Text>
              . Mohon konfirmasi apakah angka ini memang benar:
            </Text>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {lines.slice(0, 8).map((line) => (
                <li key={line.assignment_id || line.id || line.person_name}>
                  <Text strong>{line.person_name}</Text>
                  {`: ${Number(line.jam_final ?? line.jam_auto ?? 0)} jam`}
                  {line.subjects_text ? ` · ${line.subjects_text}` : ""}
                </li>
              ))}
            </ul>
            {lines.length > 8 ? (
              <Text type='secondary'>…dan {lines.length - 8} baris lainnya</Text>
            ) : null}
            <Text type='secondary' style={{ fontSize: 12 }}>
              Jam dihitung dari jadwal LMS berstatus published (bukan field
              weekly_sessions placeholder). Jam mati = total sesi/minggu; jam
              hidup = sesi sepanjang bulan.
            </Text>
          </Flex>
        ),
        okText: "Ya, lanjutkan",
        cancelText: "Batal",
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

  const runGenerate = async (replace = false) => {
    try {
      const previewResponse = await fetchPreview({
        homebase_id: homebaseId,
        year,
        month,
        jam_mode: jamMode,
        ...(effectivePeriodeId ? { periode_id: effectivePeriodeId } : {}),
      }).unwrap();

      const previewLines = previewResponse?.data?.lines || [];
      const highJamLines = findSuspiciousJamLines(previewLines, jamMode);
      if (highJamLines.length > 0) {
        const confirmed = await confirmSuspiciousJam(highJamLines, jamMode);
        if (!confirmed) {
          return;
        }
      }

      const response = await generatePayroll({
        homebase_id: homebaseId,
        year,
        month,
        jam_mode: jamMode,
        periode_id: effectivePeriodeId,
        replace,
      }).unwrap();

      setSelectedPayrollId(response?.data?.id || null);
      if (response?.warnings?.length) {
        message.warning(response.warnings[0]);
      }
      message.success(response?.message || "Payroll digenerate");
    } catch (error) {
      if (error?.status === 409 && error?.data?.data?.id && !replace) {
        Modal.confirm({
          title: "Payroll draft sudah ada",
          content: "Timpa draft bulan ini dengan hasil generate baru?",
          okText: "Timpa",
          cancelText: "Batal",
          onOk: () => runGenerate(true),
        });
        return;
      }
      message.error(error?.data?.message || "Gagal generate payroll");
    }
  };

  const handleRecalc = async () => {
    if (!selectedPayrollId) {
      return;
    }
    try {
      const response = await recalcPayroll({
        id: selectedPayrollId,
        homebase_id: homebaseId,
      }).unwrap();
      if (response?.warnings?.length) {
        message.warning(response.warnings[0]);
      }
      message.success("Payroll di-recalc");
    } catch (error) {
      message.error(error?.data?.message || "Gagal recalc payroll");
    }
  };

  const openEdit = (record) => {
    setEditingLine(record);
    form.setFieldsValue({
      jam_final: record.jam_final,
      hadir_final: record.hadir_final,
      rp_per_jam: record.rp_per_jam,
      transport_rate: record.transport_rate,
      tunjangan_wali_kelas: record.tunjangan_wali_kelas,
      tunjangan_jabatan: record.tunjangan_jabatan,
      gapok: record.gapok,
      notes: record.notes || "",
    });
    setEditOpen(true);
  };

  const handleSaveLine = async (values) => {
    try {
      if (isSuspiciousJam(values.jam_final, detail?.jam_mode || jamMode)) {
        const confirmed = await confirmSuspiciousJam(
          [
            {
              person_name: editingLine?.person_name,
              jam_final: values.jam_final,
              subjects_text: editingLine?.subjects_text,
              id: editingLine?.id,
            },
          ],
          detail?.jam_mode || jamMode,
        );
        if (!confirmed) {
          return;
        }
      }

      await updateLine({
        id: selectedPayrollId,
        lineId: editingLine.id,
        homebase_id: homebaseId,
        ...values,
      }).unwrap();
      message.success("Baris diperbarui");
      setEditOpen(false);
      setEditingLine(null);
      form.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan baris");
    }
  };

  const handleLockToggle = async () => {
    if (!selectedPayrollId) {
      return;
    }

    if (isLocked) {
      Modal.confirm({
        title: "Buka kunci payroll?",
        content:
          "Payroll akan kembali ke draft agar bisa dikoreksi. Jika bulan sudah ditutup buku, buka kunci tutup buku di Laporan Keuangan sebelum mengubah angka.",
        okText: "Buka kunci",
        cancelText: "Batal",
        onOk: async () => {
          try {
            const result = await unlockPayroll({
              id: selectedPayrollId,
              homebase_id: homebaseId,
            }).unwrap();
            message.success(
              result?.message || "Payroll dibuka kembali ke draft",
            );
            if (result?.meta?.period_locked) {
              message.warning(
                result.meta.period_lock_message ||
                  "Bulan masih ditutup buku. Buka kunci tutup buku dulu sebelum mengubah angka.",
              );
            }
          } catch (error) {
            message.error(
              error?.data?.message || "Gagal membuka kunci payroll",
            );
            throw error;
          }
        },
      });
      return;
    }

    Modal.confirm({
      title: "Lock payroll ini?",
      content:
        "Setelah di-lock, angka tidak bisa diubah sampai di-unlock kembali. Unlock selalu tersedia bila perlu koreksi.",
      okText: "Lock",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await lockPayroll({
            id: selectedPayrollId,
            homebase_id: homebaseId,
          }).unwrap();
          message.success("Payroll di-lock");
        } catch (error) {
          message.error(error?.data?.message || "Gagal mengunci payroll");
          throw error;
        }
      },
    });
  };

  const handleDelete = () => {
    if (!selectedPayrollId) {
      return;
    }
    Modal.confirm({
      title: "Hapus payroll draft?",
      content: "Semua baris bulan ini akan dihapus.",
      okText: "Hapus",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await deletePayroll({
            id: selectedPayrollId,
            homebase_id: homebaseId,
          }).unwrap();
          setSelectedPayrollId(null);
          message.success("Payroll dihapus");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus payroll");
        }
      },
    });
  };

  const handleExportExcel = () => {
    if (!detail?.id) {
      message.warning("Generate atau buka payroll terlebih dahulu");
      return;
    }

    if (!(detail.units || []).some((unit) => (unit.lines || []).length > 0)) {
      message.warning("Tidak ada baris untuk diekspor");
      return;
    }

    setExporting(true);
    try {
      const homebaseName =
        homebases.find((item) => Number(item.id) === Number(homebaseId))
          ?.name || detail.homebase_name;
      const filename = exportHonorPayrollExcel(detail, { homebaseName });
      message.success(`Excel diunduh: ${filename}`);
    } catch (error) {
      message.error(error?.message || "Gagal mengekspor Excel");
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "no",
        width: 48,
        align: "center",
        render: (value, record) => (record.row_type === "line" ? value : null),
      },
      {
        title: "Nama / Jabatan",
        key: "person",
        render: (_, record) => {
          if (record.row_type === "unit") {
            return (
              <Text strong style={{ color: "#9a3412" }}>
                {String(record.unit_name || "").toUpperCase()}
              </Text>
            );
          }
          if (record.row_type === "subtotal") {
            return (
              <Text strong type='secondary'>
                Subtotal {record.unit_name}
              </Text>
            );
          }
          return (
            <Space direction='vertical' size={0}>
              <Flex gap={6} wrap='wrap' align='center'>
                <Text strong>{record.person_name}</Text>
                {record.jam_overridden ? (
                  <Tag style={{ borderRadius: 999 }}>Jam edit</Tag>
                ) : null}
                {record.hadir_overridden ? (
                  <Tag style={{ borderRadius: 999 }}>Hadir edit</Tag>
                ) : null}
              </Flex>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.position_name}
                {" · "}
                {record.person_type === "teacher" ? "Guru" : "Tendik"}
              </Text>
            </Space>
          );
        },
      },
      {
        title: "Mapel",
        dataIndex: "subjects_text",
        width: 140,
        render: (value, record) =>
          record.row_type === "line" ? value || "-" : null,
      },
      {
        title: "Jam",
        dataIndex: "jam_final",
        width: 72,
        align: "center",
        render: (value, record) => {
          if (record.row_type !== "line") {
            return null;
          }
          const suspicious = isSuspiciousJam(
            value,
            detail?.jam_mode || jamMode,
          );
          return (
            <Text
              strong={suspicious}
              style={{ color: suspicious ? "#b91c1c" : undefined }}
              title={
                suspicious
                  ? `Di atas ambang ${getJamThreshold(detail?.jam_mode || jamMode)} · mati ${record.jam_mati} / hidup ${record.jam_hidup}`
                  : `mati ${record.jam_mati} / hidup ${record.jam_hidup}`
              }
            >
              {Number(value || 0)}
              {suspicious ? " !" : ""}
            </Text>
          );
        },
      },
      {
        title: "Hadir",
        dataIndex: "hadir_final",
        width: 64,
        align: "center",
        render: (value, record) =>
          record.row_type === "line" ? Number(value || 0) : null,
      },
      {
        title: "Honor",
        dataIndex: "honor_mengajar",
        width: 120,
        align: "right",
        render: (value, record) =>
          record.row_type === "line"
            ? currencyFormatter.format(Number(value || 0))
            : null,
      },
      {
        title: "Transport",
        dataIndex: "jumlah_transport",
        width: 110,
        align: "right",
        render: (value, record) =>
          record.row_type === "line"
            ? currencyFormatter.format(Number(value || 0))
            : null,
      },
      {
        title: "Gapok+Tunj",
        key: "fixed",
        width: 120,
        align: "right",
        render: (_, record) => {
          if (record.row_type !== "line") {
            return null;
          }
          const total =
            Number(record.gapok || 0) +
            Number(record.tunjangan_jabatan || 0) +
            Number(record.tunjangan_wali_kelas || 0);
          return currencyFormatter.format(total);
        },
      },
      {
        title: "Total",
        dataIndex: "total_penerimaan",
        width: 130,
        align: "right",
        render: (value, record) => {
          if (record.row_type === "unit") {
            return null;
          }
          return (
            <Text
              strong
              style={{
                color: record.row_type === "subtotal" ? "#9a3412" : undefined,
              }}
            >
              {currencyFormatter.format(Number(value || 0))}
            </Text>
          );
        },
      },
      {
        title: "",
        key: "action",
        width: 64,
        render: (_, record) =>
          record.row_type === "line" && !isLocked ? (
            <Button
              type='text'
              icon={<Pencil size={16} />}
              onClick={() => openEdit(record)}
            />
          ) : null,
      },
    ],
    [isLocked, detail?.jam_mode, jamMode],
  );

  if (!homebaseId) {
    return (
      <Card style={cardStyle}>
        <Text type='secondary'>Pilih satuan sekolah terlebih dahulu.</Text>
      </Card>
    );
  }

  return (
    <Flex vertical gap={isMobile ? 12 : 16}>
      <Card style={cardStyle} styles={{ body: { padding: isMobile ? 14 : 18 } }}>
        <Flex vertical gap={12}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={12}
          >
            <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ fontSize: 16 }}>
                Payroll Honorarium
              </Text>
              <Text type='secondary' style={{ fontSize: 13 }}>
                Generate draft dari jadwal published (jam mati/hidup), edit bila
                perlu, lalu lock & export Excel.
              </Text>
            </Flex>
            <Flex gap={8} wrap='wrap'>
              <Button
                type='primary'
                icon={<WandSparkles size={16} />}
                onClick={() => runGenerate(false)}
                loading={generateState.isLoading}
                style={{ borderRadius: 12 }}
              >
                Generate
              </Button>
              <Button
                icon={<RefreshCw size={16} />}
                onClick={handleRecalc}
                disabled={!selectedPayrollId || isLocked}
                loading={recalcState.isLoading}
                style={{ borderRadius: 12 }}
              >
                Recalc
              </Button>
              <Button
                icon={<FileSpreadsheet size={16} />}
                onClick={handleExportExcel}
                disabled={!selectedPayrollId || !detail}
                loading={exporting}
                style={{ borderRadius: 12 }}
              >
                Excel
              </Button>
              <Button
                icon={isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                onClick={handleLockToggle}
                disabled={!selectedPayrollId}
                loading={lockState.isLoading || unlockState.isLoading}
                style={{ borderRadius: 12 }}
              >
                {isLocked ? "Unlock" : "Lock"}
              </Button>
              <Button
                danger
                icon={<Trash2 size={16} />}
                onClick={handleDelete}
                disabled={!selectedPayrollId || isLocked}
                loading={deleteState.isLoading}
                style={{ borderRadius: 12 }}
              >
                Hapus
              </Button>
            </Flex>
          </Flex>

          <Flex gap={8} wrap='wrap'>
            {!lockHomebase ? (
              <Select
                placeholder='Satuan'
                value={homebaseId}
                onChange={onHomebaseChange}
                style={{ minWidth: isMobile ? "100%" : 200 }}
                options={homebases.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            ) : null}
            <Select
              placeholder='Periode'
              value={effectivePeriodeId}
              onChange={setPeriodeId}
              style={{ minWidth: isMobile ? "100%" : 200 }}
              options={periodes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            <Select
              value={month}
              onChange={setMonth}
              style={{ minWidth: isMobile ? "48%" : 140 }}
              options={MONTH_OPTIONS}
            />
            <Select
              value={year}
              onChange={setYear}
              style={{ minWidth: isMobile ? "48%" : 110 }}
              options={yearOptions}
            />
            <Select
              value={jamMode}
              onChange={setJamMode}
              style={{ minWidth: isMobile ? "100%" : 180 }}
              options={[
                { value: "mati", label: "Jam mati (sesi/minggu jadwal)" },
                { value: "hidup", label: "Jam hidup (sesi/bulan jadwal)" },
              ]}
            />
          </Flex>
        </Flex>
      </Card>

      {listQuery.isLoading || (selectedPayrollId && detailQuery.isLoading) ? (
        <LoadApp />
      ) : !selectedPayrollId ? (
        <Card style={cardStyle}>
          <Empty
            description={
              <Flex vertical gap={4} align='center'>
                <Text strong>Belum ada payroll untuk bulan ini</Text>
                <Text type='secondary' style={{ fontSize: 13 }}>
                  Klik Generate untuk membuat draft dari assignment aktif.
                </Text>
              </Flex>
            }
          />
        </Card>
      ) : detailQuery.isError ? (
        <Card style={cardStyle}>
          <Empty
            description={
              detailQuery.error?.data?.message || "Gagal memuat payroll"
            }
          />
        </Card>
      ) : (
        <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: isMobile ? 10 : 14 } }}
          >
            <Flex
              justify='space-between'
              align='center'
              wrap='wrap'
              gap={10}
              style={{ marginBottom: 12 }}
            >
              <Space wrap>
                <Tag
                  color={isLocked ? "red" : "green"}
                  style={{ borderRadius: 999 }}
                >
                  {isLocked ? "Locked" : "Draft"}
                </Tag>
                <Tag color='orange' style={{ borderRadius: 999 }}>
                  {detail.jam_mode === "hidup" ? "Jam hidup" : "Jam mati"}
                </Tag>
                <Tag style={{ borderRadius: 999 }}>
                  {detail.periode_name || "Tanpa periode"}
                </Tag>
                <Tag style={{ borderRadius: 999 }}>
                  {formatHonorDateRange(detail.start_date, detail.end_date)}
                </Tag>
              </Space>
              <Title level={5} style={{ margin: 0, color: "#9a3412" }}>
                Total{" "}
                {currencyFormatter.format(detail.summary?.grand_total || 0)}
              </Title>
            </Flex>

            {suspiciousLines.length > 0 ? (
              <Alert
                type='warning'
                showIcon
                style={{ marginBottom: 12 }}
                message={`Ada ${suspiciousLines.length} baris dengan jam di luar kewajaran`}
                description={
                  <span>
                    Ambang{" "}
                    {detail.jam_mode === "hidup" ? "jam hidup" : "jam mati"}:{" "}
                    {getJamThreshold(detail.jam_mode)}. Contoh:{" "}
                    {suspiciousLines
                      .slice(0, 3)
                      .map(
                        (line) =>
                          `${line.person_name} (${Number(line.jam_final || 0)})`,
                      )
                      .join(", ")}
                    . Periksa teaching load / edit jam sebelum lock.
                  </span>
                }
              />
            ) : null}

            {flatRows.length === 0 ? (
              <Alert
                type='info'
                showIcon
                message='Payroll kosong'
                description='Tidak ada assignment aktif saat generate. Tambah di tab Personel, lalu Generate ulang.'
              />
            ) : (
              <Table
                rowKey='key'
                size={isMobile ? "small" : "middle"}
                columns={columns}
                dataSource={flatRows}
                loading={detailQuery.isFetching}
                pagination={false}
                scroll={{ x: 1020 }}
              />
            )}
          </Card>
        </MotionDiv>
      )}

      <Modal
        title={`Edit — ${editingLine?.person_name || "Baris"}`}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditingLine(null);
          form.resetFields();
        }}
        onOk={form.submit}
        okText='Simpan'
        cancelText='Batal'
        confirmLoading={updateLineState.isLoading}
        destroyOnClose
        centered
        width={isMobile ? "calc(100vw - 24px)" : 560}
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSaveLine}
          style={{ marginTop: 12 }}
        >
          <Flex gap={12} wrap='wrap'>
            <Form.Item
              name='jam_final'
              label={`Jam final (auto: ${editingLine?.jam_auto ?? 0} · mati ${editingLine?.jam_mati ?? 0} / hidup ${editingLine?.jam_hidup ?? 0})`}
              extra={`Ambang wajar ${getJamThreshold(detail?.jam_mode || jamMode)} untuk mode ${detail?.jam_mode || jamMode}. Nilai jauh di atas ini perlu dikonfirmasi.`}
              style={{ flex: 1, minWidth: 140 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name='hadir_final'
              label={`Hadir final (auto: ${editingLine?.hadir_auto ?? 0})`}
              style={{ flex: 1, minWidth: 140 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Flex>
          <Flex gap={12} wrap='wrap'>
            <Form.Item name='rp_per_jam' label='Rp / Jam' style={{ flex: 1, minWidth: 140 }}>
              <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
            </Form.Item>
            <Form.Item
              name='transport_rate'
              label='Transport / hari'
              style={{ flex: 1, minWidth: 140 }}
            >
              <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
            </Form.Item>
          </Flex>
          <Form.Item name='tunjangan_wali_kelas' label='Tunjangan Wali Kelas'>
            <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
          </Form.Item>
          <Form.Item name='tunjangan_jabatan' label='Tunjangan Jabatan'>
            <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
          </Form.Item>
          <Form.Item name='gapok' label='Gapok'>
            <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
          </Form.Item>
          <Form.Item name='notes' label='Catatan'>
            <TextArea rows={2} placeholder='Opsional' />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default HonorariumPayrollPreviewPanel;
