import {
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Filter,
  Gift,
  Info,
  Target,
} from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

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
    };

    currentItem.targetAmount += Number(payment.amount || 0);
    currentItem.brutoAmount += Number(
      payment.bruto_amount != null
        ? payment.bruto_amount
        : Number(payment.amount || 0) + Number(payment.scholarship_cover || 0),
    );
    currentItem.scholarshipCover += Number(payment.scholarship_cover || 0);
    currentItem.totalStudents += 1;

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
      fixed: "right",
      render: (value) => (
        <Tag color={value.color} style={{ borderRadius: 999, fontWeight: 600 }}>
          {value.label}
        </Tag>
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
            </Space>
          }
        >
          <Table
            rowKey='key'
            columns={isMobile ? mobileColumns : desktopColumns}
            dataSource={dataSource}
            size={isMobile ? "small" : "middle"}
            scroll={isMobile ? undefined : { x: showPeriodeColumn ? 1200 : 1000 }}
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
    </Row>
  );
};

export default MonthlyReportPanel;
