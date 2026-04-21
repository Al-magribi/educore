import { Alert, Card, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Building2, Sparkles } from "lucide-react";

import { cardBaseStyle, currency } from "./constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const FinanceDashboardUnitsTab = ({ meta, homebases, availableHomebases }) => {
  const selectedHomebase = homebases[0];
  const isFilteredSingleUnit =
    Boolean(meta?.selected_homebase_id) && homebases.length === 1;

  const columns = [
    {
      title: "Satuan",
      dataIndex: "homebase_name",
      key: "homebase_name",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {record.total_students || 0} siswa • {record.total_classes || 0} kelas
          </div>
        </div>
      ),
    },
    {
      title: "Periode Aktif",
      dataIndex: "periode_name",
      key: "periode_name",
      render: (value) => (
        <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600 }}>
          {value || "-"}
        </Tag>
      ),
    },
    {
      title: "Target SPP",
      dataIndex: "expected_spp_current_month",
      key: "expected_spp_current_month",
      align: "right",
      render: (value) => currency(value),
    },
    {
      title: "Terkumpul",
      dataIndex: "school_revenue",
      key: "school_revenue",
      align: "right",
      render: (value) => currency(value),
    },
    {
      title: "Dana Terkelola",
      dataIndex: "managed_funds",
      key: "managed_funds",
      align: "right",
      render: (value) => currency(value),
    },
    {
      title: "Outstanding",
      dataIndex: "outstanding_spp_current_month",
      key: "outstanding_spp_current_month",
      align: "right",
      render: (value, record) =>
        currency(Number(value || 0) + Number(record.other_remaining || 0)),
    },
    {
      title: "Rate",
      dataIndex: "collection_rate_current_month",
      key: "collection_rate_current_month",
      width: 96,
      align: "center",
      render: (value) => (
        <Tag
          color={value >= 80 ? "green" : "orange"}
          style={{ borderRadius: 999, fontWeight: 600 }}
        >
          {value || 0}%
        </Tag>
      ),
    },
  ];

  return (
    <Space vertical size={16} style={{ width: "100%" }}>
      <Alert
        type='info'
        showIcon
        message='Data per satuan'
        description={
          isFilteredSingleUnit
            ? `Dashboard sedang difilter ke satuan ${selectedHomebase?.homebase_name || "-"} dengan periode aktif ${selectedHomebase?.periode_name || "-"}.`
            : `Dashboard menghitung ${homebases.length || 0} dari ${availableHomebases?.length || homebases.length || 0} satuan berdasarkan periode aktif pada masing-masing unit.`
        }
        style={{
          borderRadius: 18,
          border: "1px solid rgba(96,165,250,0.22)",
          boxShadow: "0 12px 24px rgba(37, 99, 235, 0.06)",
        }}
      />

      <MotionDiv
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
      >
        <Card variant='borderless' style={cardBaseStyle}>
          <Space vertical size={16} style={{ width: "100%" }}>
            <div>
              <Space align='center' size={10}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                    color: "#2563eb",
                  }}
                >
                  <Building2 size={18} />
                </span>
                <div>
                  <Text strong style={{ display: "block", color: "#0f172a" }}>
                    Performa Keuangan per Satuan
                  </Text>
                  <Text type='secondary'>
                    Tabel ini membantu membandingkan target, realisasi, dan outstanding
                    tiap unit.
                  </Text>
                </div>
              </Space>
            </div>

            <Table
              rowKey='key'
              dataSource={homebases}
              columns={columns}
              pagination={false}
              scroll={{ x: 980 }}
            />
          </Space>
        </Card>
      </MotionDiv>

      {meta?.scope_type !== "all_units" && homebases[0] ? (
        <Space align='center' size={8}>
          <Sparkles size={14} color='#64748b' />
          <Text type='secondary'>
            Tampilan ini tetap memakai struktur per satuan agar konsisten saat
            akses diperluas ke banyak unit.
          </Text>
        </Space>
      ) : null}
    </Space>
  );
};

export default FinanceDashboardUnitsTab;
