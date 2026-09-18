import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Modal,
  Row,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  BarChart3,
  CircleDollarSign,
  Eye,
  Gift,
  Info,
  Layers3,
  Target,
  Users,
} from "lucide-react";

import {
  cardStyle,
  chargeStatusColorMap,
  chargeStatusLabelMap,
  currencyFormatter,
} from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const columnTooltips = {
  target:
    "Target netto: total tagihan yang harus dibayar siswa setelah potongan beasiswa.",
  realization: "Realisasi: total pembayaran yang sudah masuk (kas).",
  remaining: "Sisa: target netto dikurangi realisasi (belum tertagih).",
  realizationRemaining:
    "Realisasi: total pembayaran yang sudah masuk (kas). Sisa: target netto dikurangi realisasi.",
};

const ColumnTitleWithTip = ({ label, tip }) => (
  <Space size={4}>
    <span>{label}</span>
    <Tooltip title={tip}>
      <Info size={13} color='#94a3b8' style={{ cursor: "help", display: "block" }} />
    </Tooltip>
  </Space>
);

const reportCardMeta = {
  target: {
    icon: <Target size={18} />,
    bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
    color: "#2563eb",
  },
  realization: {
    icon: <CircleDollarSign size={18} />,
    bg: "linear-gradient(135deg, #dcfce7, #ecfdf5)",
    color: "#15803d",
  },
  remaining: {
    icon: <BarChart3 size={18} />,
    bg: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
    color: "#7c3aed",
  },
  coverage: {
    icon: <Layers3 size={18} />,
    bg: "linear-gradient(135deg, #fef3c7, #fff7ed)",
    color: "#d97706",
  },
  scholarship: {
    icon: <Gift size={18} />,
    bg: "linear-gradient(135deg, #dbeafe, #e0e7ff)",
    color: "#1d4ed8",
  },
};

const getPeriodeName = (charge = {}) =>
  charge.periode_name ||
  charge.periode?.periode_name ||
  charge.periode?.name ||
  "-";

const getScopeLabel = (scope) => (scope === "student" ? "Individu" : "Tingkat");

const compareCharges = (left, right) => {
  const classCompare = String(left.class_name || "").localeCompare(
    String(right.class_name || ""),
    "id",
    { sensitivity: "base" },
  );
  if (classCompare !== 0) {
    return classCompare;
  }

  return String(left.student_name || "").localeCompare(
    String(right.student_name || ""),
    "id",
    { sensitivity: "base" },
  );
};

const getScholarshipNames = (charge) => {
  const names = Array.isArray(charge.scholarship_names)
    ? [...new Set(charge.scholarship_names.filter(Boolean))]
    : [];
  if (names.length > 0) {
    return names;
  }
  if (Number(charge.scholarship_cover || 0) > 0 || charge.has_scholarship) {
    return ["Beasiswa"];
  }
  return [];
};

const OthersReportPanel = ({ charges = [] }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("Detail Siswa");
  const [detailStudents, setDetailStudents] = useState([]);
  const [detailTab, setDetailTab] = useState("paid");

  const reportMap = new Map();

  charges.forEach((charge) => {
    const typeId = charge.type_id || "unknown";
    const periodeId = charge.periode_id || "all";
    const key = `${typeId}-${periodeId}`;
    const currentItem = reportMap.get(key) || {
      key,
      typeId,
      feeType: charge.type_name || "Tanpa Jenis",
      periodeId,
      periodeName: getPeriodeName(charge),
      scope: charge.type_scope === "student" ? "student" : "grade",
      targetAmount: 0,
      brutoAmount: 0,
      scholarshipCover: 0,
      realizationAmount: 0,
      remainingAmount: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      studentIds: new Set(),
      students: [],
    };

    currentItem.targetAmount += Number(charge.amount_due || 0);
    currentItem.brutoAmount += Number(
      charge.bruto_amount != null
        ? charge.bruto_amount
        : Number(charge.amount_due || 0) + Number(charge.scholarship_cover || 0),
    );
    currentItem.scholarshipCover += Number(charge.scholarship_cover || 0);
    currentItem.realizationAmount += Number(charge.paid_amount || 0);
    currentItem.remainingAmount += Number(
      charge.remaining_amount ??
        Math.max(
          Number(charge.amount_due || 0) - Number(charge.paid_amount || 0),
          0,
        ),
    );
    currentItem.students.push(charge);

    if (charge.student_id) {
      currentItem.studentIds.add(Number(charge.student_id));
    }

    if (charge.status === "paid") {
      currentItem.paidCount += 1;
    } else if (charge.status === "partial") {
      currentItem.partialCount += 1;
    } else {
      currentItem.unpaidCount += 1;
    }

    if (!currentItem.periodeName || currentItem.periodeName === "-") {
      currentItem.periodeName = getPeriodeName(charge);
    }

    if (charge.type_scope === "student") {
      currentItem.scope = "student";
    }

    reportMap.set(key, currentItem);
  });

  const dataSource = Array.from(reportMap.values())
    .map((item) => {
      const chargeCount = item.paidCount + item.partialCount + item.unpaidCount;
      const achievement =
        item.targetAmount > 0
          ? Math.round((item.realizationAmount / item.targetAmount) * 100)
          : 0;

      return {
        ...item,
        chargeCount,
        studentCount: item.studentIds.size,
        remainingAmount: Math.max(item.remainingAmount, 0),
        achievement,
        achievementMeta:
          achievement >= 100
            ? { label: `${achievement}%`, color: "green" }
            : achievement >= 60
              ? { label: `${achievement}%`, color: "blue" }
              : { label: `${achievement}%`, color: "gold" },
      };
    })
    .sort((left, right) => {
      const periodeCompare = String(left.periodeName).localeCompare(
        String(right.periodeName),
        "id",
        { sensitivity: "base" },
      );
      if (periodeCompare !== 0) {
        return periodeCompare;
      }

      return right.targetAmount - left.targetAmount;
    });

  const totalTarget = dataSource.reduce((sum, item) => sum + item.targetAmount, 0);
  const totalBruto = dataSource.reduce((sum, item) => sum + item.brutoAmount, 0);
  const totalScholarshipCover = dataSource.reduce(
    (sum, item) => sum + item.scholarshipCover,
    0,
  );
  const totalRealization = dataSource.reduce(
    (sum, item) => sum + item.realizationAmount,
    0,
  );
  const totalRemaining = Math.max(totalTarget - totalRealization, 0);
  const gradeScopedCount = dataSource.filter((item) => item.scope === "grade").length;
  const studentScopedCount = dataSource.filter(
    (item) => item.scope === "student",
  ).length;
  const periodeCount = new Set(
    dataSource.map((item) => item.periodeId).filter((item) => item !== "all"),
  ).size;

  const summaryItems = [
    {
      key: "target",
      label: "Target Netto",
      value: currencyFormatter.format(totalTarget),
      note: `Bruto ${currencyFormatter.format(totalBruto)}`,
    },
    {
      key: "scholarship",
      label: "Cover Beasiswa",
      value: currencyFormatter.format(totalScholarshipCover),
      note: "Potongan beasiswa (bukan kas)",
    },
    {
      key: "realization",
      label: "Total Realisasi",
      value: currencyFormatter.format(totalRealization),
      note: `${charges.filter((item) => item.status === "paid").length} lunas`,
    },
    {
      key: "remaining",
      label: "Sisa Tagihan",
      value: currencyFormatter.format(totalRemaining),
      note: `${charges.filter((item) => item.status !== "paid").length} belum lunas`,
    },
    {
      key: "coverage",
      label: "Cakupan Jenis",
      value: `${gradeScopedCount}/${studentScopedCount}`,
      note: "Tingkat / Individu",
    },
  ];

  const openDetail = (students, title, preferredTab = "paid") => {
    const sorted = [...students].sort(compareCharges);
    const paidCount = sorted.filter((item) => item.status === "paid").length;
    const unpaidCount = sorted.filter((item) => item.status !== "paid").length;
    const scholarshipCount = sorted.filter(
      (item) => Number(item.scholarship_cover || 0) > 0 || item.has_scholarship,
    ).length;

    let nextTab = preferredTab;
    if (preferredTab === "paid" && paidCount === 0 && unpaidCount > 0) {
      nextTab = "unpaid";
    } else if (
      preferredTab === "unpaid" &&
      unpaidCount === 0 &&
      paidCount > 0
    ) {
      nextTab = "paid";
    } else if (
      preferredTab === "scholarship" &&
      scholarshipCount === 0 &&
      paidCount > 0
    ) {
      nextTab = "paid";
    } else if (
      preferredTab === "scholarship" &&
      scholarshipCount === 0 &&
      unpaidCount > 0
    ) {
      nextTab = "unpaid";
    }

    setDetailStudents(sorted);
    setDetailTitle(title);
    setDetailTab(nextTab);
    setDetailOpen(true);
  };

  const detailBuckets = useMemo(() => {
    const paid = detailStudents.filter((item) => item.status === "paid");
    const unpaid = detailStudents.filter((item) => item.status !== "paid");
    const scholarship = detailStudents.filter(
      (item) => Number(item.scholarship_cover || 0) > 0 || item.has_scholarship,
    );
    return { paid, unpaid, scholarship };
  }, [detailStudents]);

  const detailColumns = [
    {
      title: "No",
      key: "no",
      width: 40,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Siswa",
      key: "student",
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (_, record) => {
        const scholarshipNames = getScholarshipNames(record);
        return (
          <Space direction='vertical' size={2} style={{ width: "100%", minWidth: 0 }}>
            <Text strong style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
              {record.student_name || "-"}
            </Text>
            <Text
              type='secondary'
              style={{ fontSize: 12, wordBreak: "break-word", whiteSpace: "normal" }}
            >
              NIS {record.nis || "-"}
              {record.class_name ? ` · ${record.class_name}` : ""}
              {record.grade_name ? ` · ${record.grade_name}` : ""}
            </Text>
            {scholarshipNames.length > 0 ? (
              <Space size={[4, 4]} wrap>
                {scholarshipNames.map((name) => (
                  <Tag
                    key={name}
                    color='geekblue'
                    style={{
                      borderRadius: 999,
                      margin: 0,
                      maxWidth: "100%",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {name}
                  </Tag>
                ))}
              </Space>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "Tagihan",
      key: "amount",
      width: isMobile ? 112 : 132,
      align: "right",
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (_, record) => (
        <Space
          direction='vertical'
          size={2}
          style={{ width: "100%", minWidth: 0, alignItems: "flex-end" }}
        >
          <Text strong style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
            {currencyFormatter.format(Number(record.amount_due || 0))}
          </Text>
          <Text
            type='secondary'
            style={{ fontSize: 12, wordBreak: "break-word", whiteSpace: "normal" }}
          >
            Dibayar {currencyFormatter.format(Number(record.paid_amount || 0))}
          </Text>
          {Number(record.scholarship_cover || 0) > 0 ? (
            <Text
              type='secondary'
              style={{ fontSize: 12, wordBreak: "break-word", whiteSpace: "normal" }}
            >
              Cover{" "}
              {currencyFormatter.format(Number(record.scholarship_cover || 0))}
            </Text>
          ) : null}
          <Tag
            color={chargeStatusColorMap[record.status] || "default"}
            style={{
              borderRadius: 999,
              margin: 0,
              fontWeight: 600,
              maxWidth: "100%",
              whiteSpace: "normal",
            }}
          >
            {chargeStatusLabelMap[record.status] || record.status || "-"}
          </Tag>
        </Space>
      ),
    },
  ];

  const renderDetailTable = (rows, emptyDescription) => (
    <div style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <Table
        rowKey={(record) =>
          record.charge_id ||
          `${record.student_id}-${record.type_id}-${record.periode_id}`
        }
        columns={detailColumns}
        dataSource={rows}
        size='small'
        tableLayout='fixed'
        style={{ width: "100%" }}
        styles={{
          root: { width: "100%", maxWidth: "100%" },
          content: { overflow: "hidden" },
          body: { overflow: "hidden" },
        }}
        pagination={{
          pageSize: isMobile ? 5 : 8,
          size: "small",
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} dari ${total} siswa`,
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyDescription}
            />
          ),
        }}
      />
    </div>
  );

  const desktopColumns = [
    {
      title: "Jenis Biaya / Periode",
      key: "feeType",
      width: 280,
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text strong>{record.feeType}</Text>
          <Text type='secondary'>{record.periodeName || "-"}</Text>
          <Space size={6} wrap>
            <Tag
              color={record.scope === "student" ? "blue" : "cyan"}
              style={{ borderRadius: 999, margin: 0, fontWeight: 600 }}
            >
              {getScopeLabel(record.scope)}
            </Tag>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.scope === "student"
                ? `${record.studentCount} siswa`
                : `${record.chargeCount} tagihan`}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: (
        <ColumnTitleWithTip label='Target Netto' tip={columnTooltips.target} />
      ),
      dataIndex: "targetAmount",
      key: "targetAmount",
      width: 150,
      render: (value) => currencyFormatter.format(value),
    },
    {
      title: "Beasiswa",
      dataIndex: "scholarshipCover",
      key: "scholarshipCover",
      width: 130,
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: (
        <ColumnTitleWithTip
          label='Realisasi / Sisa'
          tip={columnTooltips.realizationRemaining}
        />
      ),
      key: "realizationRemaining",
      width: 170,
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Tooltip title={columnTooltips.realization}>
            <Text style={{ cursor: "help" }}>
              {currencyFormatter.format(record.realizationAmount)}
            </Text>
          </Tooltip>
          <Tooltip title={columnTooltips.remaining}>
            <Text type='secondary' style={{ fontSize: 12, cursor: "help" }}>
              Sisa {currencyFormatter.format(record.remainingAmount)}
            </Text>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Status Tagihan",
      key: "statusBreakdown",
      width: 180,
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text>
            Lunas {record.paidCount}/{record.chargeCount}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            Cicilan {record.partialCount} · Belum bayar {record.unpaidCount}
          </Text>
        </Space>
      ),
    },
    {
      title: "Capaian",
      dataIndex: "achievementMeta",
      key: "achievementMeta",
      width: 110,
      render: (value) => (
        <Tag color={value.color} style={{ borderRadius: 999, fontWeight: 600 }}>
          {value.label}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Button
          type='link'
          size='small'
          icon={<Eye size={14} />}
          onClick={() =>
            openDetail(
              record.students,
              `Detail ${record.feeType} · ${record.periodeName || "-"}`,
            )
          }
        >
          Detail
        </Button>
      ),
    },
  ];

  const mobileColumns = [
    {
      title: "Jenis Biaya",
      key: "feeType",
      render: (_, record) => (
        <Flex vertical gap={10} style={{ width: "100%" }}>
          <Flex justify='space-between' align='flex-start' gap={8}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ display: "block" }}>
                {record.feeType}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.periodeName || "-"} · {getScopeLabel(record.scope)}
              </Text>
            </div>
            <Tag
              color={record.achievementMeta.color}
              style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}
            >
              {record.achievementMeta.label}
            </Tag>
          </Flex>
          <Flex justify='space-between' gap={8} wrap='wrap'>
            <div>
              <Tooltip title={columnTooltips.target}>
                <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                  Target
                </Text>
              </Tooltip>
              <Text strong style={{ fontSize: 13 }}>
                {currencyFormatter.format(record.targetAmount)}
              </Text>
            </div>
            <div>
              <Tooltip title={columnTooltips.realizationRemaining}>
                <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                  Realisasi / Sisa
                </Text>
              </Tooltip>
              <Tooltip title={columnTooltips.realization}>
                <Text
                  strong
                  style={{ fontSize: 13, display: "block", cursor: "help" }}
                >
                  {currencyFormatter.format(record.realizationAmount)}
                </Text>
              </Tooltip>
              <Tooltip title={columnTooltips.remaining}>
                <Text type='secondary' style={{ fontSize: 12, cursor: "help" }}>
                  Sisa {currencyFormatter.format(record.remainingAmount)}
                </Text>
              </Tooltip>
            </div>
            <div>
              <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                Lunas
              </Text>
              <Text strong style={{ fontSize: 13 }}>
                {record.paidCount}/{record.chargeCount}
              </Text>
            </div>
          </Flex>
          <Button
            type='default'
            size='small'
            icon={<Eye size={14} />}
            onClick={() =>
              openDetail(
                record.students,
                `Detail ${record.feeType} · ${record.periodeName || "-"}`,
              )
            }
            block
          >
            Detail siswa
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <Row gutter={[12, 12]}>
      {summaryItems.map((item, index) => {
        const meta = reportCardMeta[item.key];
        return (
          <Col xs={24} sm={12} xl={8} xxl={4} key={item.key}>
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={isMobile ? undefined : { y: -4 }}
            >
              <Card
                style={{
                  ...cardStyle,
                  borderRadius: isMobile ? 18 : 24,
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                }}
                styles={{ body: { padding: isMobile ? 14 : 20 } }}
              >
                <Flex align='center' gap={isMobile ? 10 : 14}>
                  <div
                    style={{
                      width: isMobile ? 40 : 44,
                      height: isMobile ? 40 : 44,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 16,
                      background: meta.bg,
                      color: meta.color,
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                      {item.label}
                    </Text>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: isMobile ? 18 : 26,
                        fontWeight: 700,
                        color: "#0f172a",
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.value}
                    </div>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {item.note}
                    </Text>
                  </div>
                </Flex>
              </Card>
            </MotionDiv>
          </Col>
        );
      })}

      <Col span={24}>
        <Card
          style={{
            ...cardStyle,
            borderRadius: isMobile ? 18 : 24,
            overflow: "hidden",
          }}
          styles={{ body: { padding: isMobile ? 12 : 24 } }}
          title={
            <Space direction='vertical' size={2} style={{ maxWidth: "100%" }}>
              <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                Laporan per Jenis Biaya & Periode
              </Text>
              {!isMobile ? (
                <Text type='secondary' style={{ fontSize: 13, fontWeight: 400 }}>
                  Ringkasan mengikuti filter aktif. Jenis tingkat dan individu
                  dihitung terpisah per periode.
                </Text>
              ) : null}
            </Space>
          }
          extra={
            <Space wrap size={[6, 6]}>
              <Tag color='cyan' style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}>
                {gradeScopedCount} tingkat
              </Tag>
              <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}>
                {studentScopedCount} individu
              </Tag>
              {!isMobile ? (
                <Tag color='geekblue' style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}>
                  {periodeCount || "-"} periode
                </Tag>
              ) : null}
              <Button
                type='primary'
                size={isMobile ? "small" : "middle"}
                icon={<Eye size={14} />}
                disabled={charges.length === 0}
                onClick={() =>
                  openDetail(charges, "Detail siswa (filter aktif)")
                }
              >
                Detail
              </Button>
            </Space>
          }
        >
          <Table
            rowKey='key'
            columns={isMobile ? mobileColumns : desktopColumns}
            dataSource={dataSource}
            size={isMobile ? "small" : "middle"}
            scroll={isMobile ? undefined : { x: 1120 }}
            pagination={{
              pageSize: isMobile ? 8 : 10,
              size: isMobile ? "small" : "default",
              showSizeChanger: !isMobile,
              pageSizeOptions: [10, 20, 50],
              showTotal: isMobile
                ? undefined
                : (total, range) =>
                    `${range[0]}-${range[1]} dari ${total} jenis`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction='vertical' size={4}>
                      <Text>Belum ada data laporan pada filter ini.</Text>
                      <Text type='secondary'>
                        Pastikan periode dipilih dan jenis biaya sudah memiliki
                        siswa/tingkat yang eligible.
                      </Text>
                    </Space>
                  }
                />
              ),
            }}
          />
        </Card>
      </Col>

      {dataSource.length > 0 ? (
        <Col span={24}>
          <Card
            variant='borderless'
            style={{
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.14)",
              background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
            }}
            styles={{ body: { padding: isMobile ? "10px 12px" : 16 } }}
          >
            <Flex align='flex-start' gap={10}>
              <Users size={16} color='#64748b' style={{ marginTop: 2, flexShrink: 0 }} />
              <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                Tip: gunakan filter periode untuk fokus satu tahun ajaran, atau
                kosongkan periode untuk melihat seluruh gelombang/jenis di semua
                periode. Jenis individu hanya menghitung siswa pada roster.
              </Text>
            </Flex>
          </Card>
        </Col>
      ) : null}

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title={detailTitle}
        width={isMobile ? "calc(100vw - 24px)" : 720}
        centered
        footer={[
          <Button key='close' onClick={() => setDetailOpen(false)}>
            Tutup
          </Button>,
        ]}
        destroyOnHidden
        styles={{
          body: { overflow: "hidden", paddingTop: 12 },
          content: { overflow: "hidden" },
        }}
      >
        <Space direction='vertical' size={12} style={{ width: "100%", maxWidth: "100%" }}>
          <Space wrap size={[6, 6]}>
            <Tag color='green' style={{ borderRadius: 999, margin: 0 }}>
              Lunas {detailBuckets.paid.length}
            </Tag>
            <Tag color='gold' style={{ borderRadius: 999, margin: 0 }}>
              Belum lunas {detailBuckets.unpaid.length}
            </Tag>
            <Tag color='geekblue' style={{ borderRadius: 999, margin: 0 }}>
              Beasiswa {detailBuckets.scholarship.length}
            </Tag>
          </Space>

          <Tabs
            size='small'
            activeKey={detailTab}
            onChange={setDetailTab}
            style={{ width: "100%", overflow: "hidden" }}
            items={[
              {
                key: "paid",
                label: `Sudah Lunas (${detailBuckets.paid.length})`,
                children: renderDetailTable(
                  detailBuckets.paid,
                  "Belum ada siswa yang lunas pada cakupan ini.",
                ),
              },
              {
                key: "unpaid",
                label: `Belum Lunas (${detailBuckets.unpaid.length})`,
                children: renderDetailTable(
                  detailBuckets.unpaid,
                  "Semua siswa pada cakupan ini sudah lunas.",
                ),
              },
              {
                key: "scholarship",
                label: `Beasiswa (${detailBuckets.scholarship.length})`,
                children: renderDetailTable(
                  detailBuckets.scholarship,
                  "Tidak ada siswa beasiswa pada cakupan ini.",
                ),
              },
            ]}
          />
        </Space>
      </Modal>
    </Row>
  );
};

export default OthersReportPanel;
