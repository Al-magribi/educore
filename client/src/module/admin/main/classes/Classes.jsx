import React, { useState, useEffect } from "react";
import { Input, Button, Flex, Card, Grid, Typography, Statistic } from "antd";
import {
  Search,
  Plus,
  Upload as UploadIcon,
  GraduationCap,
  Users,
  LayoutGrid,
} from "lucide-react";
import { useGetClassesQuery } from "../../../../service/main/ApiClass";

import { InfiniteScrollList } from "../../../../components";
import ClassItem from "./ClassItem";
import ClassModal from "./ClassModal";
import StudentDrawer from "./StudentDrawer";
import UploadStudent from "./components/UploadStudent";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

const Classes = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;

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
  const summaryCards = [
    {
      key: "classes",
      title: "Total Kelas",
      value: totalClasses,
      icon: <LayoutGrid size={18} />,
    },
    {
      key: "students",
      title: "Siswa Terdata",
      value: totalStudents,
      icon: <Users size={18} />,
    },
    {
      key: "active",
      title: "Kelas Aktif",
      value: activeClasses,
      icon: <GraduationCap size={18} />,
    },
  ];

  return (
    <>
      <Flex gap={16} wrap="wrap" style={{ marginBottom: 20 }}>
        {summaryCards.map((item) => (
          <Card
            key={item.key}
            hoverable
            style={{
              flex: activeScreens.md ? "1 1 0" : "1 1 100%",
              minWidth: activeScreens.md ? 0 : "100%",
            }}
            styles={{ body: { padding: "18px 20px" } }}
          >
            <Flex justify="space-between" align="start">
              <Statistic title={item.title} value={item.value} />
              <div
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #dcfce7, #dbeafe)",
                  color: "#0369a1",
                }}
              >
                {item.icon}
              </div>
            </Flex>
          </Card>
        ))}
      </Flex>

      <Flex vertical gap={"middle"}>
        <Card hoverable>
          <Flex
            justify="space-between"
            align={activeScreens.md ? "center" : "stretch"}
            vertical={!activeScreens.md}
            gap={16}
          >
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Direktori Kelas
              </Title>
              <Text type="secondary">
                Cari kelas, tambah kelas baru, atau lakukan upload siswa global.
              </Text>
            </div>

            <Flex
              gap={10}
              vertical={!activeScreens.md}
              style={{ width: !activeScreens.md ? "100%" : "auto" }}
            >
              <Input
                prefix={<Search size={16} color="rgba(0,0,0,.25)" />}
                placeholder="Cari nama kelas..."
                onChange={handleSearch}
                style={{ width: !activeScreens.md ? "100%" : 300 }}
                allowClear
                size="large"
              />

              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={handleAddClass}
                size="large"
              >
                Tambah Kelas
              </Button>

              <Button
                icon={<UploadIcon size={16} />}
                onClick={() => setIsUploadDrawerOpen(true)}
                size="large"
              >
                Upload Siswa
              </Button>
            </Flex>
          </Flex>
        </Card>

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
          }}
          renderItem={(item) => (
            <ClassItem
              item={item}
              onEdit={() => handleEditClass(item)}
              onManageStudents={() => handleManageStudents(item)}
            />
          )}
        />
      </Flex>

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
