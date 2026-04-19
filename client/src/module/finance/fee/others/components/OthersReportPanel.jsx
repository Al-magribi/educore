import { Card, Col, Row, Table, Tag, Typography } from "antd";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;

const OthersReportPanel = ({ charges }) => {
  const reportMap = new Map();

  charges.forEach((charge) => {
    const key = charge.type_id || `type-${charge.type_name}`;
    const currentItem = reportMap.get(key) || {
      key,
      feeType: charge.type_name || "Tanpa Jenis",
      targetAmount: 0,
      realizationAmount: 0,
      paidCount: 0,
      unpaidCount: 0,
      installmentCount: 0,
    };

    currentItem.targetAmount += Number(charge.amount_due || 0);
    currentItem.realizationAmount += Number(charge.paid_amount || 0);
    currentItem.installmentCount += Number(charge.installment_count || 0);

    if (charge.status === "paid") {
      currentItem.paidCount += 1;
    } else {
      currentItem.unpaidCount += 1;
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
        remainingAmount: Math.max(item.targetAmount - item.realizationAmount, 0),
        achievementMeta:
          achievement >= 100
            ? { label: `${achievement}%`, color: "green" }
            : achievement >= 60
              ? { label: `${achievement}%`, color: "blue" }
              : { label: `${achievement}%`, color: "gold" },
      };
    })
    .sort((left, right) => right.targetAmount - left.targetAmount);

  const totalTarget = dataSource.reduce((sum, item) => sum + item.targetAmount, 0);
  const totalRealization = dataSource.reduce(
    (sum, item) => sum + item.realizationAmount,
    0,
  );
  const totalRemaining = Math.max(totalTarget - totalRealization, 0);
  const totalPaidCharges = charges.filter((item) => item.status === "paid").length;

  const columns = [
    {
      title: "Jenis Biaya / Target",
      key: "feeType",
      render: (_, record) => (
        <div>
          <div>{record.feeType}</div>
          <Text type='secondary'>{currencyFormatter.format(record.targetAmount)}</Text>
        </div>
      ),
    },
    {
      title: "Realisasi",
      dataIndex: "realizationAmount",
      key: "realizationAmount",
      render: (value) => currencyFormatter.format(value),
    },
    {
      title: "Sisa",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      render: (value) => currencyFormatter.format(value),
    },
    {
      title: "Tagihan Lunas",
      key: "paidCount",
      render: (_, record) => `${record.paidCount}/${record.paidCount + record.unpaidCount}`,
    },
    {
      title: "Total Cicilan",
      dataIndex: "installmentCount",
      key: "installmentCount",
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
          <Text type='secondary'>Sisa Tagihan</Text>
          <div>{currencyFormatter.format(totalRemaining)}</div>
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card style={cardStyle}>
          <Text type='secondary'>Tagihan Lunas</Text>
          <div>{totalPaidCharges}</div>
        </Card>
      </Col>
      <Col span={24}>
        <Card style={cardStyle} title='Laporan Pembayaran per Jenis Biaya'>
          <Table
            rowKey='key'
            columns={columns}
            dataSource={dataSource}
            scroll={{ x: 960 }}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default OthersReportPanel;
