import React, { useEffect, useState } from 'react';
import { Avatar, Button, Flex, Grid, Input, Popconfirm, Tag, Tooltip, Typography, message } from 'antd';
import { Crown, Mail, Pencil, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { InfiniteScrollList } from '../../../components';
import PageHeader from '../../../components/ui/PageHeader';
import { MuseCard } from '../../../components/ui/muse';
import { museColors, museRadius } from '../../../config/theme';
import { useDeleteAdminMutation, useLazyGetAdminsQuery } from '../../../service/center/ApiAdmin';
import ModalAdmin from './ModalAdmin';

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

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

const getLevelLabel = (level) => {
  const labels = {
    center: 'Center',
    pusat: 'Pusat',
    satuan: 'Satuan',
    tahfiz: 'Tahfiz',
    keuangan: 'Keuangan',
    admin: 'Admin',
  };

  return labels[level] || level || '-';
};

const CenterAdmin = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [listData, setListData] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [triggerGetAdmins, { isFetching }] = useLazyGetAdminsQuery();
  const [deleteAdmin, { isLoading: isDeleting }] = useDeleteAdminMutation();

  useEffect(() => {
    let isActive = true;

    const fetchAdmins = async () => {
      try {
        const result = await triggerGetAdmins({
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

    fetchAdmins();

    return () => {
      isActive = false;
    };
  }, [page, search, triggerGetAdmins]);

  const refreshFirstPage = async () => {
    try {
      const result = await triggerGetAdmins({ page: 1, limit: 10, search }, true).unwrap();

      setHasMore(Boolean(result?.hasMore));
      setListData(result?.data || []);
    } catch {
      setHasMore(false);
      setListData([]);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
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
      message.success('Admin berhasil dihapus');
      setPage(1);
      await refreshFirstPage();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus admin');
    }
  };

  const handleSuccess = async () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPage(1);
    await refreshFirstPage();
  };

  const renderItem = (item) => {
    const isCenter = item.level === 'center';
    const isActive = Boolean(item.is_active);

    return (
      <MotionDiv key={item.id} variants={itemVariants} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
        <MuseCard
          style={{ height: '100%' }}
          actions={[
            <Tooltip title="Edit admin" key="edit">
              <Button type="text" icon={<Pencil size={16} />} onClick={() => openModal(item)}>
                Edit
              </Button>
            </Tooltip>,
            <Popconfirm
              key="delete"
              title={`Hapus ${item.full_name}?`}
              description="Akun ini tidak bisa login lagi setelah dihapus."
              onConfirm={() => handleDelete(item.id)}
              disabled={isCenter}
              okText="Ya, Hapus"
              okButtonProps={{ danger: true }}
              cancelText="Batal">
              <Tooltip title={isCenter ? 'Admin center tidak bisa dihapus' : undefined}>
                <Button
                  type="text"
                  danger
                  icon={<Trash2 size={16} />}
                  disabled={isCenter}
                  loading={isDeleting}>
                  Hapus
                </Button>
              </Tooltip>
            </Popconfirm>,
          ]}
          styles={{
            body: { padding: isMobile ? 16 : 24 },
            actions: { borderTop: `1px solid ${museColors.divider}` },
          }}>
          <Flex align="start" gap={16}>
            <Avatar
              size={48}
              shape="square"
              icon={<UserRound size={24} />}
              style={{
                borderRadius: museRadius.item,
                background: isCenter ? museColors.navy : museColors.primary,
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                <Text
                  strong
                  ellipsis={{ tooltip: item.full_name }}
                  style={{ fontSize: 16, fontWeight: 700, color: museColors.text }}>
                  {item.full_name}
                </Text>
                {isCenter ? <Crown size={16} color={museColors.accent} aria-label="Admin center" /> : null}
              </Flex>
              <Text
                type="secondary"
                style={{ display: 'block', fontWeight: 600 }}
                ellipsis={{ tooltip: item.username }}>
                @{item.username}
              </Text>

              <Flex wrap gap={8} style={{ margin: '12px 0' }}>
                <Tag color={isCenter ? 'gold' : 'blue'} style={{ margin: 0 }}>
                  {getLevelLabel(item.level)}
                </Tag>
                <Tag color={isActive ? 'success' : 'error'} style={{ margin: 0 }}>
                  {isActive ? 'Aktif' : 'Nonaktif'}
                </Tag>
              </Flex>

              <Flex vertical gap={6}>
                <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                  <Mail size={14} color={museColors.muted} />
                  <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: item.email || '-' }}>
                    {item.email || '-'}
                  </Text>
                </Flex>
                <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                  <Phone size={14} color={museColors.muted} />
                  <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: item.phone || '-' }}>
                    {item.phone || '-'}
                  </Text>
                </Flex>
              </Flex>
            </div>
          </Flex>
        </MuseCard>
      </MotionDiv>
    );
  };

  return (
    <>
      <MotionDiv variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gap: 24 }}>
        <MotionDiv variants={itemVariants}>
          <PageHeader
            title="Kelola Akun Admin"
            description="Cari akun, perbarui akses, dan tambah admin baru."
            extra={
              <>
                <Input
                  aria-label="Cari admin"
                  placeholder="Cari nama atau username..."
                  prefix={<Search size={16} color={museColors.muted} />}
                  allowClear
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  style={{ width: isMobile ? '100%' : 280 }}
                />
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal(null)} block={isMobile}>
                  Tambah Admin
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
            renderItem={renderItem}
            height="75vh"
            emptyText="Belum ada data admin"
            grid={{
              gutter: [24, 24],
              xs: 24,
              sm: 12,
              md: 12,
              lg: 8,
            }}
          />
        </MotionDiv>
      </MotionDiv>

      <ModalAdmin
        open={isModalOpen}
        initialData={editingItem}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default CenterAdmin;
