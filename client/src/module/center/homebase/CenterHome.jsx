import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, message, Popconfirm, Space, Tag, Tooltip, Typography, Grid } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { InfiniteScrollList } from '../../../components';
import { useLazyGetHomebaseQuery, useDeleteHomebaseMutation } from '../../../service/center/ApiHomebase';
import ModalHome from './ModalHome';
import DetailHomebase from './DetailHomebase';

const { Title, Text } = Typography;
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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [listData, setListData] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedHomebaseId, setSelectedHomebaseId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const [triggerGetHomebase, { isFetching }] = useLazyGetHomebaseQuery();
  const [deleteHomebase, { isLoading: isDeleting }] = useDeleteHomebaseMutation();

  useEffect(() => {
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
  }, [page, search, triggerGetHomebase]);

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
    setSelectedHomebaseId(id);
    setIsDetailOpen(true);
  };

  const closeDetailDashboard = () => {
    setSelectedHomebaseId(null);
    setIsDetailOpen(false);
  };

  const renderHomebaseItem = (item) => (
    <MotionDiv
      key={item.id}
      variants={itemVariants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      style={{ marginBottom: 18 }}>
      <Card
        variant="borderless"
        actions={[
          <Tooltip title="Lihat dashboard detail" key="detail">
            <Button
              type="link"
              icon={<InfoCircleOutlined />}
              onClick={() => openDetailDashboard(item.id)}
              style={{ fontWeight: 600 }}>
              Detail
            </Button>
          </Tooltip>,
          <Tooltip title="Edit homebase" key="edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openModal(item)}
              style={{ color: '#2563eb', fontWeight: 600 }}>
              Edit
            </Button>
          </Tooltip>,
          <Popconfirm
            key="delete"
            title="Hapus Homebase ini?"
            description="Data yang terhubung seperti kelas dan guru bisa terdampak."
            onConfirm={() => handleDelete(item.id)}
            okText="Ya, Hapus"
            cancelText="Batal">
            <Button type="link" danger icon={<DeleteOutlined />} loading={isDeleting} style={{ fontWeight: 600 }}>
              Hapus
            </Button>
          </Popconfirm>,
        ]}
        styles={{
          body: {
            padding: isMobile ? 18 : 22,
          },
          actions: {
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
          },
        }}
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))',
        }}>
        <Space align="start" size={16} style={{ width: '100%' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(59,130,246,0.18))',
              color: '#1d4ed8',
              fontSize: 22,
              flexShrink: 0,
            }}>
            <HomeOutlined />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Space vertical size={[10, 10]} style={{ marginBottom: 10, width: '100%' }}>
              <Title
                level={4}
                ellipsis={{ tooltip: item.name }}
                style={{
                  margin: 0,
                  color: '#0f172a',
                  fontSize: isMobile ? 18 : 20,
                  lineHeight: 1.25,
                }}>
                {item.name?.length > 16 ? `${item.name.slice(0, 16)}...` : item.name}
              </Title>
              <Tag
                color="blue"
                style={{
                  borderRadius: 999,
                  paddingInline: 12,
                  fontWeight: 600,
                  marginInlineEnd: 0,
                }}>
                {item.level || 'Jenjang belum diatur'}
              </Tag>
            </Space>

            {/* <Text
              type="secondary"
              style={{
                display: "block",
                fontSize: 13.5,
                lineHeight: 1.7,
                color: "#475569",
                marginBottom: 14,
              }}
            >
              {item.description || "Belum ada deskripsi untuk homebase ini."}
            </Text> */}

            <Space wrap size={[12, 10]}>
              <Tag
                style={{
                  borderRadius: 999,
                  paddingInline: 10,
                  marginInlineEnd: 0,
                  color: '#0f172a',
                  background: '#f8fafc',
                  borderColor: '#e2e8f0',
                }}>
                ID: {item.id}
              </Tag>
              <Tag
                icon={<CalendarOutlined />}
                style={{
                  borderRadius: 999,
                  paddingInline: 10,
                  marginInlineEnd: 0,
                  color: '#475569',
                  background: '#fff',
                  borderColor: '#e2e8f0',
                }}>
                Dibuat {formatDate(item.created_at)}
              </Tag>
            </Space>
          </div>
        </Space>
      </Card>
    </MotionDiv>
  );

  return (
    <>
      <MotionDiv variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gap: 18 }}>
        <MotionDiv variants={itemVariants}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 22,
              overflow: 'hidden',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              background:
                'radial-gradient(circle at top left, rgba(14,165,233,0.14), transparent 30%), linear-gradient(135deg, #0f172a, #1e3a8a 58%, #0f766e)',
              boxShadow: '0 22px 50px rgba(15, 23, 42, 0.18)',
            }}
            styles={{
              body: {
                padding: isMobile ? 18 : 20,
              },
            }}>
            <Space orientation="vertical" size={14} style={{ width: '100%' }}>
              <Tag
                style={{
                  width: 'fit-content',
                  margin: 0,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#e0f2fe',
                  paddingInline: 12,
                  fontWeight: 600,
                }}>
                Center Homebase
              </Tag>

              <div>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                    color: '#f8fafc',
                    fontSize: isMobile ? 24 : 28,
                    lineHeight: 1.2,
                  }}>
                  Kelola Satuan Pendidikan
                </Title>
                <Text
                  style={{
                    display: 'block',
                    marginTop: 8,
                    color: 'rgba(226, 232, 240, 0.9)',
                    fontSize: 13,
                    lineHeight: 1.7,
                    maxWidth: 680,
                  }}>
                  Cari satuan pendidikan, buka dashboard detail, dan kelola data satuan dari workspace yang tetap
                  ringkas dan nyaman dipakai.
                </Text>
              </div>

              <Space wrap size={[12, 12]} style={{ width: '100%', justifyContent: 'space-between' }}>
                <Input
                  placeholder="Cari homebase..."
                  prefix={<SearchOutlined style={{ color: '#64748b' }} />}
                  allowClear
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  style={{
                    maxWidth: isMobile ? '100%' : 320,
                    width: '100%',
                    height: 42,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.96)',
                  }}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openModal(null)}
                  size="large"
                  style={{
                    borderRadius: 999,
                    height: 42,
                    paddingInline: 20,
                    background: '#f8fafc',
                    color: '#0f172a',
                    borderColor: '#f8fafc',
                    fontWeight: 600,
                  }}>
                  Tambah Homebase
                </Button>
              </Space>
            </Space>
          </Card>
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
            grid={{ gutter: [16, 16], xs: 24, sm: 24, md: 12, lg: 8 }}
          />
        </MotionDiv>
      </MotionDiv>

      <ModalHome
        open={isModalOpen}
        initialData={editingItem}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <DetailHomebase open={isDetailOpen} homebaseId={selectedHomebaseId} onCancel={closeDetailDashboard} />
    </>
  );
};

export default CenterHome;
