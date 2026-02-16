import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Input,
  Modal,
  Form,
  message,
  Typography,
  Space,
  Tooltip,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  SearchOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { InfiniteScrollList } from "../../../components"; // Pastikan path benar
import {
  useGetHomebaseQuery,
  useDeleteHomebaseMutation,
} from "../../../service/center/ApiHomebase";
import ModalHome from "./ModalHome";
import DetailHomebase from "./DetailHomebase";

const { Title, Text } = Typography;

const CenterHome = () => {
  // === State ===
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [listData, setListData] = useState([]);

  // State untuk Modal Dashboard Detail
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedHomebaseId, setSelectedHomebaseId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  // === RTK Query ===
  const {
    data: apiData,
    isFetching,
    refetch,
  } = useGetHomebaseQuery({
    page,
    limit: 10,
    search,
  });

  const [deleteHomebase, { isLoading: isDeleting }] =
    useDeleteHomebaseMutation();

  // === Effect: Handle Infinite Scroll Data Merging ===
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

  const handleDelete = async (id) => {
    try {
      await deleteHomebase(id).unwrap();
      message.success("Berhasil dihapus");
      setPage(1);
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus");
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      form.setFieldsValue(item);
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  // Handler saat Modal sukses menyimpan data
  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPage(1); // Reset list ke atas
    refetch(); // Ambil data terbaru
  };

  const openDetailDashboard = (id) => {
    setSelectedHomebaseId(id);
    setIsDetailOpen(true);
  };

  const closeDetailDashboard = () => {
    setSelectedHomebaseId(null);
    setIsDetailOpen(false);
  };

  // === Render Item ===
  const renderHomebaseItem = (item) => (
    <Card
      hoverable
      style={{ marginBottom: 16 }} // Beri sedikit jarak antar item
      title={
        <Title level={5} style={{ margin: 0, color: "#1890ff" }}>
          <HomeOutlined style={{ marginRight: 8 }} />
          {item.name}
        </Title>
      }
      // PERBAIKAN DI SINI: Array berisi 3 elemen terpisah
      actions={[
        <Tooltip title="Lihat Dashboard Detail" key="detail">
          <Button
            type="link" // Gunakan link agar terlihat menyatu
            icon={<InfoCircleOutlined />}
            onClick={() => openDetailDashboard(item.id)}
          >
            Detail
          </Button>
        </Tooltip>,

        <Tooltip title="Edit" key="edit">
          <Button
            type="text" // Gunakan text agar tidak ada border kotak
            icon={<EditOutlined style={{ color: "#faad14" }} />} // Warna warning utk edit
            onClick={() => openModal(item)}
          />
        </Tooltip>,

        <Popconfirm
          key="delete"
          title="Hapus Homebase ini?"
          description="Data yang terhubung (kelas, guru) mungkin akan error jika tidak ditangani."
          onConfirm={() => handleDelete(item.id)}
          okText="Ya, Hapus"
          cancelText="Batal"
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            loading={isDeleting}
          />
        </Popconfirm>,
      ]}
    >
      <div style={{ flex: 1 }}>
        <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
          {item.description || "- Tidak ada deskripsi -"}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: "#ccc",
            marginTop: 8,
            display: "block",
          }}
        >
          ID: {item.id} - Dibuat:{" "}
          {new Date(item.created_at).toLocaleDateString("id-ID")}
        </Text>
      </div>
    </Card>
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 10,
        }}
      >
        <Input
          placeholder="Cari homebase..."
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
          Tambah Baru
        </Button>
      </div>

      <InfiniteScrollList
        data={listData}
        loading={isFetching}
        hasMore={apiData?.hasMore}
        onLoadMore={handleLoadMore}
        renderItem={renderHomebaseItem}
        height="70vh"
        emptyText="Belum ada data satuan pendidikan"
      />

      <ModalHome
        open={isModalOpen}
        initialData={editingItem}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <DetailHomebase
        open={isDetailOpen}
        homebaseId={selectedHomebaseId}
        onCancel={closeDetailDashboard}
      />
    </>
  );
};

export default CenterHome;

