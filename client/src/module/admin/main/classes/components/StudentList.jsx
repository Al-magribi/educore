import React, { useState } from "react";
import { motion } from "framer-motion";
import { App, Button, Empty, Popconfirm, Table, Tooltip, Typography } from "antd";
import { Trash2, Users } from "lucide-react";
import {
  useGetStudentsQuery,
  useDeleteStudentMutation,
} from "../../../../../service/main/ApiClass";
import { DataListCard } from "../../../../../components/ui/muse/DataSection";

const { Text } = Typography;
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
      title: "NAMA LENGKAP",
      dataIndex: "student_name",
      key: "name",
      render: (text) => <Text strong>{text || "-"}</Text>,
    },
    {
      title: "AKSI",
      key: "action",
      width: 90,
      align: "center",
      render: (_, record) => (
        <Popconfirm
          title={`Keluarkan ${record.student_name || "siswa"}?`}
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
              aria-label='Keluarkan dari kelas'
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
    >
      <DataListCard
        title='Anggota Kelas'
        icon={<Users size={16} />}
        count={totalStudents}
        unit='siswa'
        description={hasSearch ? `filter: "${search}"` : undefined}
        searchProps={{
          placeholder: "Cari siswa...",
          onChange: (e) => setSearch(e.target.value),
        }}
      >
        <Table
          dataSource={students}
          columns={columns}
          rowKey='user_id'
          loading={isFetching}
          pagination={{ pageSize: 10, size: "small", style: { paddingInline: 24 } }}
          size='middle'
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  hasSearch
                    ? "Tidak ada siswa yang cocok dengan pencarian."
                    : "Belum ada siswa di kelas ini. Tambahkan lewat tab Tambah Manual."
                }
              />
            ),
          }}
        />
      </DataListCard>
    </MotionDiv>
  );
};

export default StudentList;
