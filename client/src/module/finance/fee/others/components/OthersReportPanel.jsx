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
  remaining: {
    icon: <BarChart3 size={18} />,
    bg: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
    color: "#7c3aed",
  },
  paid: {
    icon: <AlertTriangle size={18} />,
    bg: "linear-gradient(135deg, #fef3c7, #fff7ed)",
    color: "#d97706",
  },
};

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
      key: "remaining",
      label: "Sisa Tagihan",
      value: currencyFormatter.format(totalRemaining),
    },
    {
      key: "paid",
      label: "Tagihan Lunas",
      value: totalPaidCharges,
    },
  ];

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
          title='Laporan Pembayaran per Jenis Biaya'
          extra={
            <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600 }}>
              {dataSource.length} jenis
            </Tag>
          }
        >
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
