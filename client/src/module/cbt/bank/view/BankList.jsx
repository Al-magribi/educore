import React, { Suspense, lazy, useState, useEffect } from "react";
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
  Spin,
  Layout,
  Grid,
  Statistic,
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
  LibraryBig,
  Layers3,
  Users,
} from "lucide-react";
import { InfiniteScrollList, LoadApp } from "../../../../components";
import { BankForm } from "../components";
import GroupBankForm from "../components/bank/Grouped/GroupBankForm";
import {
  useGetBanksQuery,
  useDeleteBankMutation,
} from "../../../../service/cbt/ApiBank";
import { useSearchParams } from "react-router-dom";

const QuestionsList = lazy(() => import("./QuestionsList"));

const { Text, Title } = Typography;
const { useToken } = theme;
const { Content } = Layout;
const { useBreakpoint } = Grid;

const BankList = () => {
  const { token } = useToken();
  const screens = useBreakpoint();

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [allData, setAllData] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const { data, isFetching } = useGetBanksQuery({
    page,
    search: searchText,
  });

  const [deleteBank] = useDeleteBankMutation();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllData(data.data);
      } else {
        setAllData((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const uniqueNewData = data.data.filter(
            (item) => !existingIds.has(item.id),
          );
          return [...prev, ...uniqueNewData];
        });
      }
    }
  }, [data, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSearch = (val) => {
    setSearchText(val);
    setPage(1);
    setAllData([]);
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
      setAllData((prev) => prev.filter((item) => item.id !== id));
    } catch {
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

  const totalBanks = data?.totalData || data?.total || allData.length || 0;
  const loadedBanks = allData.length;
  const groupedBanks = allData.filter((item) => item.type === "GB").length;
  const uniqueTeachers = new Set(
    allData.map((item) => item.teacher_name).filter(Boolean),
  ).size;
  const summaryCards = [
    {
      key: "banks",
      title: "Total Bank",
      value: totalBanks,
      icon: <LibraryBig size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
      color: "#1d4ed8",
    },
    {
      key: "loaded",
      title: "Data Dimuat",
      value: loadedBanks,
      icon: <Layers3 size={18} />,
      bg: "linear-gradient(135deg, #dcfce7, #ecfccb)",
      color: "#16a34a",
    },
    {
      key: "teachers",
      title: "Guru Terlibat",
      value: uniqueTeachers,
      icon: <Users size={18} />,
      bg: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
      color: "#7c3aed",
    },
    {
      key: "grouped",
      title: "Bank Gabungan",
      value: groupedBanks,
      icon: <Folder size={18} />,
      bg: "linear-gradient(135deg, #fef3c7, #ffedd5)",
      color: "#d97706",
    },
  ];

  const renderItem = (item) => {
    const typeColors = {
      UH: "blue",
      TS: "orange",
      AS: "red",
      UAS: "purple",
      GB: "green",
    };
    const color = typeColors[item.type] || "default";

    return (
      <Card
        hoverable
        size='small'
        style={{
          height: "100%",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
        }}
        styles={{
          body: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
          },
        }}
        title={
          <Flex justify='space-between' align='center'>
            <Tag color={color}>{item.type}</Tag>
            <Flex align='center' gap={4}>
              <Calendar size={12} color='#999' />
              <Text type='secondary' style={{ fontSize: 11 }}>
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
          <Tooltip title='Lihat Soal' key='view'>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <MessageCircleQuestionMark
                size={16}
                onClick={() =>
                  handleQuestionList(item.title.replaceAll(/ /g, "-"), item.id)
                }
              />
            </div>
          </Tooltip>,
          <Tooltip title='Edit' key='edit'>
            <div
              onClick={() => openForm(item)}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Edit size={16} />
            </div>
          </Tooltip>,
          <Tooltip title='Hapus' key='delete'>
            <Popconfirm
              title='Hapus Bank Soal?'
              onConfirm={() => handleDelete(item.id)}
              okText='Ya'
              cancelText='Batal'
              okButtonProps={{ danger: true }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Trash2 size={16} />
              </div>
            </Popconfirm>
          </Tooltip>,
        ]}
      >
        <Flex gap='middle' align='start' style={{ marginBottom: 12 }}>
          <div
            style={{
              background: token.colorPrimaryBg,
              padding: 10,
              borderRadius: 10,
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
            <Text type='secondary' style={{ fontSize: 12 }}>
              {item.subject_name || "Mapel Umum"}
            </Text>
          </div>
        </Flex>

        <Flex align='center' gap={8} style={{ marginTop: "auto" }}>
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
    <Suspense fallback={<LoadApp />}>
      {view === "questions" ? (
        <Suspense
          fallback={
            <Flex justify='center' align='center' style={{ minHeight: 300 }}>
              <Spin size='large' />
            </Flex>
          }
        >
          <QuestionsList />
        </Suspense>
      ) : (
        <Layout
          style={{
            minHeight: "100vh",
            background:
              "linear-gradient(180deg, #f4f7fb 0%, #eef3f9 32%, #f8fafc 100%)",
          }}
        >
          <Content style={{ padding: screens.md ? "24px" : "12px" }}>
            <Card
              bordered={false}
              style={{
                marginBottom: 20,
                borderRadius: 24,
                overflow: "hidden",
                background:
                  "linear-gradient(135deg, #0f172a 0%, #7c3aed 52%, #ec4899 100%)",
              }}
              styles={{ body: { padding: screens.md ? 28 : 20 } }}
            >
              <Flex
                justify='space-between'
                align={screens.md ? "center" : "start"}
                vertical={!screens.md}
                gap={20}
              >
                <div>
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                    CBT / Bank Soal
                  </Text>
                  <Title
                    level={2}
                    style={{ color: "#fff", margin: "8px 0 6px", fontSize: 34 }}
                  >
                    Direktori Bank Soal
                  </Title>
                  <Text
                    style={{ color: "rgba(255,255,255,0.82)", fontSize: 15 }}
                  >
                    Kelola bank soal, lihat pertanyaan, dan gabungkan bank dari
                    satu panel kerja.
                  </Text>
                </div>
              </Flex>
            </Card>

            <Flex gap={16} wrap='wrap' style={{ marginBottom: 20 }}>
              {summaryCards.map((item) => (
                <Card
                  key={item.key}
                  bordered={false}
                  style={{
                    flex: screens.xl
                      ? "1 1 0"
                      : screens.md
                        ? "1 1 calc(50% - 8px)"
                        : "1 1 100%",
                    minWidth: screens.md ? 0 : "100%",
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.88)",
                    boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
                  }}
                  styles={{ body: { padding: "18px 20px" } }}
                >
                  <Flex justify='space-between' align='start'>
                    <Statistic title={item.title} value={item.value} />
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 14,
                        background: item.bg,
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </div>
                  </Flex>
                </Card>
              ))}
            </Flex>

            <Card
              bordered={false}
              style={{
                marginBottom: 18,
                borderRadius: 22,
                background: "rgba(255,255,255,0.92)",
                boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
              }}
              styles={{ body: { padding: screens.md ? 20 : 16 } }}
            >
              <Flex
                align={screens.md ? "center" : "stretch"}
                justify='space-between'
                vertical={!screens.md}
                gap={16}
              >
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Filter dan Aksi
                  </Title>
                  <Text type='secondary'>
                    Cari bank soal, buat bank baru, atau gabungkan beberapa bank.
                  </Text>
                </div>

                <Flex
                  gap={10}
                  vertical={!screens.md}
                  style={{ width: !screens.md ? "100%" : "auto" }}
                >
                  <Input
                    prefix={<Search size={16} color='rgba(0,0,0,.25)' />}
                    style={{ width: !screens.md ? "100%" : 320 }}
                    placeholder='Cari judul, mapel, atau guru...'
                    allowClear
                    size='large'
                    onChange={(e) => {
                      setTimeout(() => handleSearch(e.target.value), 500);
                    }}
                  />

                  <Space direction={!screens.md ? "vertical" : "horizontal"}>
                    <Button
                      icon={<Plus size={18} />}
                      type='primary'
                      onClick={() => openForm(null)}
                      size='large'
                    >
                      Bank Soal
                    </Button>

                    <Button
                      icon={<Folder size={18} />}
                      onClick={() => setIsGroupModalOpen(true)}
                      size='large'
                    >
                      Gabung Bank Soal
                    </Button>
                  </Space>
                </Flex>
              </Flex>
            </Card>

            <InfiniteScrollList
              data={allData}
              loading={isFetching}
              hasMore={data?.hasMore || false}
              onLoadMore={handleLoadMore}
              renderItem={renderItem}
              emptyText='Belum ada bank soal tersedia'
              grid={{
                gutter: [16, 16],
                xs: 24,
                sm: 12,
                md: 8,
                lg: 8,
                xl: 6,
              }}
              height='calc(100vh - 360px)'
            />
          </Content>
        </Layout>
      )}

      <Modal
        title={
          <Flex align='center' gap={8}>
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
          <Flex align='center' gap={8}>
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
    </Suspense>
  );
};

export default BankList;
