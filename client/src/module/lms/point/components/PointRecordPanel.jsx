import React from "react";
import { Card, Empty, Flex, Space, Table, Tag, Typography } from "antd";
import { ShieldAlert, Trophy } from "lucide-react";
import { formatPointDate, POINT_TYPE_LABELS } from "../utils/pointCatalog";

const { Text, Title } = Typography;

const panelStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const StatCard = ({ label, value, color, background, borderColor, icon: Icon }) => (
  <Card
    style={{
      borderRadius: 18,
      border: `1px solid ${borderColor}`,
      boxShadow: "none",
      background,
    }}
    styles={{ body: { padding: 16 } }}
  >
    <Space>
      <Icon size={18} color={color} />
      <div>
        <Text style={{ color: "#64748b", fontSize: 12 }}>{label}</Text>
        <Title level={4} style={{ margin: "2px 0 0", color }}>
          {value}
        </Title>
      </div>
    </Space>
  </Card>
);

const PointRecordPanel = ({
  student,
  entries = [],
  showBalance = false,
  isMobile = false,
  loading = false,
}) => {
  const columns = [
    {
      title: "Tanggal",
      dataIndex: "entry_date",
      width: 160,
      render: (value) => formatPointDate(value),
    },
    {
      title: "Jenis",
      dataIndex: "title_snapshot",
      render: (value, record) => (
        <Flex vertical gap={4}>
          <Text strong>{value}</Text>
          <Space size={6} wrap>
            <Tag
              style={{
                margin: 0,
                borderRadius: 999,
                background:
                  record.point_type === "reward" ? "#fffbeb" : "#fef2f2",
                borderColor:
                  record.point_type === "reward" ? "#fcd34d" : "#fecaca",
                color: record.point_type === "reward" ? "#a16207" : "#b91c1c",
              }}
            >
              {POINT_TYPE_LABELS[record.point_type] || record.point_type}
            </Tag>
            {record.category_name ? (
              <Tag style={{ margin: 0, borderRadius: 999 }}>
                {record.category_name}
              </Tag>
            ) : null}
          </Space>
        </Flex>
      ),
    },
    {
      title: "Poin",
      dataIndex: "point_value",
      width: 90,
      align: "center",
      render: (value, record) => (
        <Text
          strong
          style={{
            color: record.point_type === "reward" ? "#a16207" : "#b91c1c",
          }}
        >
          {value}
        </Text>
      ),
    },
    {
      title: "Catatan",
      dataIndex: "description",
      render: (value) => (
        <Text style={{ color: "#64748b" }}>{value || "-"}</Text>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr 1fr"
            : showBalance
              ? "repeat(3, minmax(0, 1fr))"
              : "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <StatCard
          label='Penghargaan'
          value={student?.total_reward || 0}
          color='#a16207'
          background='#fffbeb'
          borderColor='#fde68a'
          icon={Trophy}
        />
        <StatCard
          label='Pelanggaran'
          value={student?.total_punishment || 0}
          color='#b91c1c'
          background='#fef2f2'
          borderColor='#fecaca'
          icon={ShieldAlert}
        />
        {showBalance ? (
          <StatCard
            label='Poin Bersih'
            value={student?.balance || 0}
            color='#1d4ed8'
            background='#eff6ff'
            borderColor='#bfdbfe'
            icon={Trophy}
          />
        ) : null}
      </div>

      <Card style={panelStyle} styles={{ body: { padding: isMobile ? 16 : 20 } }}>
        <Flex vertical gap={14}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Riwayat Poin
            </Title>
            <Text style={{ color: "#64748b" }}>
              {student?.student_name
                ? `Catatan poin ${student.student_name}.`
                : "Catatan poin siswa."}
            </Text>
          </div>
          {isMobile ? (
            entries.length ? (
              <Flex vertical gap={10}>
                {entries.map((item) => (
                  <Card
                    key={item.id}
                    style={{ borderRadius: 16, border: "1px solid #e5edf6" }}
                    styles={{ body: { padding: 14 } }}
                  >
                    <Flex vertical gap={8}>
                      <Flex justify='space-between' gap={8}>
                        <Text style={{ color: "#64748b" }}>
                          {formatPointDate(item.entry_date)}
                        </Text>
                        <Text
                          strong
                          style={{
                            color:
                              item.point_type === "reward"
                                ? "#a16207"
                                : "#b91c1c",
                          }}
                        >
                          {item.point_value}
                        </Text>
                      </Flex>
                      <Text strong>{item.title_snapshot}</Text>
                      <Text style={{ color: "#64748b" }}>
                        {item.category_name || "Tanpa kategori"}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description='Belum ada catatan poin.'
              />
            )
          ) : (
            <Table
              rowKey='id'
              loading={loading}
              dataSource={entries}
              columns={columns}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description='Belum ada catatan poin.'
                  />
                ),
              }}
            />
          )}
        </Flex>
      </Card>
    </Flex>
  );
};

export default PointRecordPanel;
