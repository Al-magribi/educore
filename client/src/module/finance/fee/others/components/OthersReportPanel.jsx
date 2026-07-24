import { Card, Col, Empty, Row, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import {
  BarChart3,
  CircleDollarSign,
  Layers3,
  Target,
  Users,
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
};

const getPeriodeName = (charge = {}) =>
  charge.periode_name ||
  charge.periode?.periode_name ||
  charge.periode?.name ||
  "-";

const getScopeLabel = (scope) => (scope === "student" ? "Individu" : "Tingkat");

const OthersReportPanel = ({ charges = [] }) => {
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
      realizationAmount: 0,
      remainingAmount: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      installmentCount: 0,
      studentIds: new Set(),
    };

    currentItem.targetAmount += Number(charge.amount_due || 0);
    currentItem.realizationAmount += Number(charge.paid_amount || 0);
    currentItem.remainingAmount += Number(
      charge.remaining_amount ??
        Math.max(
          Number(charge.amount_due || 0) - Number(charge.paid_amount || 0),
          0,
        ),
    );
    currentItem.installmentCount += Number(charge.installment_count || 0);

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
      label: "Total Target",
      value: currencyFormatter.format(totalTarget),
      note: `${charges.length} baris tagihan`,
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

  const columns = [
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
      title: "Sisa",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 150,
      render: (value) => currencyFormatter.format(value),
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
      title: "Cicilan",
      dataIndex: "installmentCount",
      key: "installmentCount",
      width: 100,
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
              <Text strong>Laporan per Jenis Biaya & Periode</Text>
              <Text type='secondary' style={{ fontSize: 13, fontWeight: 400 }}>
                Ringkasan mengikuti filter aktif. Jenis tingkat dan individu
                dihitung terpisah per periode.
              </Text>
            </Space>
          }
          extra={
            <Space wrap>
              <Tag color='cyan' style={{ borderRadius: 999, fontWeight: 600 }}>
                {gradeScopedCount} tingkat
              </Tag>
              <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600 }}>
                {studentScopedCount} individu
              </Tag>
              <Tag color='geekblue' style={{ borderRadius: 999, fontWeight: 600 }}>
                {periodeCount || "-"} periode
              </Tag>
            </Space>
          }
        >
          <Table
            rowKey='key'
            columns={columns}
            dataSource={dataSource}
            scroll={{ x: 1100 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (total, range) =>
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
          >
            <Space align='start' size={10}>
              <Users size={16} color='#64748b' style={{ marginTop: 2 }} />
              <Text type='secondary'>
                Tip: gunakan filter periode untuk fokus satu tahun ajaran, atau
                kosongkan periode untuk melihat seluruh gelombang/jenis di semua
                periode. Jenis individu hanya menghitung siswa pada roster.
              </Text>
            </Space>
          </Card>
        </Col>
      ) : null}
    </Row>
  );
};

export default OthersReportPanel;
