import React, { useState, useEffect } from "react";
import {
  Button,
  Flex,
  Input,
  Modal,
  Card,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  theme,
  Avatar,
  Space,
} from "antd";
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  BookOpen,
  Calendar,
  MessageCircleQuestionMark,
  Folder,
} from "lucide-react";
import { AppLayout, InfiniteScrollList } from "../../../../components";
import { BankForm } from "../components";
import GroupBankForm from "../components/bank/Grouped/GroupBankForm";
import {
  useGetBanksQuery,
  useDeleteBankMutation,
} from "../../../../service/cbt/ApiBank";
import { Link, useSearchParams } from "react-router-dom";
import QuestionsList from "./QuestionsList";

const { Text, Title } = Typography;
const { useToken } = theme;

const BankList = () => {
  const { token } = useToken();

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");

  // -- State Management --
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [allData, setAllData] = useState([]);

  // -- Modal State --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // -- API Hooks --
  const { data, isFetching } = useGetBanksQuery({
    page,
    search: searchText,
  });

  const [deleteBank] = useDeleteBankMutation();

  // -- PERBAIKAN DI SINI: Mencegah Duplikasi Data --
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        // Jika halaman 1, langsung timpa data
        setAllData(data.data);
      } else {
        // Jika halaman > 1, gabungkan tapi cek ID agar tidak duplikat
        setAllData((prev) => {
          // Buat Set dari ID yang sudah ada
          const existingIds = new Set(prev.map((item) => item.id));
          // Filter data baru yang ID-nya belum ada
          const uniqueNewData = data.data.filter(
            (item) => !existingIds.has(item.id),
          );
          return [...prev, ...uniqueNewData];
        });
      }
    }
  }, [data, page]);

  // -- Handlers --
  const handleSearch = (val) => {
    setSearchText(val);
    setPage(1);
    setAllData([]); // Bersihkan data saat search
  };

  const handleLoadMore = () => {
    if (data?.hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBank(id).unwrap();
      message.success("Berhasil dihapus");
      setPage(1);
      // setAllData akan dihandle oleh useEffect saat data baru di-fetch (via invalidateTags)
      // Tapi untuk UI cepat, kita bisa kosongkan dulu atau filter manual
      setAllData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      message.error("Gagal menghapus");
    }
  };

  const openForm = (item = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPage(1);
    // Trigger refetch otomatis terjadi via tag invalidation
  };

  const handleQuestionList = (bankName, bankId) => {
    setSearchParams({
      view: "questions",
      bank_name: bankName,
      bank_id: bankId,
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const renderItem = (item) => {
    const typeColors = {
      UH: "blue",
      TS: "orange", // Fixed typo TS -> PTS sesuai backend
      AS: "red", // Fixed typo AS -> PAS sesuai backend
      UAS: "purple", // Fixed typo UAS -> US sesuai backend
      GB: "green",
    };
    const color = typeColors[item.type] || "default";

    return (
      <Card
        hoverable
        size="small"
        style={{
          height: "100%",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
        }}
        styles={{
          body: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
          },
        }}
        title={
          <Flex justify="space-between" align="center">
            <Tag color={color}>{item.type}</Tag>
            <Flex align="center" gap={4}>
              <Calendar size={12} color="#999" />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {new Date(item.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </Flex>
          </Flex>
        }
        actions={[
          // <Link
          //   key="view"
          //   to={`/cbt/bank-soal?bank_name=${item.title.replaceAll(/ /g, "-")}&bank_id=${item.id}`}
          // >
          <Tooltip title="Lihat Soal">
            {/* Gunakan div wrapper agar event click tidak bentrok dengan card hover */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <MessageCircleQuestionMark
                size={16}
                onClick={() =>
                  handleQuestionList(item.title.replaceAll(/ /g, "-"), item.id)
                }
              />
            </div>
          </Tooltip>,
          // </Link>,

          <Tooltip title="Edit" key="edit">
            <div
              onClick={() => openForm(item)}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Edit size={16} />
            </div>
          </Tooltip>,

          <Tooltip title="Hapus" key="delete">
            <Popconfirm
              title="Hapus Bank Soal?"
              onConfirm={() => handleDelete(item.id)}
              okText="Ya"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Trash2 size={16} />
              </div>
            </Popconfirm>
          </Tooltip>,
        ]}
      >
        <Flex gap={"middle"} align="start" style={{ marginBottom: 12 }}>
          <div
            style={{
              background: token.colorPrimaryBg,
              padding: 10,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={20} color={token.colorPrimary} />
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Tooltip title={item.title}>
              <Title
                level={5}
                ellipsis={{ rows: 2 }}
                style={{ margin: "0 0 4px 0", fontSize: 15, lineHeight: 1.3 }}
              >
                {item.title}
              </Title>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.subject_name || "Mapel Umum"}
            </Text>
          </div>
        </Flex>

        <Flex align="center" gap={8} style={{ marginTop: "auto" }}>
          <Avatar
            size={22}
            style={{
              backgroundColor: "#f0f0f0",
              color: "#666",
              fontSize: 10,
            }}
          >
            {getInitials(item.teacher_name)}
          </Avatar>
          <Text ellipsis style={{ fontSize: 12, color: "#666" }}>
            {item.teacher_name}
          </Text>
        </Flex>
      </Card>
    );
  };

  return (
    <AppLayout title="Manajemen Bank Soal">
      {view === "questions" ? (
        <QuestionsList />
      ) : (
        <>
          <Flex
            align="center"
            justify="space-between"
            wrap="wrap"
            gap={16}
            style={{ marginBottom: 24 }}
          >
            <Input
              prefix={<Search size={16} color="#999" />}
              style={{ width: 320, borderRadius: 8 }}
              placeholder="Cari judul, mapel, atau guru..."
              allowClear
              onChange={(e) => {
                setTimeout(() => handleSearch(e.target.value), 500);
              }}
            />

            <Space>
              <Button
                icon={<Plus size={18} />}
                type="primary"
                onClick={() => openForm(null)}
                style={{ borderRadius: 8 }}
              >
                Bank Soal
              </Button>

              <Button
                icon={<Folder size={18} />}
                onClick={() => setIsGroupModalOpen(true)}
              >
                Gabung Bank Soal
              </Button>
            </Space>
          </Flex>
          <InfiniteScrollList
            data={allData}
            loading={isFetching}
            hasMore={data?.hasMore || false}
            onLoadMore={handleLoadMore}
            renderItem={renderItem}
            emptyText="Belum ada bank soal tersedia"
            grid={{
              gutter: [16, 16],
              xs: 24,
              sm: 12,
              md: 8,
              lg: 8,
              xl: 6,
              xxl: 4,
            }}
            height="calc(100vh - 300px)"
          />
        </>
      )}

      <Modal
        title={
          <Flex align="center" gap={8}>
            <div
              style={{
                background: token.colorPrimaryBg,
                padding: 6,
                borderRadius: 6,
                display: "flex",
              }}
            >
              <FileText size={18} color={token.colorPrimary} />
            </div>
            <Text strong style={{ fontSize: 16 }}>
              {editingItem ? "Edit Bank Soal" : "Buat Bank Soal Baru"}
            </Text>
          </Flex>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={500}
      >
        <BankForm
          initialValues={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      <Modal
        title={
          <Flex align="center" gap={8}>
            <div
              style={{
                background: token.colorPrimaryBg,
                padding: 6,
                borderRadius: 6,
                display: "flex",
              }}
            >
              <Folder size={18} color={token.colorPrimary} />
            </div>
            <Text strong style={{ fontSize: 16 }}>
              Gabung Bank Soal
            </Text>
          </Flex>
        }
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={900}
      >
        <GroupBankForm
          onClose={() => setIsGroupModalOpen(false)}
          onSuccess={() => {
            setIsGroupModalOpen(false);
            setPage(1);
          }}
        />
      </Modal>
    </AppLayout>
  );
};

export default BankList;
