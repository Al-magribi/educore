import { Card, Col, Row, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, CircleDollarSign, Target } from "lucide-react";

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

const MonthlyReportPanel = ({ payments }) => {
  const reportMap = new Map();

  payments.forEach((payment) => {
    const key = payment.class_id || `student-${payment.student_id}`;
    const currentItem = reportMap.get(key) || {
      key,
      classroom: payment.class_name || "Tanpa Kelas",
      targetAmount: 0,
      realizationAmount: 0,
      paidStudents: 0,
      totalStudents: 0,
    };

    currentItem.targetAmount += Number(payment.amount || 0);
    currentItem.totalStudents += 1;

    if (payment.status === "paid") {
      currentItem.realizationAmount += Number(payment.amount || 0);
      currentItem.paidStudents += 1;
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
    .sort((left, right) => right.targetAmount - left.targetAmount);

  const totalTarget = dataSource.reduce((sum, item) => sum + item.targetAmount, 0);
  const totalRealization = dataSource.reduce(
    (sum, item) => sum + item.realizationAmount,
    0,
  );
  const totalAchievement =
    totalTarget > 0 ? Math.round((totalRealization / totalTarget) * 100) : 0;
  const criticalClasses = dataSource.filter((item) => item.achievement < 75).length;

  const summaryItems = [
    {
      key: "target",
      label: "Total Target",
      value: currencyFormatter.format(totalTarget),
    },
    {
      key: "realization",
      label: "Total Realisasi",
      value: currencyFormatter.format(totalRealization),
    },
    {
      key: "achievement",
      label: "Tingkat Capaian",
      value: `${totalAchievement}%`,
    },
    {
      key: "critical",
      label: "Kelas Kritis",
      value: criticalClasses,
    },
  ];

  const columns = [
    { title: "Kelas", dataIndex: "classroom", key: "classroom" },
    {
      title: "Target",
      dataIndex: "targetAmount",
      key: "targetAmount",
      render: (value) => currencyFormatter.format(value),
    },
    {
      title: "Realisasi",
      dataIndex: "realizationAmount",
      key: "realizationAmount",
      render: (value) => currencyFormatter.format(value),
    },
    {
      title: "Siswa Lunas",
      key: "paidStudents",
      render: (_, record) => `${record.paidStudents}/${record.totalStudents}`,
    },
    {
      title: "Capaian",
      dataIndex: "achievementMeta",
      key: "achievementMeta",
      render: (value) => (
        <Tag color={value.color} style={{ borderRadius: 999, fontWeight: 600 }}>
          {value.label}
        </Tag>
      ),
    },
  ];

  return (
    <Row gutter={[16, 16]}>
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
              </Card>
            </MotionDiv>
          </Col>
        );
      })}
      <Col span={24}>
        <Card
          style={cardStyle}
          title='Laporan Pembayaran SPP per Kelas'
          extra={
            <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600 }}>
              {dataSource.length} kelas
            </Tag>
          }
        >
          <Table
            rowKey='key'
            columns={columns}
            dataSource={dataSource}
            scroll={{ x: 900 }}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default MonthlyReportPanel;
