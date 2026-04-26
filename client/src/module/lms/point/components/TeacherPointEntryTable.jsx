import React from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { PencilLine, Plus, ShieldAlert, Trash2, Trophy } from "lucide-react";

const { Text, Title } = Typography;

const tableCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const TypeTag = ({ value }) => {
  const isReward = value === "reward";
  const Icon = isReward ? Trophy : ShieldAlert;
  return (
    <Tag
      style={{
        margin: 0,
        borderRadius: 999,
        paddingInline: 10,
        borderColor: isReward ? "#fcd34d" : "#fecaca",
        background: isReward ? "#fffbeb" : "#fef2f2",
        color: isReward ? "#a16207" : "#b91c1c",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon size={13} />
      {isReward ? "Prestasi" : "Pelanggaran"}
    </Tag>
  );
};

const TeacherPointEntryTable = ({
  dataSource = [],
  loading = false,
  isMobile = false,
  selectedStudent,
  onCreate,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      title: "Tanggal",
      dataIndex: "entry_date",
      key: "entry_date",
      width: 120,
      render: (value) => <Text>{value}</Text>,
    },
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Text strong>{record.student_name}</Text>
          <Text style={{ color: "#64748b" }}>NIS {record.nis || "-"}</Text>
        </Flex>
      ),
    },
    {
      title: "Rule",
      dataIndex: "title_snapshot",
      key: "title_snapshot",
      render: (_, record) => (
        <Flex vertical gap={6}>
          <Text strong style={{ color: "#0f172a" }}>
            {record.title_snapshot}
          </Text>
          <TypeTag value={record.point_type} />
        </Flex>
      ),
    },
    {
      title: "Poin",
      dataIndex: "point_value",
      key: "point_value",
      width: 90,
      align: "center",
      render: (value, record) => (
        <Text
          strong
          style={{ color: record.point_type === "reward" ? "#a16207" : "#b91c1c" }}
        >
          {value}
        </Text>
      ),
    },
    {
      title: "Catatan",
      dataIndex: "description",
      key: "description",
      render: (value) => (
        <Text style={{ color: "#64748b" }}>{value || "Tanpa catatan"}</Text>
      ),
    },
    {
      title: "Aksi",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size={8}>
          <Button
            icon={<PencilLine size={15} />}
            onClick={() => onEdit(record)}
            style={{ borderRadius: 12 }}
          />
          <Popconfirm
            title='Hapus poin ini?'
            onConfirm={() => onDelete(record)}
            okText='Hapus'
            cancelText='Batal'
          >
            <Button
              danger
              icon={<Trash2 size={15} />}
              style={{ borderRadius: 12 }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const mobileContent = (
    <Flex vertical gap={12}>
      {dataSource.length ? (
        dataSource.map((item) => (
          <Card
            key={item.id}
            style={{
              borderRadius: 18,
              border: "1px solid #e5edf6",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Flex vertical gap={10}>
              <Flex justify='space-between' align='start' gap={10}>
                <div>
                  <Text strong>{item.student_name}</Text>
                  <div>
                    <Text style={{ color: "#64748b" }}>{item.entry_date}</Text>
                  </div>
                </div>
                <TypeTag value={item.point_type} />
              </Flex>

              <div>
                <Text strong style={{ color: "#0f172a" }}>
                  {item.title_snapshot}
                </Text>
                <div>
                  <Text style={{ color: "#64748b" }}>
                    {item.description || "Tanpa catatan"}
                  </Text>
                </div>
              </div>

              <Flex justify='space-between' align='center'>
                <Text
                  strong
                  style={{
                    color: item.point_type === "reward" ? "#a16207" : "#b91c1c",
                    fontSize: 18,
                  }}
                >
                  {item.point_value} poin
                </Text>
                <Space>
                  <Button
                    icon={<PencilLine size={15} />}
                    onClick={() => onEdit(item)}
                    style={{ borderRadius: 12 }}
                  />
                  <Popconfirm
                    title='Hapus poin ini?'
                    onConfirm={() => onDelete(item)}
                    okText='Hapus'
                    cancelText='Batal'
                  >
                    <Button
                      danger
                      icon={<Trash2 size={15} />}
                      style={{ borderRadius: 12 }}
                    />
                  </Popconfirm>
                </Space>
              </Flex>
            </Flex>
          </Card>
        ))
      ) : (
        <Empty
          description='Belum ada entri poin untuk filter siswa yang dipilih.'
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Flex>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <Card style={tableCardStyle} styles={{ body: { padding: isMobile ? 16 : 20 } }}>
        <Flex vertical gap={16}>
          <Flex
            vertical={isMobile}
            justify='space-between'
            align={isMobile ? "flex-start" : "center"}
            gap={12}
          >
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Riwayat Poin Siswa
              </Title>
              <Text style={{ color: "#64748b" }}>
                {selectedStudent
                  ? `Menampilkan riwayat poin untuk ${selectedStudent.student_name}.`
                  : "Pilih salah satu siswa untuk fokus pada riwayat poin, atau tampilkan semuanya."}
              </Text>
            </div>

            <Button
              type='primary'
              icon={<Plus size={16} />}
              onClick={onCreate}
              style={{
                borderRadius: 12,
                background: "#0f172a",
                borderColor: "#0f172a",
                fontWeight: 700,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Tambah Poin
            </Button>
          </Flex>

          {isMobile ? (
            mobileContent
          ) : (
            <Table
              rowKey='id'
              loading={loading}
              dataSource={dataSource}
              columns={columns}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              locale={{
                emptyText: (
                  <Empty
                    description='Belum ada entri poin untuk filter siswa yang dipilih.'
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          )}
        </Flex>
      </Card>
    </motion.div>
  );
};

export default TeacherPointEntryTable;
