import React, { Suspense, lazy, useState, useEffect } from "react";
import {
  Alert,
  Button,
  Flex,
  Grid,
  Modal,
  Skeleton,
  Spin,
  Tag,
  Tooltip,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  BookOpen,
  Folder,
  LibraryBig,
  Layers3,
  ListChecks,
  Pencil,
} from "lucide-react";
import { InfiniteScrollList, LoadApp } from "../../../../components";
import PageHeader from "../../../../components/ui/PageHeader";
import { CardTitle } from "../../../../components/ui/muse";
import {
  DataListCard,
  DataRow,
  EditDeleteActions,
} from "../../../../components/ui/muse/DataSection";
import { BankForm } from "../components";
import GroupBankForm from "../components/bank/Grouped/GroupBankForm";
import {
  useGetBanksQuery,
  useDeleteBankMutation,
} from "../../../../service/cbt/ApiBank";
import { useSearchParams } from "react-router-dom";

const QuestionsList = lazy(() => import("./QuestionsList"));

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const typeLabels = {
  UH: "Ulangan Harian",
  TS: "Tengah Semester",
  AS: "Akhir Semester",
  UAS: "Ujian Akhir Sekolah",
  GB: "Gabungan",
};

const typeColors = {
  UH: "blue",
  TS: "orange",
  AS: "red",
  UAS: "purple",
  GB: "green",
};

const BankList = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [allData, setAllData] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const { data, isFetching, isError, error } = useGetBanksQuery({
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalizedSearch = searchInput.trim();

      if (normalizedSearch === searchText) {
        return;
      }

      setSearchText(normalizedSearch);
      setPage(1);
      setAllData([]);
    }, 450);

    return () => clearTimeout(timeout);
  }, [searchInput, searchText]);

  const handleLoadMore = () => {
    if (data?.hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBank(id).unwrap();
      message.success("Bank soal berhasil dihapus");
      setPage(1);
      setAllData((prev) => prev.filter((item) => item.id !== id));
    } catch {
      message.error("Gagal menghapus bank soal");
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

    const totalBanks = data?.totalData || data?.total || allData.length || 0;
  const isInitialLoading = isFetching && allData.length === 0;

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const renderItem = (item) => {
    const isGrouped = item.type === "GB";
    const typeLabel = typeLabels[item.type] || item.type;
    const subtitle = [
      item.subject_name || "Mapel umum",
      item.teacher_name || "Belum ada guru",
      formatDate(item.created_at),
    ].join(" · ");

    return (
      <DataRow
        icon={isGrouped ? <Layers3 size={18} /> : <BookOpen size={18} />}
        tone={isGrouped ? "accentSoft" : "primarySoft"}
        title={item.title}
        subtitle={isMobile ? `${typeLabel} · ${subtitle}` : subtitle}
        tags={
          isMobile ? null : (
            <Tag color={typeColors[item.type] || "default"} style={{ margin: 0 }}>
              {typeLabel}
            </Tag>
          )
        }
        onClick={() => handleQuestionList(item.title.replaceAll(" ", "-"), item.id)}
        actions={
          <>
            <Tooltip title='Lihat daftar soal'>
              <Button
                type={isMobile ? "text" : "default"}
                aria-label={`Lihat soal ${item.title}`}
                icon={<ListChecks size={16} />}
                onClick={() => handleQuestionList(item.title.replaceAll(" ", "-"), item.id)}
              >
                {isMobile ? null : "Soal"}
              </Button>
            </Tooltip>
            <EditDeleteActions
              onEdit={() => openForm(item)}
              onDelete={() => handleDelete(item.id)}
              deleteTitle={`Hapus bank soal ${item.title}?`}
              deleteDescription='Semua soal di dalam bank ini ikut terhapus.'
            />
          </>
        }
      />
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
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
            <PageHeader
              title='Bank Soal'
              description='Kelola bank soal per guru, mata pelajaran, dan tipe ujian.'
              extra={
                <Button
                  icon={<Folder size={16} />}
                  onClick={() => setIsGroupModalOpen(true)}
                >
                  Gabung Bank
                </Button>
              }
            />

            {isError ? (
              <Alert
                type='error'
                showIcon
                title='Gagal memuat bank soal'
                description={
                  error?.data?.message || "Periksa koneksi lalu muat ulang halaman."
                }
              />
            ) : null}

            <DataListCard
              icon={<LibraryBig size={16} />}
              title='Daftar Bank Soal'
              count={totalBanks}
              unit='bank'
              searchProps={{
                placeholder: "Cari judul, mapel, atau guru",
                value: searchInput,
                onChange: (e) => setSearchInput(e.target.value),
              }}
              onAdd={() => openForm(null)}
              addLabel='Bank Soal'
            >
              {isInitialLoading ? (
                <div style={{ padding: 24 }}>
                  <Skeleton active avatar paragraph={{ rows: 1 }} />
                  <Skeleton active avatar paragraph={{ rows: 1 }} />
                  <Skeleton active avatar paragraph={{ rows: 1 }} />
                </div>
              ) : (
                <InfiniteScrollList
                  data={allData}
                  loading={isFetching}
                  hasMore={data?.hasMore || false}
                  onLoadMore={handleLoadMore}
                  renderItem={renderItem}
                  height='auto'
                  emptyText={
                    searchText
                      ? "Bank soal tidak ditemukan. Coba kata kunci lain."
                      : "Belum ada bank soal. Klik tombol Bank Soal untuk membuat yang pertama."
                  }
                  grid={{ gutter: [0, 0], xs: 24 }}
                />
              )}
            </DataListCard>
          </Flex>
        </MotionDiv>
      )}

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={isMobile ? "calc(100vw - 24px)" : 560}
        title={
          <CardTitle
            icon={editingItem ? <Pencil size={16} /> : <BookOpen size={16} />}
            title={editingItem ? "Edit Bank Soal" : "Buat Bank Soal"}
            description='Tentukan pemilik, mata pelajaran, judul, dan tipe ujian.'
          />
        }
      >
        <BankForm
          initialValues={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      <Modal
        title={
          <CardTitle
            icon={<Folder size={16} />}
            title='Gabung Bank Soal'
            description='Pilih soal dari beberapa bank untuk dijadikan satu bank gabungan.'
          />
        }
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={isMobile ? "calc(100vw - 24px)" : 900}
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
