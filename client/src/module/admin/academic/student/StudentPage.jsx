import React, { useState, useEffect } from "react";
import { Input, Button, Typography, Space, message, theme } from "antd";
import { Search as SearchIcon, Plus } from "lucide-react";
// Sesuaikan path import ini dengan struktur folder Anda
import { InfiniteScrollList } from "../../../../components";
import {
  useGetStudentsQuery,
  useAddStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
} from "../../../../service/academic/ApiStudent";

import StudentCard from "./StudentCard";
import StudentForm from "./StudentForm";

const { Title, Text } = Typography;

const StudentPage = () => {
  const { token } = theme.useToken();

  // --- Local States ---
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [accumulatedData, setAccumulatedData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // --- API Hooks ---
  const { data: apiData, isFetching } = useGetStudentsQuery({
    page,
    limit: 12, // Load 12 item per batch
    search,
  });

  const [addStudent, { isLoading: isAdding }] = useAddStudentMutation();
  const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();

  // --- Logic Infinite Scroll & Accumulation ---
  useEffect(() => {
    if (apiData?.data) {
      if (page === 1) {
        // Jika page 1 (awal atau hasil search baru), replace data
        setAccumulatedData(apiData.data);
      } else {
        // PERBAIKAN DISINI: Mencegah duplikasi data (Key Error Fix)
        setAccumulatedData((prev) => {
          // 1. Buat Set dari ID yang sudah ada di state sebelumnya
          const existingIds = new Set(prev.map((item) => item.id));

          // 2. Filter data baru yang masuk, hanya ambil yang ID-nya belum ada
          const newUniqueItems = apiData.data.filter(
            (item) => !existingIds.has(item.id),
          );

          // 3. Gabungkan
          return [...prev, ...newUniqueItems];
        });
      }

      // Cek apakah masih ada data untuk page berikutnya
      // Gunakan totalData dari API untuk validasi akurat
      const currentCount = (page - 1) * 12 + apiData.data.length;
      if (currentCount >= apiData.totalData) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    }
  }, [apiData, page]);

  // --- Handlers ---
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset ke page 1 saat search
    setHasMore(true);
    // Note: accumulatedData akan di-reset oleh useEffect saat data baru masuk
  };

  const handleLoadMore = () => {
    // Pastikan tidak meload jika sedang fetching atau tidak ada data lagi
    // Tambahkan !isFetching agar tidak double request saat scroll cepat
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleOpenDrawer = (record = null) => {
    setEditingItem(record);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        birth_date: values.birth_date
          ? values.birth_date.format("YYYY-MM-DD")
          : null,
      };

      if (editingItem) {
        await updateStudent({ id: editingItem.id, ...payload }).unwrap();
        // Update lokal agar UI responsif tanpa reload total
        setAccumulatedData((prev) =>
          prev.map((item) =>
            item.id === editingItem.id ? { ...item, ...payload } : item,
          ),
        );
        message.success("Berhasil diperbarui");
      } else {
        await addStudent(payload).unwrap();
        // Untuk create, reset ke page 1 agar data baru muncul di atas
        setPage(1);
        message.success("Siswa ditambahkan");
      }
      setIsDrawerOpen(false);
    } catch (error) {
      message.error("Gagal menyimpan data");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id).unwrap();
      // Hapus dari state lokal langsung agar smooth
      setAccumulatedData((prev) => prev.filter((item) => item.id !== id));
      message.success("Siswa dihapus");
    } catch (error) {
      message.error("Gagal menghapus");
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Data Siswa <span>({apiData?.totalData || 0})</span>
          </Title>
          <Text type="secondary">Kelola data siswa sekolah</Text>
        </div>
        <Space>
          <Input
            placeholder="Cari Siswa..."
            prefix={<SearchIcon size={16} color={token.colorTextPlaceholder} />}
            onChange={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<Plus size={18} />}
            onClick={() => handleOpenDrawer(null)}
          >
            Tambah
          </Button>
        </Space>
      </div>

      {/* Infinite Scroll List Section */}
      <InfiniteScrollList
        data={accumulatedData}
        loading={isFetching}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        height="calc(100vh - 150px)" // Tinggi area scroll
        emptyText="Tidak ada siswa ditemukan"
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 }} // Grid Card
        renderItem={(item) => (
          <StudentCard
            student={item}
            onEdit={handleOpenDrawer}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        )}
      />

      {/* Form Drawer */}
      <StudentForm
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editingItem}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
};

export default StudentPage;
