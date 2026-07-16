import { Card, Col, Empty, Row, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Filter,
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
};

const MonthlyReportPanel = ({
  payments = [],
  filterContext = {},
}) => {
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
      realizationAmount: 0,
      paidStudents: 0,
      partialStudents: 0,
      unpaidStudents: 0,
      totalStudents: 0,
    };

    currentItem.targetAmount += Number(payment.amount || 0);
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
      label: "Total Target",
      value: currencyFormatter.format(totalTarget),
      note: `${totalStudents} siswa pada filter aktif`,
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
      note: monthLabel ? `Bulan ${monthLabel}` : "Sesuai filter aktif",
    },
    {
      key: "critical",
      label: "Kelas Kritis",
      value: criticalClasses,
      note: "Capaian di bawah 75%",
    },
  ];

  const columns = [
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
      title: "Target",
      dataIndex: "targetAmount",
      key: "targetAmount",
      width: 150,
      render: (value) => currencyFormatter.format(value),
    },
    {
      title: "Realisasi",
      dataIndex: "realizationAmount",
      key: "realizationAmount",
      width: 150,
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
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.14)",
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
          }}
          styles={{ body: { padding: "12px 16px" } }}
        >
          <Space align='start' size={10} wrap>
            <Filter size={16} color='#64748b' style={{ marginTop: 3 }} />
            <div>
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
          <Col xs={24} md={12} xl={6} key={item.key}>
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Card
                style={{
                  ...cardStyle,
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 16,
                    background: meta.bg,
                    color: meta.color,
                    marginBottom: 12,
                  }}
                >
                  {meta.icon}
                </div>
                <Text type='secondary'>{item.label}</Text>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.2,
                  }}
                >
                  {item.value}
                </div>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {item.note}
                </Text>
              </Card>
            </MotionDiv>
          </Col>
        );
      })}

      <Col span={24}>
        <Card
          style={cardStyle}
          title={
            <Space direction='vertical' size={2}>
              <Text strong>Laporan Pembayaran SPP per Kelas</Text>
              <Text type='secondary' style={{ fontSize: 13, fontWeight: 400 }}>
                Ringkasan capaian mengikuti filter satuan, periode, bulan,
                tingkat, kelas, dan pencarian siswa yang sedang aktif.
              </Text>
            </Space>
          }
          extra={
            <Space wrap>
              <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600 }}>
                {dataSource.length} kelas
              </Tag>
              <Tag color='geekblue' style={{ borderRadius: 999, fontWeight: 600 }}>
                {totalStudents} siswa
              </Tag>
            </Space>
          }
        >
          <Table
            rowKey='key'
            columns={columns}
            dataSource={dataSource}
            scroll={{ x: showPeriodeColumn ? 1100 : 900 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (total, range) =>
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
