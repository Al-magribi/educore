import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  PencilLine,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Trophy,
} from "lucide-react";

const { Text, Title } = Typography;

const tableCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
};

const TypeTag = ({ value }) => {
  const isReward = value === "reward";
  const Icon = isReward ? Trophy : ShieldAlert;

  return (
    <Tag
      style={{
        margin: 0,
        borderRadius: 999,
        padding: "4px 10px",
        border: "none",
        background: isReward ? "#fff7d6" : "#fee2e2",
        color: isReward ? "#92400e" : "#b91c1c",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      <Icon size={13} />
      {isReward ? "Prestasi" : "Pelanggaran"}
    </Tag>
  );
};

const formatEntryDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filteredDataSource = useMemo(() => {
    const keyword = nameFilter.trim().toLowerCase();

    return dataSource.filter((item) => {
      const matchName = keyword
        ? (item.student_name || "").toLowerCase().includes(keyword)
        : true;
      const matchType = typeFilter ? item.point_type === typeFilter : true;
      return matchName && matchType;
    });
  }, [dataSource, nameFilter, typeFilter]);

  const columns = [
    {
      title: "Tanggal",
      dataIndex: "entry_date",
      key: "entry_date",
      width: 160,
      render: (value) => <Text>{formatEntryDate(value)}</Text>,
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

  const emptyNode = (
    <Empty
      description='Belum ada entri poin yang cocok dengan filter.'
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
  );

  const mobileContent = (
    <Flex vertical gap={12}>
      {filteredDataSource.length ? (
        filteredDataSource.map((item) => (
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
                    <Text style={{ color: "#64748b" }}>
                      {formatEntryDate(item.entry_date)}
                    </Text>
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
        emptyNode
      )}
    </Flex>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <Card
        style={tableCardStyle}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
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
                  ? `Siswa ${selectedStudent.student_name} sedang dipilih pada ringkasan kelas, tetapi tabel ini tetap menampilkan seluruh riwayat sesuai filter.`
                  : "Tinjau seluruh riwayat poin siswa, lalu saring berdasarkan nama dan jenis rule."}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.3fr) 220px",
              gap: 12,
            }}
          >
            <Input
              allowClear
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              prefix={<Search size={16} color='#64748b' />}
              placeholder='Filter nama siswa'
              style={{ borderRadius: 14, height: 42 }}
            />
            <Select
              allowClear
              value={typeFilter || undefined}
              onChange={(value) => setTypeFilter(value || "")}
              placeholder='Semua jenis rule'
              style={{ width: "100%" }}
              options={[
                { label: "Prestasi", value: "reward" },
                { label: "Pelanggaran", value: "punishment" },
              ]}
            />
          </div>

          {isMobile ? (
            mobileContent
          ) : (
            <Table
              rowKey='id'
              loading={loading}
              dataSource={filteredDataSource}
              columns={columns}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              locale={{ emptyText: emptyNode }}
            />
          )}
        </Flex>
      </Card>
    </motion.div>
  );
};

export default TeacherPointEntryTable;
