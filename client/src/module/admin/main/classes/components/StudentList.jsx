import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Table,
  Button,
  Input,
  Popconfirm,
  App,
  Card,
  Flex,
  Typography,
  Statistic,
  Tag,
  Empty,
  Tooltip,
} from "antd";
import { Search, Trash2, Users, Filter, ShieldAlert } from "lucide-react";
import {
  useGetStudentsQuery,
  useDeleteStudentMutation,
} from "../../../../../service/main/ApiClass";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const StudentList = ({ classId }) => {
  const [search, setSearch] = useState("");
  const { data, isFetching } = useGetStudentsQuery({
    page: 1,
    limit: 50,
    search,
    classid: classId,
  });
  const [deleteStudent] = useDeleteStudentMutation();
  const { message } = App.useApp();

  const students = data?.students || [];
  const totalStudents = students.length;
  const filteredStudents = students.length;
  const hasSearch = Boolean(search.trim());

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id).unwrap();
      message.success("Siswa dikeluarkan dari kelas");
    } catch {
      message.error("Gagal menghapus siswa");
    }
  };

  const columns = [
    {
      title: "NIS",
      dataIndex: "nis",
      key: "nis",
      width: 140,
      render: (text) => <Text strong>{text || "-"}</Text>,
    },
    {
      title: "Nama Lengkap",
      dataIndex: "student_name",
      key: "name",
      width: 180,

      render: (text) => (
        <Flex vertical gap={2}>
          <Text strong>{text || "-"}</Text>

          <Tag
            bordered={false}
            color='success'
            style={{ borderRadius: 999, paddingInline: 10, fontWeight: 600 }}
          >
            Terdaftar
          </Tag>
        </Flex>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 90,
      align: "center",
      render: (_, record) => (
        <Popconfirm
          title='Keluarkan Siswa'
          description='Siswa akan dihapus dari kelas ini.'
          onConfirm={() => handleDelete(record.user_id)}
          okText='Keluarkan'
          cancelText='Batal'
          okButtonProps={{ danger: true }}
        >
          <Tooltip title='Keluarkan dari kelas'>
            <Button
              type='text'
              danger
              size='small'
              icon={<Trash2 size={16} />}
            />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <Card
        variant='borderless'
        style={{
          borderRadius: 22,
          background:
            "linear-gradient(135deg, rgba(240,253,244,0.9), rgba(239,246,255,0.9))",
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.05)",
        }}
        styles={{ body: { padding: 18 } }}
      >
        <Flex justify='space-between' align='center' gap={16} wrap='wrap'>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Daftar Siswa Dalam Kelas
            </Title>
            <Text type='secondary'>
              Cari siswa lebih cepat dan kelola data anggota kelas dari satu
              panel.
            </Text>
          </div>

          <Input
            placeholder='Cari siswa dalam kelas...'
            prefix={<Search size={14} color='#94a3b8' />}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280, maxWidth: "100%" }}
            allowClear
            size='large'
          />
        </Flex>

        <Flex gap={12} wrap='wrap' style={{ marginTop: 16 }}>
          <Card
            size='small'
            style={{
              minWidth: 140,
              borderRadius: 18,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
            }}
            styles={{ body: { padding: "12px 14px" } }}
          >
            <Flex justify='space-between' align='start' gap={12}>
              <Statistic title='Total Siswa' value={totalStudents} />
              <Users size={18} color='#0369a1' />
            </Flex>
          </Card>

          <Card
            size='small'
            style={{
              minWidth: 140,
              borderRadius: 18,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
            }}
            styles={{ body: { padding: "12px 14px" } }}
          >
            <Flex justify='space-between' align='start' gap={12}>
              <Statistic title='Hasil Filter' value={filteredStudents} />
              <Filter size={18} color='#0284c7' />
            </Flex>
          </Card>

          <Tag
            variant='borderless'
            style={{
              alignSelf: "center",
              borderRadius: 999,
              padding: "8px 14px",
              marginInlineEnd: 0,
              background: hasSearch
                ? "rgba(14, 165, 233, 0.12)"
                : "rgba(22, 163, 74, 0.12)",
              color: hasSearch ? "#0369a1" : "#15803d",
              fontWeight: 600,
            }}
          >
            {hasSearch
              ? `Filter aktif: "${search}"`
              : "Semua siswa ditampilkan"}
          </Tag>
        </Flex>
      </Card>

      <Card
        variant='borderless'
        style={{
          borderRadius: 22,
          boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Table
          dataSource={students}
          columns={columns}
          rowKey='user_id'
          loading={isFetching}
          pagination={{ pageSize: 10, size: "small" }}
          size='middle'
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Flex vertical align='center' gap={6}>
                    <ShieldAlert size={20} color='#94a3b8' />
                    <Text type='secondary'>
                      {hasSearch
                        ? "Tidak ada siswa yang cocok dengan pencarian."
                        : "Belum ada siswa di kelas ini."}
                    </Text>
                  </Flex>
                }
              />
            ),
          }}
        />
      </Card>
    </MotionDiv>
  );
};

export default StudentList;
