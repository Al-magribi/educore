import React, { useState, useEffect } from "react";
import { AppLayout, InfiniteScrollList } from "../../../components"; // Pastikan path benar
import {
  useGetAdminsQuery,
  useDeleteAdminMutation,
} from "../../../service/center/ApiAdmin";
import ModalAdmin from "./ModalAdmin";
import {
  Button,
  Input,
  Card,
  Typography,
  Space,
  Tooltip,
  Popconfirm,
  Tag,
  message,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CrownFilled,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const CenterAdmin = () => {
  // === State ===
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [listData, setListData] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // === RTK Query ===
  const {
    data: apiData,
    isFetching,
    refetch,
  } = useGetAdminsQuery({
    page,
    limit: 10,
    search,
  });

  const [deleteAdmin, { isLoading: isDeleting }] = useDeleteAdminMutation();

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
    setPage(1); // Reset page saat search berubah
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
      await deleteAdmin(id).unwrap();
      message.success("Admin berhasil dihapus");
      setPage(1);
      refetch();
    } catch (error) {
      message.error("Gagal menghapus admin");
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPage(1);
    refetch();
  };

  // === Render Item ===
  const renderItem = (item) => {
    const isCenter = item.level === "center";
    return (
      <Card
        hoverable
        style={{ height: "100%" }}
        bodyStyle={{ padding: "16px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {/* Avatar & Info */}
          <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
            <Avatar
              size={48}
              icon={<UserOutlined />}
              style={{
                backgroundColor: isCenter ? "#faad14" : "#1890ff",

                flexShrink: 0, // <--- PERBAIKAN UTAMA: Mencegah avatar gepeng
              }}
            />

            {/* Wrapper teks harus minWidth 0 agar ellipsis berfungsi */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <Title level={5} style={{ margin: 0, fontSize: 15 }} ellipsis>
                {item.full_name}
                {isCenter && (
                  <CrownFilled style={{ color: "#faad14", marginLeft: 6 }} />
                )}
              </Title>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: "block" }}
                ellipsis={{ tooltip: item.username }} // Tambahkan tooltip agar bisa dibaca full saat hover
              >
                @{item.username}
              </Text>
              {/* Email juga dikasih ellipsis biar rapi */}
              <Text
                type="secondary"
                style={{ fontSize: 11, display: "block", color: "#aaa" }}
                ellipsis={{ tooltip: item.email }}
              >
                {item.email || "-"}
              </Text>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 4,
                  flexWrap: "wrap",
                }}
              >
                <Tag
                  color={isCenter ? "gold" : "blue"}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {item.level.toUpperCase()}
                </Tag>
                <Tag
                  color={item.is_active ? "success" : "error"}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {item.is_active ? "AKTIF" : "NONAKTIF"}
                </Tag>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <Space vertical size={0}>
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: "orange" }} />}
                onClick={() => openModal(item)}
              />
            </Tooltip>
            <Popconfirm
              title="Hapus Admin?"
              onConfirm={() => handleDelete(item.id)}
              disabled={isCenter}
              okText="Ya"
              cancelText="Batal"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={isCenter}
                loading={isDeleting}
              />
            </Popconfirm>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <AppLayout title={"Manajemen Admin"}>
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
          placeholder="Cari nama atau username..."
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
          Tambah Admin
        </Button>
      </div>

      {/* List */}
      <InfiniteScrollList
        data={listData}
        loading={isFetching}
        hasMore={apiData?.hasMore}
        onLoadMore={handleLoadMore}
        renderItem={renderItem}
        height="75vh"
        emptyText="Belum ada data admin"
        grid={{
          gutter: [16, 16],
          xs: 24, // HP: 1 kolom
          sm: 12, // Tablet Kecil: 2 kolom
          md: 12, // Tablet: 2 kolom
          lg: 8, // Laptop Kecil: 3 kolom
          xl: 6, // Monitor: 4 kolom
          xxl: 6,
        }}
      />

      {/* Modal Form */}
      <ModalAdmin
        open={isModalOpen}
        initialData={editingItem}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </AppLayout>
  );
};

export default CenterAdmin;
