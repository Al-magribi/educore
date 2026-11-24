import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Divider,
  Empty,
  Flex,
  Grid,
  Input,
  List,
  Pagination,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  useDeleteTeacherMutation,
  useLazyGetTeachersQuery,
} from "../../../service/main/ApiTeacher";
import useDebounced from "../../../utils/useDebounced.jsx";
import ModalTeacher from "./ModalTeacher";
import PageHeader from "../../../components/ui/PageHeader";
import { CardTitle, MuseCard } from "../../../components/ui/muse";
import { museColors, museRadius } from "../../../config/theme";

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
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const TeacherList = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [listData, setListData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const debounced = useDebounced(search, 500);
  const [triggerGetTeachers, { isFetching }] = useLazyGetTeachersQuery();
  const [deleteTeacher, { isLoading: isDeleting }] = useDeleteTeacherMutation();

  useEffect(() => {
    let isActive = true;

    const fetchTeachers = async () => {
      try {
        const result = await triggerGetTeachers({
          page,
          limit: pageSize,
          search: debounced,
        }).unwrap();

        if (!isActive) {
          return;
        }

        setListData(result?.data || []);
        setTotalItems(result?.totalItems || 0);
      } catch {
        if (isActive) {
          setListData([]);
          setTotalItems(0);
        }
      }
    };

    fetchTeachers();

    return () => {
      isActive = false;
    };
  }, [page, pageSize, debounced, triggerGetTeachers]);

  const refreshCurrentPage = async ({
    nextPage = page,
    nextPageSize = pageSize,
  } = {}) => {
    try {
      const result = await triggerGetTeachers(
        {
          page: nextPage,
          limit: nextPageSize,
          search: debounced,
        },
        true,
      ).unwrap();

      setListData(result?.data || []);
      setTotalItems(result?.totalItems || 0);
      setPage(nextPage);
      setPageSize(nextPageSize);
    } catch {
      setListData([]);
      setTotalItems(0);
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

      const nextTotal = Math.max(totalItems - 1, 0);
      const lastPage = Math.max(1, Math.ceil(nextTotal / pageSize));
      const nextPage = Math.min(page, lastPage);

      await refreshCurrentPage({ nextPage });
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus data");
    }
  };

  const handleSuccess = async () => {
    setIsModalOpen(false);
    setEditingItem(null);
    await refreshCurrentPage();
  };

  const handleTableChange = (pager) => {
    setPage(pager.current || 1);
    setPageSize(pager.pageSize || pageSize);
  };

  const handleMobilePagination = (nextPage, nextPageSize) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  const columns = [
    {
      title: "NAMA GURU",
      key: "guru",
      dataIndex: "full_name",
      fixed: "left",
      width: 280,
      render: (_, item) => (
        <Flex align='center' gap={12}>
          <Avatar
            size={44}
            src={item.img_url}
            icon={<UserOutlined />}
            style={{ background: museColors.primary, flexShrink: 0 }}
          />
          <Flex vertical style={{ minWidth: 0 }}>
            <Text strong ellipsis={{ tooltip: item.full_name }}>
              {item.full_name}
            </Text>
            <Text
              type='secondary'
              style={{ fontSize: 12 }}
              ellipsis={{ tooltip: item.username }}
            >
              @{item.username}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: "SATUAN",
      key: "homebase",
      width: 220,
      render: (_, item) => (
        <Space direction='vertical' size={4}>
          <Tag
            color='cyan'
            icon={<BookOutlined />}
            style={{ margin: 0 }}
          >
            {item.homebase_name || "Belum ada satuan"}
          </Tag>
          <Text type='secondary' style={{ fontSize: 12 }}>
            NIP: {item.nip || "Non-NIP"}
          </Text>
        </Space>
      ),
    },
    {
      title: "KONTAK",
      key: "contact",
      width: 240,
      render: (_, item) => (
        <Flex vertical gap={6}>
          <Space size={8} style={{ color: museColors.muted }}>
            <PhoneOutlined />
            <Text
              type='secondary'
              style={{ fontSize: 12 }}
              ellipsis={{ tooltip: item.phone || "-" }}
            >
              {item.phone || "-"}
            </Text>
          </Space>
          <Space size={8} style={{ color: museColors.muted }}>
            <MailOutlined />
            <Text
              type='secondary'
              style={{ fontSize: 12 }}
              ellipsis={{ tooltip: item.email || "-" }}
            >
              {item.email || "-"}
            </Text>
          </Space>
        </Flex>
      ),
    },
    {
      title: "STATUS",
      key: "status",
      dataIndex: "is_active",
      width: 120,
      render: (isActive) => (
        <Tag
          color={isActive ? "success" : "error"}
          style={{ margin: 0 }}
        >
          {isActive ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "AKSI",
      key: "action",
      align: "right",
      width: 110,
      fixed: "right",
      render: (_, item) => (
        <Space>
          <Tooltip title='Edit'>
            <Button
              type='text'
              icon={<EditOutlined />}
              onClick={() => openModal(item)}
            />
          </Tooltip>
          <Popconfirm
            title='Hapus Guru?'
            description='Aksi ini tidak dapat dibatalkan.'
            onConfirm={() => handleDelete(item.id)}
            okText='Ya, Hapus'
            cancelText='Batal'
            placement='topRight'
          >
            <Tooltip title='Hapus'>
              <Button
                type='text'
                danger
                icon={<DeleteOutlined />}
                loading={isDeleting}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <MotionDiv
        variants={containerVariants}
        initial='hidden'
        animate='show'
        style={{
          display: "grid",
          gap: 24,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <MotionDiv variants={itemVariants}>
          <PageHeader
            title='Kelola Data Guru'
            description='Cari guru, perbarui penempatan, dan tambah data guru baru.'
            extra={
              <>
                <Input
                  aria-label='Cari guru'
                  value={search}
                  placeholder='Cari nama, username, atau NIP...'
                  prefix={<SearchOutlined style={{ color: museColors.muted }} />}
                  allowClear
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  style={{ width: isMobile ? "100%" : 300 }}
                />
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={() => openModal(null)}
                  block={isMobile}
                >
                  Tambah Guru
                </Button>
              </>
            }
          />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <MuseCard
            flush={!isMobile}
            title={
              <CardTitle
                title='Daftar Guru'
                description={`${totalItems} guru terdaftar`}
              />
            }
          >
            {isMobile ? (
              <>
                <List
                  dataSource={listData}
                  loading={isFetching}
                  locale={{
                    emptyText: <Empty description='Data guru belum tersedia' />,
                  }}
                  renderItem={(item) => (
                    <List.Item style={{ padding: 0, marginBottom: 10 }}>
                      <MotionDiv
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.18 }}
                        style={{ width: "100%" }}
                      >
                        <div
                          style={{
                            width: "100%",
                            padding: 16,
                            borderRadius: museRadius.card,
                            border: `1px solid ${museColors.divider}`,
                          }}
                        >
                          <Flex justify='space-between' align='start' gap={10}>
                            <Space align='start'>
                              <Avatar
                                src={item.img_url}
                                icon={<UserOutlined />}
                              />
                              <Flex vertical style={{ minWidth: 0 }}>
                                <Text strong>{item.full_name}</Text>
                                <Text type='secondary' style={{ fontSize: 12 }}>
                                  @{item.username}
                                </Text>
                              </Flex>
                            </Space>
                            <Space>
                              <Tooltip title='Edit'>
                                <Button
                                  size='small'
                                  type='text'
                                  icon={<EditOutlined />}
                                  onClick={() => openModal(item)}
                                />
                              </Tooltip>
                              <Popconfirm
                                title='Hapus Guru?'
                                description='Aksi ini tidak dapat dibatalkan.'
                                onConfirm={() => handleDelete(item.id)}
                                okText='Ya'
                                cancelText='Batal'
                              >
                                <Tooltip title='Hapus'>
                                  <Button
                                    size='small'
                                    type='text'
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={isDeleting}
                                  />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          </Flex>

                          <Divider style={{ margin: "10px 0" }} />

                          <Flex vertical gap={8}>
                            <Tag
                              color='cyan'
                              icon={<BookOutlined />}
                              style={{
                                margin: 0,
                                width: "fit-content",
                              }}
                            >
                              {item.homebase_name || "Belum ada satuan"}
                            </Tag>
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              NIP: {item.nip || "Non-NIP"}
                            </Text>
                            <Text>{item.phone || "-"}</Text>
                            <Text type='secondary'>{item.email || "-"}</Text>
                            <Tag
                              color={item.is_active ? "success" : "error"}
                              style={{
                                margin: 0,
                                width: "fit-content",
                              }}
                            >
                              {item.is_active ? "Aktif" : "Nonaktif"}
                            </Tag>
                          </Flex>
                        </div>
                      </MotionDiv>
                    </List.Item>
                  )}
                />

                <Flex justify='center' style={{ marginTop: 12 }}>
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={totalItems}
                    onChange={handleMobilePagination}
                    showSizeChanger
                    pageSizeOptions={["10", "20", "50"]}
                    responsive
                    showTotal={(value) => `${value} guru`}
                  />
                </Flex>
              </>
            ) : (
              <Table
                columns={columns}
                dataSource={listData}
                loading={isFetching}
                pagination={{
                  current: page,
                  pageSize,
                  total: totalItems,
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "50"],
                  showTotal: (items, range) =>
                    `${range[0]}-${range[1]} dari ${items} guru`,
                }}
                onChange={handleTableChange}
                rowKey='id'
                size='middle'
              />
            )}
          </MuseCard>
        </MotionDiv>
      </MotionDiv>

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
