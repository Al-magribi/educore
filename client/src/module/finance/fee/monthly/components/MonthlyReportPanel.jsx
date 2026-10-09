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
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Eye,
  Filter,
  Gift,
  Info,
  Target,
} from "lucide-react";

import {
  cardStyle,
  currencyFormatter,
  statusColorMap,
  statusLabelMap,
} from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

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
  achievement: {
    icon: <BarChart3 size={18} />,
    bg: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
    color: "#7c3aed",
  },
  critical: {
    icon: <AlertTriangle size={18} />,
    bg: "linear-gradient(135deg, #fef3c7, #fff7ed)",
    color: "#d97706",
  },
  scholarship: {
    icon: <Gift size={18} />,
    bg: "linear-gradient(135deg, #dbeafe, #e0e7ff)",
    color: "#1d4ed8",
  },
};

const paymentStatusLabelMap = {
  ...statusLabelMap,
  partial: "Cicilan",
};

const paymentStatusColorMap = {
  ...statusColorMap,
  partial: "blue",
};

const compareStudents = (left, right) => {
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

const getScholarshipNames = (payment) => {
  const names = Array.isArray(payment.scholarship_names)
    ? [...new Set(payment.scholarship_names.filter(Boolean))]
    : [];
  if (names.length > 0) {
    return names;
  }
  if (Number(payment.scholarship_cover || 0) > 0 || payment.has_scholarship) {
    return ["Beasiswa"];
  }
  return [];
};

const MonthlyReportPanel = ({
  payments = [],
  filterContext = {},
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const {
    homebaseName = "Semua satuan",
    periodeName = "Semua periode",
    gradeName,
    className,
    monthLabel,
    studentSearch,
  } = filterContext;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("Detail Siswa");
  const [detailStudents, setDetailStudents] = useState([]);
  const [detailTab, setDetailTab] = useState("paid");

  const reportMap = new Map();

  payments.forEach((payment) => {
    const classKey = payment.class_id || `student-${payment.student_id}`;
    const periodeKey = payment.periode_id || "all";
    const key = `${classKey}-${periodeKey}`;
    const currentItem = reportMap.get(key) || {
      key,
      classroom: payment.class_name || "Tanpa Kelas",
      gradeName: payment.grade_name || "-",
      periodeName: payment.periode_name || "-",
      periodeId: payment.periode_id,
      targetAmount: 0,
      brutoAmount: 0,
      scholarshipCover: 0,
      realizationAmount: 0,
      paidStudents: 0,
      partialStudents: 0,
      unpaidStudents: 0,
      totalStudents: 0,
      students: [],
    };

    currentItem.targetAmount += Number(payment.amount || 0);
    currentItem.brutoAmount += Number(
      payment.bruto_amount != null
        ? payment.bruto_amount
        : Number(payment.amount || 0) + Number(payment.scholarship_cover || 0),
    );
    currentItem.scholarshipCover += Number(payment.scholarship_cover || 0);
    currentItem.totalStudents += 1;
    currentItem.students.push(payment);

    if (payment.status === "paid") {
      currentItem.realizationAmount += Number(payment.amount || 0);
      currentItem.paidStudents += 1;
    } else if (payment.status === "partial") {
      currentItem.realizationAmount += Number(payment.paid_amount || 0);
      currentItem.partialStudents += 1;
    } else {
      currentItem.unpaidStudents += 1;
    }

    if (!currentItem.periodeName || currentItem.periodeName === "-") {
      currentItem.periodeName = payment.periode_name || "-";
    }

    reportMap.set(key, currentItem);
  });

  const dataSource = Array.from(reportMap.values())
    .map((item) => {
      const achievement =
        item.targetAmount > 0
          ? Math.round((item.realizationAmount / item.targetAmount) * 100)
          : 0;

      return {
        ...item,
        achievement,
        achievementMeta:
          achievement >= 90
            ? { label: `${achievement}%`, color: "green" }
            : achievement >= 75
              ? { label: `${achievement}%`, color: "gold" }
              : { label: `${achievement}%`, color: "red" },
      };
    })
    .sort((left, right) => {
      const gradeCompare = String(left.gradeName).localeCompare(
        String(right.gradeName),
        "id",
        { sensitivity: "base" },
      );
      if (gradeCompare !== 0) {
        return gradeCompare;
      }

      const classCompare = String(left.classroom).localeCompare(
        String(right.classroom),
        "id",
        { sensitivity: "base" },
      );
      if (classCompare !== 0) {
        return classCompare;
      }

      return String(left.periodeName).localeCompare(String(right.periodeName), "id", {
        sensitivity: "base",
      });
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
  const totalAchievement =
    totalTarget > 0 ? Math.round((totalRealization / totalTarget) * 100) : 0;
  const criticalClasses = dataSource.filter((item) => item.achievement < 75).length;
  const totalStudents = payments.length;
  const paidStudents = payments.filter((item) => item.status === "paid").length;
  const showPeriodeColumn = !filterContext.periodeId;

  const activeFilterTags = [
    { key: "homebase", label: homebaseName },
    { key: "periode", label: periodeName },
    monthLabel ? { key: "month", label: monthLabel } : null,
    gradeName ? { key: "grade", label: gradeName } : null,
    className ? { key: "class", label: className } : null,
    studentSearch ? { key: "search", label: `Cari: ${studentSearch}` } : null,
  ].filter(Boolean);

  const summaryItems = [
    {
      key: "target",
      label: "Target Netto",
      value: currencyFormatter.format(totalTarget),
      note: `${totalStudents} siswa · bruto ${currencyFormatter.format(totalBruto)}`,
    },
    {
      key: "scholarship",
      label: "Cover Beasiswa",
      value: currencyFormatter.format(totalScholarshipCover),
      note: "Potongan beasiswa (bukan kas masuk)",
    },
    {
      key: "realization",
      label: "Total Realisasi",
      value: currencyFormatter.format(totalRealization),
      note: `${paidStudents} siswa sudah lunas`,
    },
    {
      key: "achievement",
      label: "Tingkat Capaian",
      value: `${totalAchievement}%`,
      note: monthLabel ? `Bulan ${monthLabel} (vs target netto)` : "Sesuai filter aktif",
    },
    {
      key: "critical",
      label: "Kelas Kritis",
      value: criticalClasses,
      note: "Capaian di bawah 75%",
    },
  ];

  const openDetail = (students, title, preferredTab = "paid") => {
    const sorted = [...students].sort(compareStudents);
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
      width: 44,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => {
        const scholarshipNames = getScholarshipNames(record);
        return (
          <Space direction='vertical' size={2} style={{ width: "100%", minWidth: 0 }}>
            <Text strong style={{ wordBreak: "break-word" }}>
              {record.student_name || "-"}
            </Text>
            <Text type='secondary' style={{ fontSize: 12, wordBreak: "break-word" }}>
              NIS {record.nis || "-"}
              {record.class_name ? ` · ${record.class_name}` : ""}
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
      width: isMobile ? 118 : 148,
      align: "right",
      render: (_, record) => (
        <Space direction='vertical' size={2} style={{ width: "100%", alignItems: "flex-end" }}>
          <Text strong>
            {currencyFormatter.format(Number(record.amount || 0))}
          </Text>
          {Number(record.scholarship_cover || 0) > 0 ? (
            <Text type='secondary' style={{ fontSize: 12 }}>
              Cover {currencyFormatter.format(Number(record.scholarship_cover || 0))}
            </Text>
          ) : null}
          <Tag
            color={paymentStatusColorMap[record.status] || "default"}
            style={{ borderRadius: 999, margin: 0, fontWeight: 600 }}
          >
            {paymentStatusLabelMap[record.status] || record.status || "-"}
          </Tag>
        </Space>
      ),
    },
  ];

  const renderDetailTable = (rows, emptyDescription) => (
    <Table
      rowKey={(record) =>
        record.id ||
        `${record.student_id}-${record.periode_id}-${record.bill_month}`
      }
      columns={detailColumns}
      dataSource={rows}
      size='small'
      tableLayout='fixed'
      pagination={{
        pageSize: 8,
        size: "small",
        showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} siswa`,
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
  );

  const desktopColumns = [
    {
      title: "Kelas",
      key: "classroom",
      width: 220,
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text strong>{record.classroom}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.gradeName}
            {showPeriodeColumn ? ` · ${record.periodeName}` : ""}
          </Text>
        </Space>
      ),
    },
    ...(showPeriodeColumn
      ? [
          {
            title: "Periode",
            dataIndex: "periodeName",
            key: "periodeName",
            width: 160,
          },
        ]
      : []),
    {
      title: "Target Netto",
      dataIndex: "targetAmount",
      key: "targetAmount",
      width: 140,
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
      title: "Realisasi",
      dataIndex: "realizationAmount",
      key: "realizationAmount",
      width: 140,
      render: (value) => currencyFormatter.format(value),
    },
    {
      title: "Siswa Lunas",
      key: "paidStudents",
      width: 140,
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text>
            {record.paidStudents}/{record.totalStudents}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            Cicilan {record.partialStudents} · Belum {record.unpaidStudents}
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
              `Detail ${record.classroom}${
                showPeriodeColumn ? ` · ${record.periodeName}` : ""
              }`,
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
      title: "Kelas",
      key: "classroom",
      render: (_, record) => (
        <Flex vertical gap={10} style={{ width: "100%" }}>
          <Flex justify='space-between' align='flex-start' gap={8}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ display: "block" }}>
                {record.classroom}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.gradeName}
                {showPeriodeColumn ? ` · ${record.periodeName}` : ""}
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
              <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                Target
              </Text>
              <Text strong style={{ fontSize: 13 }}>
                {currencyFormatter.format(record.targetAmount)}
              </Text>
            </div>
            <div>
              <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                Realisasi
              </Text>
              <Text strong style={{ fontSize: 13 }}>
                {currencyFormatter.format(record.realizationAmount)}
              </Text>
            </div>
            <div>
              <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                Lunas
              </Text>
              <Text strong style={{ fontSize: 13 }}>
                {record.paidStudents}/{record.totalStudents}
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
                `Detail ${record.classroom}${
                  showPeriodeColumn ? ` · ${record.periodeName}` : ""
                }`,
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
      <Col span={24}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.14)",
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
          }}
          styles={{ body: { padding: isMobile ? "10px 12px" : "12px 16px" } }}
        >
          <Space align='start' size={10} wrap>
            <Filter size={16} color='#64748b' style={{ marginTop: 3 }} />
            <div style={{ minWidth: 0 }}>
              <Text type='secondary' style={{ display: "block", marginBottom: 6 }}>
                Laporan mengikuti filter aktif
              </Text>
              <Space size={[6, 6]} wrap>
                {activeFilterTags.map((item) => (
                  <Tag
                    key={item.key}
                    color='blue'
                    style={{ borderRadius: 999, margin: 0, fontWeight: 600 }}
                  >
                    {item.label}
                  </Tag>
                ))}
              </Space>
            </div>
          </Space>
        </Card>
      </Col>

      {summaryItems.map((item, index) => {
        const meta = reportCardMeta[item.key];
        return (
          <Col xs={24} sm={12} xl={6} xxl={4} key={item.key}>
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
                    <Flex align='center' gap={6}>
                      <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                        {item.label}
                      </Text>
                      <Tooltip title={item.note}>
                        <Info
                          size={14}
                          color='#94a3b8'
                          style={{ cursor: "help", flexShrink: 0 }}
                        />
                      </Tooltip>
                    </Flex>
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
                Laporan Pembayaran SPP per Kelas
              </Text>
              {!isMobile ? (
                <Text type='secondary' style={{ fontSize: 13, fontWeight: 400 }}>
                  Ringkasan capaian mengikuti filter satuan, periode, bulan,
                  tingkat, kelas, dan pencarian siswa yang sedang aktif.
                </Text>
              ) : null}
            </Space>
          }
          extra={
            <Space wrap size={[6, 6]}>
              <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}>
                {dataSource.length} kelas
              </Tag>
              <Tag color='geekblue' style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}>
                {totalStudents} siswa
              </Tag>
              <Button
                type='primary'
                size={isMobile ? "small" : "middle"}
                icon={<Eye size={14} />}
                disabled={totalStudents === 0}
                onClick={() =>
                  openDetail(
                    payments,
                    monthLabel
                      ? `Detail siswa · ${monthLabel}`
                      : "Detail siswa (filter aktif)",
                  )
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
            scroll={isMobile ? undefined : { x: showPeriodeColumn ? 1280 : 1080 }}
            pagination={{
              pageSize: isMobile ? 8 : 10,
              size: isMobile ? "small" : "default",
              showSizeChanger: !isMobile,
              pageSizeOptions: [10, 20, 50],
              showTotal: isMobile
                ? undefined
                : (total, range) =>
                    `${range[0]}-${range[1]} dari ${total} kelas`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction='vertical' size={4}>
                      <Text>Belum ada data laporan pada filter ini.</Text>
                      <Text type='secondary'>
                        Pastikan periode aktif dipilih dan ada siswa eligible
                        pada filter yang sedang digunakan.
                      </Text>
                    </Space>
                  }
                />
              ),
            }}
          />
        </Card>
      </Col>

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title={detailTitle}
        width={isMobile ? "calc(100vw - 24px)" : 720}
        footer={[
          <Button key='close' onClick={() => setDetailOpen(false)}>
            Tutup
          </Button>,
        ]}
        destroyOnHidden
        styles={{
          body: { overflowX: "hidden" },
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
            activeKey={detailTab}
            onChange={setDetailTab}
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

export default MonthlyReportPanel;
