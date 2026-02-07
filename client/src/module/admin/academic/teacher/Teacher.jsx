import React, { useState, useEffect } from "react";
import { Button, Layout, Typography, message, Input } from "antd";
import { UserPlus, Search } from "lucide-react";
import TeacherList from "./TeacherList";
import TeacherForm from "./TeacherForm";
import {
  useGetTeachersQuery,
  useAddTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
} from "../../../../service/academic/ApiTeacher"; // Sesuaikan path

const { Title, Text } = Typography;
const { Content } = Layout;

const Teacher = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchText, setSearchText] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [allTeachers, setAllTeachers] = useState([]);

  const { data: teachersData, isFetching } = useGetTeachersQuery({
    page,
    limit,
    search: searchText,
  });

  const [addTeacher, { isLoading: isAdding }] = useAddTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();
  const [deleteTeacher] = useDeleteTeacherMutation();

  useEffect(() => {
    if (teachersData?.data) {
      if (page === 1) {
        setAllTeachers(teachersData.data);
      } else {
        setAllTeachers((prev) => {
          const newItems = teachersData.data.filter(
            (newItem) => !prev.some((prevItem) => prevItem.id === newItem.id),
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [teachersData, page]);

  useEffect(() => {
    setPage(1);
  }, [searchText]);

  const handleLoadMore = () => {
    if (!isFetching && allTeachers.length < (teachersData?.total || 0)) {
      setPage((prev) => prev + 1);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTeacher(id).unwrap();
      message.success("Guru berhasil dihapus");
      setPage(1);
    } catch (error) {
      message.error("Gagal menghapus guru");
    }
  };

  // --- PERBAIKAN UTAMA DI SINI ---
  const handleSubmit = async (values) => {
    try {
      // LOGIKA FLATTENING: Ubah format Form kembali ke format Database
      // Form: [{ subject_id: 1, class_ids: [101, 102] }]
      // API:  [{ subject_id: 1, class_id: 101 }, { subject_id: 1, class_id: 102 }]

      const formattedAllocations = [];

      if (values.allocations && values.allocations.length > 0) {
        values.allocations.forEach((group) => {
          // Pastikan class_ids ada dan berupa array
          if (group.class_ids && Array.isArray(group.class_ids)) {
            group.class_ids.forEach((classId) => {
              formattedAllocations.push({
                subject_id: group.subject_id,
                class_id: classId,
              });
            });
          }
        });
      }

      // Bungkus data yang sudah diformat ke payload
      const payload = {
        ...values,
        allocations: formattedAllocations, // Timpa dengan data yang sudah di-flatten
      };

      if (editingTeacher) {
        await updateTeacher({ id: editingTeacher.id, ...payload }).unwrap();
        message.success("Data guru diperbarui");
        setPage(1);
      } else {
        await addTeacher(payload).unwrap();
        message.success("Guru baru ditambahkan");
        setPage(1);
      }
      setIsModalOpen(false);
      setEditingTeacher(null);
    } catch (error) {
      console.error(error);
      message.error("Terjadi kesalahan saat menyimpan");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: "white" }}>
      <Content>
        {/* Header & Search */}
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Data Guru
            </Title>
            <Text type="secondary">
              Kelola data guru, wali kelas, dan alokasi mengajar
            </Text>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Input
              placeholder="Cari Nama / NIP..."
              prefix={<Search size={16} className="text-gray-400" />}
              style={{ width: 250, borderRadius: 8 }}
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button
              type="primary"
              icon={<UserPlus size={18} />}
              onClick={() => {
                setEditingTeacher(null);
                setIsModalOpen(true);
              }}
            >
              Tambah Guru
            </Button>
          </div>
        </div>

        <TeacherList
          data={allTeachers}
          loading={isFetching}
          hasMore={allTeachers.length < (teachersData?.total || 0)}
          onLoadMore={handleLoadMore}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <TeacherForm
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingTeacher(null);
          }}
          onSubmit={handleSubmit}
          initialValues={editingTeacher}
          loading={isAdding || isUpdating}
        />
      </Content>
    </Layout>
  );
};

export default Teacher;
