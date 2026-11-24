import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button, Grid } from "antd";
import { GraduationCap, LayoutGrid, Upload as UploadIcon, Users } from "lucide-react";
import { useGetClassesQuery } from "../../../../service/main/ApiClass";

import { InfiniteScrollList } from "../../../../components";
import ClassItem from "./ClassItem";
import ClassModal from "./ClassModal";
import StudentDrawer from "./StudentDrawer";
import UploadStudent from "./components/UploadStudent";
import { StatCard } from "../../../../components/ui/muse";
import { DataListCard } from "../../../../components/ui/muse/DataSection";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const Classes = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(12);

  const [listData, setListData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null);
  const [modalMode, setModalMode] = useState("add");

  const { data, isFetching, refetch } = useGetClassesQuery({
    page,
    limit,
    search,
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (data) {
      if (page === 1) {
        setListData(data.classes);
      } else {
        setListData((prev) => {
          const newItemsMap = new Map(
            data.classes.map((item) => [item.id, item]),
          );

          const updatedPrev = prev.map((item) =>
            newItemsMap.has(item.id) ? newItemsMap.get(item.id) : item,
          );

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
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

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

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totalClasses = toNumber(
    data?.totalData || data?.total || listData.length,
  );
  const totalStudents = listData.reduce(
    (sum, item) => sum + toNumber(item.students_count),
    0,
  );
  const activeClasses = listData.filter((item) => item.is_active).length;

  return (
    <>
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}
      >
        <div
          style={{
            display: "grid",
            gap: isMobile ? 16 : 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <StatCard title='Total Kelas' value={totalClasses} icon={<LayoutGrid size={24} />} tone='primary' />
          <StatCard title='Siswa Terdata' value={totalStudents} icon={<Users size={24} />} tone='accent' />
          <StatCard title='Kelas Aktif' value={activeClasses} icon={<GraduationCap size={24} />} tone='navy' />
        </div>

        <DataListCard
          flush={false}
          title='Direktori Kelas'
          count={totalClasses}
          unit='kelas'
          searchProps={{ placeholder: "Cari nama kelas...", onChange: handleSearch }}
          extra={
            <Button icon={<UploadIcon size={16} />} onClick={() => setIsUploadDrawerOpen(true)}>
              {isMobile ? "Upload" : "Upload Siswa"}
            </Button>
          }
          onAdd={handleAddClass}
          addLabel='Tambah Kelas'
        >
          <InfiniteScrollList
            data={listData}
            loading={isFetching}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            height='auto'
            emptyText={
              search
                ? "Kelas tidak ditemukan. Coba kata kunci lain."
                : "Belum ada kelas. Tambahkan kelas pertama atau upload siswa."
            }
            grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 8, lg: 8, xl: 6 }}
            renderItem={(item) => (
              <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.18 }} style={{ height: "100%" }}>
                <ClassItem
                  item={item}
                  onEdit={() => handleEditClass(item)}
                  onManageStudents={() => handleManageStudents(item)}
                />
              </MotionDiv>
            )}
          />
        </DataListCard>
      </MotionDiv>

      <ClassModal
        open={isModalOpen}
        mode={modalMode}
        initialData={selectedClass}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <StudentDrawer
        open={isDrawerOpen}
        classData={selectedClass}
        onClose={handleModalSuccess}
      />

      <UploadStudent open={isUploadDrawerOpen} onClose={handleUploadClose} />
    </>
  );
};

export default Classes;
