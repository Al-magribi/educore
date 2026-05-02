import { Button, Card, Dropdown, Space, Table, Tag, Typography } from "antd";
import { EllipsisOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

import { cardStyle, formatDateTime } from "../constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const ContributionOfficersTab = ({
  officers,
  loading,
  removingOfficerId,
  onOpenOfficerModal,
  onRemoveOfficer,
}) => {
  const columns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type="secondary">{record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Kelas",
      dataIndex: "class_name",
      key: "class_name",
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (value) =>
        value ? <Tag color="blue">Aktif</Tag> : <Tag color="default">Nonaktif</Tag>,
    },
    {
      title: "Ditugaskan",
      dataIndex: "assigned_at",
      key: "assigned_at",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Catatan",
      dataIndex: "notes",
      key: "notes",
      render: (value) => value || "-",
    },
    {
      title: "Aksi",
      key: "action",
      align: "center",
      render: (_, record) =>
        record.is_active ? (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "deactivate",
                  label: "Nonaktifkan petugas",
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === "deactivate") {
                  onRemoveOfficer(record.student_id);
                }
              },
            }}
          >
            <Button
              icon={<EllipsisOutlined />}
              loading={removingOfficerId === record.student_id}
              style={{ borderRadius: 999 }}
            >
              Aksi
            </Button>
          </Dropdown>
        ) : (
          <Text type="secondary">-</Text>
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
                Petugas Kas Kelas
              </Title>
              <Paragraph style={{ margin: 0, color: "#64748b" }}>
                Petugas aktif dapat membantu pencatatan kas kelas pada periode
                aktif ini.
              </Paragraph>
            </Space>
            <Button
              onClick={onOpenOfficerModal}
              style={{ borderRadius: 999, fontWeight: 600 }}
            >
              Tambah Petugas
            </Button>
          </Space>

          <Table
            rowKey="officer_id"
            columns={columns}
            dataSource={officers}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 900 }}
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default ContributionOfficersTab;
