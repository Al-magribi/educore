import { Card, Col, Row, Table, Tag, Typography } from "antd";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;

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
      render: (value) => <Tag color={value.color}>{value.label}</Tag>,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12} xl={6}>
        <Card style={cardStyle}>
          <Text type='secondary'>Total Target</Text>
          <div>{currencyFormatter.format(totalTarget)}</div>
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card style={cardStyle}>
          <Text type='secondary'>Total Realisasi</Text>
          <div>{currencyFormatter.format(totalRealization)}</div>
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card style={cardStyle}>
          <Text type='secondary'>Tingkat Capaian</Text>
          <div>{totalAchievement}%</div>
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card style={cardStyle}>
          <Text type='secondary'>Kelas Kritis</Text>
          <div>{criticalClasses}</div>
        </Card>
      </Col>
      <Col span={24}>
        <Card style={cardStyle} title='Laporan Pembayaran SPP per Kelas'>
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
