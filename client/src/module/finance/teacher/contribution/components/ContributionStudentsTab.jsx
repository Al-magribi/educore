import {
  Button,
  Card,
  Dropdown,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { EllipsisOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter, formatDateTime } from "../constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const ContributionStudentsTab = ({
  filters,
  setFilters,
  summary,
  students,
  unpaidStudents,
  loading,
  onCreatePayment,
}) => {
  const columns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type="secondary">
            {record.nis || "-"} | {record.class_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status Bayar",
      dataIndex: "is_paid",
      key: "is_paid",
      render: (value) =>
        value ? <Tag color="green">Sudah Bayar</Tag> : <Tag color="gold">Belum Bayar</Tag>,
    },
    {
      title: "Petugas",
      dataIndex: "is_officer",
      key: "is_officer",
      render: (value) =>
        value ? <Tag color="blue">Petugas</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: "Total Setoran",
      dataIndex: "total_paid",
      key: "total_paid",
      align: "right",
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Terakhir Bayar",
      dataIndex: "last_paid_at",
      key: "last_paid_at",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Aksi",
      key: "action",
      align: "center",
      render: (_, record) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "pay",
                label: "Catat pembayaran",
              },
            ],
            onClick: ({ key }) => {
              if (key === "pay") {
                onCreatePayment(record, "income");
              }
            },
          }}
        >
          <Button icon={<EllipsisOutlined />} style={{ borderRadius: 999 }}>
            Aksi
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        variant="borderless"
        style={cardStyle}
        styles={{ body: { padding: 18 } }}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Space
            wrap
            size={[14, 14]}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space orientation="vertical" size={4}>
              <Title level={5} style={{ margin: 0 }}>
                Status Pembayaran Siswa
              </Title>
              <Text type="secondary">
                Pantau siswa yang sudah maupun belum membayar kas pada periode
                aktif saat ini.
              </Text>
            </Space>

            <Space wrap>
              <Tag color="green">Sudah bayar: {summary.paid_students || 0}</Tag>
              <Tag color="gold">Belum bayar: {summary.unpaid_students || 0}</Tag>
            </Space>
          </Space>

          <Space wrap size={[12, 12]} style={{ width: "100%" }}>
            <Input.Search
              placeholder="Cari siswa atau NIS"
              allowClear
              style={{ width: 280, maxWidth: "100%" }}
              onSearch={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  search: value,
                }))
              }
            />
            <Select
              allowClear
              placeholder="Filter status bayar"
              options={[
                { value: "paid", label: "Sudah bayar" },
                { value: "unpaid", label: "Belum bayar" },
              ]}
              style={{ width: 180, maxWidth: "100%" }}
              value={filters.status}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  status: value,
                }))
              }
            />
          </Space>

          {unpaidStudents.length > 0 ? (
            <Paragraph style={{ margin: 0, color: "#64748b" }}>
              Prioritas tindak lanjut:{" "}
              <Text strong>
                {unpaidStudents
                  .slice(0, 5)
                  .map((item) => item.student_name)
                  .join(", ")}
              </Text>
              {unpaidStudents.length > 5
                ? ` dan ${unpaidStudents.length - 5} siswa lainnya`
                : ""}
              .
            </Paragraph>
          ) : null}

          <Table
            rowKey="student_id"
            columns={columns}
            dataSource={students}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 960 }}
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default ContributionStudentsTab;
