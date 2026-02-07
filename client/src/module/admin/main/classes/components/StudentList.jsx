import React, { useState } from "react";
import { Table, Button, Input, Popconfirm, App } from "antd";
import { Search, Trash2 } from "lucide-react";
import {
  useGetStudentsQuery,
  useDeleteStudentMutation,
} from "../../../../../service/main/ApiClass";

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

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id).unwrap();
      message.success("Siswa dikeluarkan dari kelas");
    } catch (err) {
      message.error("Gagal menghapus siswa");
    }
  };

  const columns = [
    { title: "NIS", dataIndex: "nis", key: "nis", width: 120 },
    { title: "Nama Lengkap", dataIndex: "student_name", key: "name" },
    {
      title: "Aksi",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="Keluarkan Siswa"
          description="Siswa akan dihapus dari kelas ini."
          onConfirm={() => handleDelete(record.user_id)}
        >
          <Button type="text" danger size="small" icon={<Trash2 size={16} />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Input
        placeholder="Cari siswa dalam kelas..."
        prefix={<Search size={14} />}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />
      <Table
        dataSource={data?.students || []}
        columns={columns}
        rowKey="user_id"
        loading={isFetching}
        pagination={{ pageSize: 10, size: "small" }}
        size="small"
      />
    </div>
  );
};

export default StudentList;
