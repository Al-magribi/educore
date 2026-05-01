import React, { useMemo } from "react";
import { calcGeneratorDuration, motion } from "framer-motion";
import {
  Table,
  Button,
  Popconfirm,
  Tooltip,
  Avatar,
  Typography,
  Tag,
  Flex,
  Space,
  Grid,
  Popover,
  Divider,
  Card,
  List,
  Pagination,
  Empty,
  Statistic,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  ReadOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const TeachingAllocations = ({ allocations, compact = false }) => {
  const groupedData = useMemo(() => {
    if (!allocations || allocations.length === 0) return [];
    const map = {};
    allocations.forEach((item) => {
      const subjectName = item.subject_name || "Lainnya";
      if (!map[subjectName]) {
        map[subjectName] = [];
      }
      map[subjectName].push(item.class_name || "Semua Kelas");
    });
    return Object.entries(map);
  }, [allocations]);

  if (groupedData.length === 0) {
    return <Text type='secondary'>-</Text>;
  }

  const content = (
    <Flex vertical gap='small' style={{ maxWidth: 250 }}>
      {groupedData.map(([subject, classes]) => (
        <div key={subject}>
          <Text strong>{subject}</Text>
          <br />
          <Text type='secondary'>Mengajar di: {classes.join(", ")}</Text>
        </div>
      ))}
    </Flex>
  );

  return (
    <Popover content={content} title='Detail Mengajar' trigger='hover'>
      <Flex vertical gap='small'>
        {groupedData.slice(0, compact ? 1 : 2).map(([subject, classes]) => (
          <Text key={subject} ellipsis>
            <ReadOutlined style={{ marginRight: 8, color: "#1677ff" }} />
            {subject} ({classes.length} kelas)
          </Text>
        ))}
        {groupedData.length > (compact ? 1 : 2) && (
          <Text type='secondary'>
            +{groupedData.length - (compact ? 1 : 2)} mapel lainnya...
          </Text>
        )}
      </Flex>
    </Popover>
  );
};

const TeacherList = ({
  data,
  loading,
  onEdit,
  onDelete,
  onPageChange,
  pagination,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const current = pagination?.current || 1;
  const pageSize = pagination?.pageSize || 10;
  const total = pagination?.total || 0;

  const handleDesktopChange = (pager) => {
    onPageChange({
      current: pager.current || 1,
      pageSize: pager.pageSize || pageSize,
    });
  };

  const handleMobilePagination = (page, size) => {
    onPageChange({ current: page, pageSize: size });
  };

  const columns = [
    {
      title: "Nama Guru",
      dataIndex: "full_name",
      key: "full_name",
      width: 250,
      fixed: "left",
      render: (text, record) => (
        <Flex align='center' gap={12}>
          <Avatar src={record.img_url} icon={<UserOutlined />} size={42} />
          <Flex vertical>
            <Text strong>{text}</Text>
            <Text type='secondary' style={{ fontSize: 11 }}>
              NIP: {record.nip || "-"} | RFID : {record.rfid_no || "-"}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 150,
      render: (_, record) => (
        <>
          {record.is_homeroom && (
            <Tag icon={<TeamOutlined />} color='success'>
              Wali Kelas
            </Tag>
          )}
        </>
      ),
    },
    {
      title: "Mengajar",
      dataIndex: "allocations",
      key: "allocations",
      width: 250,
      render: (allocations) => (
        <TeachingAllocations allocations={allocations} />
      ),
    },
    {
      title: "Kontak",
      key: "contact",
      width: 200,
      render: (_, record) => (
        <Flex vertical>
          <Text>{record.phone || "-"}</Text>
          <Text type='secondary' ellipsis>
            {record.email || "-"}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      align: "right",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Tooltip title='Edit'>
            <Button
              type='text'
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title='Hapus Guru?'
            description='Aksi ini tidak dapat dibatalkan.'
            onConfirm={() => onDelete(record.id)}
            okText='Ya, Hapus'
            cancelText='Batal'
          >
            <Tooltip title='Hapus'>
              <Button type='text' danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      variant='borderless'
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
      style={{
        borderRadius: 22,
        boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
      }}
    >
      {isMobile ? (
        <>
          <List
            dataSource={data || []}
            loading={loading}
            locale={{
              emptyText: <Empty description='Data guru belum tersedia' />,
            }}
            renderItem={(record) => (
              <List.Item style={{ padding: 0, marginBottom: 10 }}>
                <MotionDiv
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.18 }}
                  style={{ width: "100%" }}
                >
                  <Card
                    size='small'
                    style={{ width: "100%", borderRadius: 18 }}
                  >
                    <Flex justify='space-between' align='start' gap={10}>
                      <Space align='start'>
                        <Avatar src={record.img_url} icon={<UserOutlined />} />
                        <Flex vertical>
                          <Text strong>{record.full_name}</Text>
                          <Text type='secondary'>NIP: {record.nip || "-"}</Text>
                        </Flex>
                      </Space>
                      <Space>
                        <Tooltip title='Edit'>
                          <Button
                            size='small'
                            type='text'
                            icon={<EditOutlined />}
                            onClick={() => onEdit(record)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title='Hapus Guru?'
                          description='Aksi ini tidak dapat dibatalkan.'
                          onConfirm={() => onDelete(record.id)}
                          okText='Ya'
                          cancelText='Batal'
                        >
                          <Tooltip title='Hapus'>
                            <Button
                              size='small'
                              type='text'
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </Flex>
                    <Divider style={{ margin: "10px 0" }} />
                    <Flex vertical gap={8}>
                      {record.is_homeroom && (
                        <Tag icon={<TeamOutlined />} color='success'>
                          Wali Kelas
                        </Tag>
                      )}
                      <Text>{record.phone || "-"}</Text>
                      <Text type='secondary'>{record.email || "-"}</Text>
                      <TeachingAllocations
                        allocations={record.allocations}
                        compact
                      />
                    </Flex>
                  </Card>
                </MotionDiv>
              </List.Item>
            )}
          />
          <Flex justify='center' style={{ marginTop: 12 }}>
            <Pagination
              current={current}
              pageSize={pageSize}
              total={total}
              onChange={handleMobilePagination}
              showSizeChanger
              pageSizeOptions={["10", "20", "50"]}
              responsive
              showTotal={(value) => `${value} data`}
            />
          </Flex>
        </>
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (items, range) =>
              `${range[0]}-${range[1]} dari ${items} guru`,
          }}
          onChange={handleDesktopChange}
          rowKey='id'
          scroll={{ x: 1100 }}
          size='middle'
        />
      )}
    </Card>
  );
};

export default TeacherList;
