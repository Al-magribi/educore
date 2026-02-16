import React, { useState, useEffect } from "react";
import { Input, Button, theme, Flex } from "antd";
import { Search, Plus, Upload as UploadIcon } from "lucide-react"; // Import icon upload
import { useGetClassesQuery } from "../../../../service/main/ApiClass";

import { InfiniteScrollList } from "../../../../components";
import ClassItem from "./ClassItem";
import ClassModal from "./ClassModal";
import StudentDrawer from "./StudentDrawer";
import UploadStudent from "./components/UploadStudent"; // Import Drawer baru

const Classes = ({ screens }) => {
  const { token } = theme.useToken();
  const isMobile = !!screens?.xs;

  // State Query
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(12);

  // State Data & UI
  const [listData, setListData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // Modal & Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Untuk manage siswa per kelas
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false); // STATE BARU: Untuk upload global

  const [selectedClass, setSelectedClass] = useState(null);
  const [modalMode, setModalMode] = useState("add");

  // Fetch Data
  const { data, isFetching, refetch } = useGetClassesQuery({
    page,
    limit,
    search,
  });

  // --- INFINITE SCROLL LOGIC ---
  // --- PERBAIKAN LOGIC STATE UPDATE ---
  useEffect(() => {
    if (data) {
      if (page === 1) {
        // Jika halaman 1, replace semua data (Fresh Load / Reset)
        setListData(data.classes);
      } else {
        // Jika halaman > 1 (Scroll / Refetch background)
        setListData((prev) => {
          // 1. Buat Map dari data baru untuk akses cepat
          const newItemsMap = new Map(
            data.classes.map((item) => [item.id, item]),
          );

          // 2. Update item yang sudah ada di list sebelumnya (Realtime Update count)
          const updatedPrev = prev.map((item) =>
            newItemsMap.has(item.id) ? newItemsMap.get(item.id) : item,
          );

          // 3. Cari item yang benar-benar baru (belum ada di list)
          const reallyNewItems = data.classes.filter(
            (item) => !prev.some((p) => p.id === item.id),
          );

          return [...updatedPrev, ...reallyNewItems];
        });
      }
      setHasMore(page < data.totalPages);
    }
  }, [data, page]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [search]);

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  // --- ACTIONS ---
  const handleSearch = (e) => setSearch(e.target.value);

  const handleAddClass = () => {
    setSelectedClass(null);
    setModalMode("add");
    setIsModalOpen(true);
  };

  const handleEditClass = (item) => {
    setSelectedClass(item);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleManageStudents = (item) => {
    setSelectedClass(item);
    setIsDrawerOpen(true);
  };

  const handleModalSuccess = () => {
    setPage(1);
    refetch();
    setIsModalOpen(false);
    setIsDrawerOpen(false);
  };

  const handleUploadClose = () => {
    setIsUploadDrawerOpen(false);
    setPage(1);
    refetch();
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* HEADER AREA */}
      <div
        style={{
          padding: "16px",
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
            Manajemen Kelas
          </h2>
          <span style={{ color: token.colorTextSecondary, fontSize: "13px" }}>
            Kelola data kelas, jurusan, dan siswa
          </span>
        </div>

        <Flex
          gap={12}
          wrap
          style={{
            flex: isMobile ? "0 0 100%" : 1,
            justifyContent: isMobile ? "stretch" : "flex-end",
            alignItems: isMobile ? "stretch" : "center",
            flexDirection: isMobile ? "column" : "row",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <Input
            prefix={<Search size={16} color={token.colorTextDescription} />}
            placeholder='Cari nama kelas...'
            onChange={handleSearch}
            style={{ width: isMobile ? "100%" : 300 }}
            allowClear
          />

          <Button
            type='primary'
            icon={<Plus size={16} />}
            onClick={handleAddClass}
            style={{ width: isMobile ? "100%" : "auto" }}
          >
            Tambah Kelas
          </Button>

          {/* BUTTON UPLOAD DATA SISWA GLOBAL */}
          <Button
            icon={<UploadIcon size={16} />}
            onClick={() => setIsUploadDrawerOpen(true)}
            style={{ width: isMobile ? "100%" : "auto" }}
          >
            Upload Siswa
          </Button>
        </Flex>
      </div>

      {/* CONTENT AREA */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <InfiniteScrollList
          data={listData}
          loading={isFetching}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          emptyText={search ? "Kelas tidak ditemukan" : "Belum ada data kelas"}
          grid={{
            gutter: [16, 16],
            xs: 24,
            sm: 12,
            md: 8,
            lg: 6,
            xl: 6,
            xxl: 4,
          }}
          renderItem={(item) => (
            <ClassItem
              item={item}
              onEdit={() => handleEditClass(item)}
              onManageStudents={() => handleManageStudents(item)}
            />
          )}
        />
      </div>

      {/* MODAL MANAGE CLASS */}
      <ClassModal
        open={isModalOpen}
        mode={modalMode}
        initialData={selectedClass}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* DRAWER MANAGE STUDENT (PER CLASS) */}
      <StudentDrawer
        open={isDrawerOpen}
        classData={selectedClass}
        onClose={handleModalSuccess}
      />

      {/* DRAWER UPLOAD GLOBAL (NEW) */}
      <UploadStudent open={isUploadDrawerOpen} onClose={handleUploadClose} />
    </div>
  );
};

export default Classes;
