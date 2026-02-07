import React, { useState, useEffect } from "react";
import InfiniteScrollList from "../scroll/InfiniteScrollList";
import {
  useGetTeachersQuery,
  useDeleteTeacherMutation,
} from "../../service/main/ApiTeacher";
import ModalTeacher from "./ModalTeacher";
import {
  Button,
  Input,
  Card,
  Typography,
  Space,
  Tooltip,
  Popconfirm,
  Tag,
  Avatar,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  BookOutlined,
} from "@ant-design/icons";
import useDebounced from "../../utils/useDebounced";

const { Title, Text } = Typography;

const TeacherList = () => {
  // === State ===
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [listData, setListData] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const debounced = useDebounced(search, 500);

  // === RTK Query ===
  const {
    data: apiData,
    isFetching,
    refetch,
  } = useGetTeachersQuery({
    page,
    limit: 16,
    search: debounced,
  });

  const [deleteTeacher, { isLoading: isDeleting }] = useDeleteTeacherMutation();

  // === Infinite Scroll Logic ===
  useEffect(() => {
    if (apiData?.data) {
      if (page === 1) {
        setListData(apiData.data);
      } else {
        setListData((prev) => {
          const newItems = apiData.data.filter(
            (newItem) => !prev.some((prevItem) => prevItem.id === newItem.id),
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [apiData, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // === Handlers ===
  const handleLoadMore = () => {
    if (apiData?.hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTeacher(id).unwrap();
      message.success("Guru berhasil dihapus");
      setPage(1);
      refetch();
    } catch (error) {
      message.error("Gagal menghapus data");
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPage(1);
    refetch();
  };

  // === Render Card Item ===
  const renderItem = (item) => (
    <Card hoverable style={{ height: "100%" }} bodyStyle={{ padding: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {/* Info Area */}
        <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
          <Avatar
            size={48}
            src={item.img_url} // Jika ada foto profil
            icon={<UserOutlined />}
            shape="circle"
            style={{ backgroundColor: "#87d068", flexShrink: 0 }}
          />

          <div style={{ minWidth: 0, flex: 1 }}>
            <Title level={5} style={{ margin: 0, fontSize: 15 }} ellipsis>
              {item.full_name}
            </Title>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                @{item.username}
              </Text>
              <span style={{ color: "#ddd" }}>|</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.nip || "Non-NIP"}
              </Text>
            </div>

            <div style={{ marginTop: 8 }}>
              {/* Tag Homebase */}
              <Tag
                icon={<BookOutlined />}
                color="cyan"
                style={{ marginBottom: 4 }}
              >
                {item.homebase_name || "Belum ada Homebase"}
              </Tag>

              {/* Tag Status */}
              <Tag color={item.is_active ? "success" : "error"}>
                {item.is_active ? "AKTIF" : "NONAKTIF"}
              </Tag>
            </div>

            <Text
              type="secondary"
              style={{
                fontSize: 11,
                display: "block",
                marginTop: 4,
                color: "#aaa",
              }}
            >
              {item.email || "—"} • {item.phone || "—"}
            </Text>
          </div>
        </div>

        {/* Action Buttons */}
        <Space direction="vertical" size={0}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: "orange" }} />}
              onClick={() => openModal(item)}
            />
          </Tooltip>
          <Popconfirm
            title="Hapus Guru?"
            description="Data mengajar, nilai, dan absensi terkait mungkin akan hilang."
            onConfirm={() => handleDelete(item.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={isDeleting}
            />
          </Popconfirm>
        </Space>
      </div>
    </Card>
  );

  return (
    <>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 10,
        }}
      >
        <Input
          placeholder="Cari nama atau NIP..."
          prefix={<SearchOutlined />}
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal(null)}
        >
          Tambah Guru
        </Button>
      </div>

      {/* Infinite Grid List */}
      <InfiniteScrollList
        data={listData}
        loading={isFetching}
        hasMore={apiData?.hasMore}
        onLoadMore={handleLoadMore}
        renderItem={renderItem}
        height="75vh"
        emptyText="Belum ada data guru"
        // Grid responsive config
        grid={{
          gutter: [16, 16],
          xs: 24,
          sm: 24,
          md: 12,
          lg: 8,
          xl: 6,
          xxl: 6,
        }}
      />

      <ModalTeacher
        open={isModalOpen}
        initialData={editingItem}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default TeacherList;
