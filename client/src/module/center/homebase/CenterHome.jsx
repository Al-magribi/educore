import React, { useEffect, useState } from 'react';
import { Button, Flex, Form, Input, message, Popconfirm, Tag, Tooltip, Typography, Grid } from 'antd';
import { CalendarDays, Eye, Pencil, Plus, School, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { InfiniteScrollList } from '../../../components';
import PageHeader from '../../../components/ui/PageHeader';
import { IconBox, MuseCard } from '../../../components/ui/muse';
import { museColors } from '../../../config/theme';
import { useLazyGetHomebaseQuery, useDeleteHomebaseMutation } from '../../../service/center/ApiHomebase';
import ModalHome from './ModalHome';
import DetailHomebase from './DetailHomebase';

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const DETAIL_TABS = new Set(['ringkasan', 'guru', 'kelas']);

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut',
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

const formatDate = (date) => {
  if (!date) {
    return '-';
  }

  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const CenterHome = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();

  const homebaseIdParam = searchParams.get('homebase_id');
  const tabParam = searchParams.get('tab');
  const parsedHomebaseId = Number(homebaseIdParam);
  const selectedHomebaseId =
    Number.isFinite(parsedHomebaseId) && parsedHomebaseId > 0 ? parsedHomebaseId : null;
  const activeTab = DETAIL_TABS.has(tabParam) ? tabParam : 'ringkasan';
  const isDetailView = Boolean(selectedHomebaseId);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [listData, setListData] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const [triggerGetHomebase, { isFetching }] = useLazyGetHomebaseQuery();
  const [deleteHomebase, { isLoading: isDeleting }] = useDeleteHomebaseMutation();

  useEffect(() => {
    if (isDetailView) {
      return undefined;
    }

    let isActive = true;

    const fetchHomebase = async () => {
      try {
        const result = await triggerGetHomebase({
          page,
          limit: 10,
          search,
        }).unwrap();

        if (!isActive) {
          return;
        }

        setHasMore(Boolean(result?.hasMore));
        setListData((prev) => {
          if (page === 1) {
            return result?.data || [];
          }

          const existingIds = new Set(prev.map((item) => item.id));
          const nextItems = (result?.data || []).filter((item) => !existingIds.has(item.id));
          return [...prev, ...nextItems];
        });
      } catch {
        if (isActive && page === 1) {
          setListData([]);
          setHasMore(false);
        }
      }
    };

    fetchHomebase();

    return () => {
      isActive = false;
    };
  }, [page, search, triggerGetHomebase, isDetailView]);

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const refreshFirstPage = async () => {
    try {
      const result = await triggerGetHomebase({ page: 1, limit: 10, search }, true).unwrap();

      setHasMore(Boolean(result?.hasMore));
      setListData(result?.data || []);
    } catch {
      setHasMore(false);
      setListData([]);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHomebase(id).unwrap();
      message.success('Berhasil dihapus');
      setPage(1);
      await refreshFirstPage();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus');
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

  const handleModalSuccess = async () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPage(1);
    await refreshFirstPage();
  };

  const openDetailDashboard = (id) => {
    setSearchParams({
      homebase_id: String(id),
      tab: 'ringkasan',
    });
  };

  const closeDetailDashboard = () => {
    setSearchParams({});
  };

  const handleDetailTabChange = (nextTab) => {
    if (!selectedHomebaseId) {
      return;
    }

    setSearchParams({
      homebase_id: String(selectedHomebaseId),
      tab: DETAIL_TABS.has(nextTab) ? nextTab : 'ringkasan',
    });
  };

  const renderHomebaseItem = (item) => (
    <MotionDiv
      key={item.id}
      variants={itemVariants}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      style={{ marginBottom: 24 }}>
      <MuseCard
        actions={[
          <Tooltip title="Lihat dashboard detail" key="detail">
            <Button type="link" icon={<Eye size={16} />} onClick={() => openDetailDashboard(item.id)}>
              Detail
            </Button>
          </Tooltip>,
          <Tooltip title="Edit satuan" key="edit">
            <Button type="text" icon={<Pencil size={16} />} onClick={() => openModal(item)}>
              Edit
            </Button>
          </Tooltip>,
          <Popconfirm
            key="delete"
            title={`Hapus ${item.name}?`}
            description="Data yang terhubung seperti kelas dan guru bisa terdampak."
            onConfirm={() => handleDelete(item.id)}
            okText="Ya, Hapus"
            okButtonProps={{ danger: true }}
            cancelText="Batal">
            <Button type="text" danger icon={<Trash2 size={16} />} loading={isDeleting}>
              Hapus
            </Button>
          </Popconfirm>,
        ]}
        styles={{
          body: { padding: isMobile ? 16 : 24 },
          actions: { borderTop: `1px solid ${museColors.divider}` },
        }}>
        <Flex align="start" gap={16}>
          <IconBox icon={<School size={24} />} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              strong
              ellipsis={{ tooltip: item.name }}
              style={{ display: 'block', fontSize: 16, fontWeight: 700, color: museColors.text }}>
              {item.name}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontWeight: 600, marginBottom: 12 }}>
              {item.level || 'Jenjang belum diatur'}
            </Text>
            <Flex wrap gap={8}>
              <Tag style={{ margin: 0 }}>ID {item.id}</Tag>
              <Tag style={{ margin: 0 }} icon={<CalendarDays size={12} style={{ marginRight: 4 }} />}>
                Dibuat {formatDate(item.created_at)}
              </Tag>
            </Flex>
          </div>
        </Flex>
      </MuseCard>
    </MotionDiv>
  );

  if (isDetailView) {
    return (
      <DetailHomebase
        homebaseId={selectedHomebaseId}
        activeTab={activeTab}
        onTabChange={handleDetailTabChange}
        onBack={closeDetailDashboard}
      />
    );
  }

  return (
    <>
      <MotionDiv variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gap: 24 }}>
        <MotionDiv variants={itemVariants}>
          <PageHeader
            title="Kelola Satuan Pendidikan"
            description="Cari satuan pendidikan, buka dashboard detail, dan kelola datanya."
            extra={
              <>
                <Input
                  aria-label="Cari satuan pendidikan"
                  placeholder="Cari satuan..."
                  prefix={<Search size={16} color={museColors.muted} />}
                  allowClear
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  style={{ width: isMobile ? '100%' : 280 }}
                />
                <Button
                  type="primary"
                  icon={<Plus size={16} />}
                  onClick={() => openModal(null)}
                  block={isMobile}>
                  Tambah Satuan
                </Button>
              </>
            }
          />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <InfiniteScrollList
            data={listData}
            loading={isFetching}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            renderItem={renderHomebaseItem}
            height="68vh"
            emptyText="Belum ada data satuan pendidikan"
            grid={{ gutter: [24, 0], xs: 24, sm: 24, md: 12, lg: 8 }}
          />
        </MotionDiv>
      </MotionDiv>

      <ModalHome
        open={isModalOpen}
        initialData={editingItem}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};

export default CenterHome;
