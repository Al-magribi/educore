import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Grid,
  Input,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  Database,
  Link2,
  Pencil,
  Trash2,
  UserRoundCheck,
  Users,
} from "lucide-react";
import useDebounced from "../../../utils/useDebounced";
import {
  useCreateParentAccountMutation,
  useDeleteParentAccountMutation,
  useGetParentAccountsQuery,
  useGetParentReferenceStudentsQuery,
  useUpdateParentAccountMutation,
} from "../../../service/database/ApiDatabase";
import ParentAccountForm from "./ParentAccountForm";
import ParentImportDrawer from "./ParentImportDrawer";
import { downloadParentTemplate } from "./parentImportTemplate";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const surfaceCardStyle = {
  borderRadius: 24,
  border: "1px solid #e6eef8",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const heroCardStyle = {
  ...surfaceCardStyle,
  background:
    "radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #38bdf8 100%)",
  color: "#fff",
  boxShadow: "0 24px 54px rgba(15, 23, 42, 0.18)",
};

const statCardStyle = {
  ...surfaceCardStyle,
  background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
  height: "100%",
};

const filterCardStyle = {
  ...surfaceCardStyle,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
};

const panelCardStyle = {
  ...surfaceCardStyle,
  background: "#ffffff",
};

const detailCardStyle = {
  borderRadius: 18,
  border: "1px solid #eef2f7",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
};

const iconWrapStyle = (background, color) => ({
  width: 46,
  height: 46,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
  flexShrink: 0,
});

const ParentAccountManager = ({ scope = "all" }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isSmallMobile = !screens.sm;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const debouncedSearch = useDebounced(search, 400);

  const { data, isLoading, isFetching } = useGetParentAccountsQuery({
    page,
    limit: 10,
    search: debouncedSearch,
    scope,
  });
  const { data: referenceData, isFetching: isFetchingStudents } =
    useGetParentReferenceStudentsQuery({ scope });
  const [createParentAccount, { isLoading: isCreating }] =
    useCreateParentAccountMutation();
  const [updateParentAccount, { isLoading: isUpdating }] =
    useUpdateParentAccountMutation();
  const [deleteParentAccount, { isLoading: isDeleting }] =
    useDeleteParentAccountMutation();

  const isSaving = isCreating || isUpdating;
  const parentItems = data?.data || [];
  const summary = data?.summary || {
    total_parents: 0,
    active_parents: 0,
    total_student_links: 0,
    parents_with_multiple_students: 0,
  };
  const studentOptions = useMemo(
    () => referenceData?.data || [],
    [referenceData],
  );

  const mappedStudentOptions = useMemo(() => {
    const selectedStudentMap = new Map(
      (selectedParent?.students || []).map((item) => [
        item.student_id,
        {
          student_id: item.student_id,
          full_name: item.full_name,
          nis: item.nis,
          class_name: item.class_name,
        },
      ]),
    );
    const mergedStudents = [...studentOptions];

    selectedStudentMap.forEach((value, key) => {
      if (!mergedStudents.some((item) => item.student_id === key)) {
        mergedStudents.push(value);
      }
    });

    return mergedStudents.map((item) => ({
      value: item.student_id,
      label: `${item.full_name} (${item.nis || "-"})`,
      searchLabel: `${item.full_name} ${item.nis || ""} ${item.class_name || ""}`,
    }));
  }, [selectedParent, studentOptions]);

  const handleOpenCreate = () => {
    setSelectedParent(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (selectedParent) {
        await updateParentAccount({
          id: selectedParent.parent_user_id,
          scope,
          ...values,
        }).unwrap();
        message.success("Akun orang tua berhasil diperbarui.");
      } else {
        await createParentAccount({ ...values, scope }).unwrap();
        message.success("Akun orang tua berhasil dibuat.");
      }

      setIsFormOpen(false);
      setSelectedParent(null);
    } catch (error) {
      message.error(error?.data?.message || "Akun orang tua gagal disimpan.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteParentAccount({ id, scope }).unwrap();
      message.success("Akun orang tua berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Akun orang tua gagal dihapus.");
    }
  };

  const columns = [
    {
      title: "Nama Akun",
      key: "parent",
      ellipsis: true,
      render: (_, record) => (
        <Space vertical size={0}>
          <Text strong>{record.full_name}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            Username: {record.username || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Kontak",
      key: "contact",
      responsive: ["md"],
      render: (_, record) => (
        <Space vertical size={0}>
          <Text>{record.phone || "-"}</Text>
          <Text type='secondary'>{record.email || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Relasi Siswa",
      key: "students",
      width: 260,
      render: (_, record) => (
        <Space vertical size={4}>
          <Tag color='blue'>{record.total_students} siswa</Tag>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {(record.students || [])
              .slice(0, 2)
              .map((item) => `${item.full_name} (${item.nis || "-"})`)
              .join(", ") || "-"}
            {record.total_students > 2
              ? ` +${record.total_students - 2} lainnya`
              : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 110,
      align: "center",
      responsive: ["sm"],
      render: (value) => (
        <Tag color={value ? "green" : "default"}>
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Button
            type='text'
            icon={<Pencil size={14} />}
            onClick={() => {
              setSelectedParent(record);
              setIsFormOpen(true);
            }}
          />
          <Popconfirm
            title='Hapus akun orang tua?'
            description='Akun login dan seluruh relasi siswa akan dihapus.'
            onConfirm={() => handleDelete(record.parent_user_id)}
          >
            <Button
              type='text'
              danger
              loading={isDeleting}
              icon={<Trash2 size={14} />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const stats = [
    {
      key: "total",
      title: "Total Akun",
      value: summary.total_parents,
      icon: <Users size={18} />,
      iconBg: "#dbeafe",
      iconColor: "#1d4ed8",
      accent: "#1d4ed8",
      helper: "Seluruh akun orang tua terdaftar",
    },
    {
      key: "active",
      title: "Akun Aktif",
      value: summary.active_parents,
      icon: <UserRoundCheck size={18} />,
      iconBg: "#dcfce7",
      iconColor: "#15803d",
      accent: "#15803d",
      helper: "Siap digunakan untuk login",
    },
    {
      key: "links",
      title: "Total Relasi",
      value: summary.total_student_links,
      icon: <Link2 size={18} />,
      iconBg: "#e0f2fe",
      iconColor: "#0369a1",
      accent: "#0369a1",
      helper: "Koneksi akun orang tua ke siswa",
    },
    {
      key: "multi",
      title: "Akun Multi-Siswa",
      value: summary.parents_with_multiple_students,
      icon: <Database size={18} />,
      iconBg: "#ffedd5",
      iconColor: "#c2410c",
      accent: "#c2410c",
      helper: "Akun terhubung ke lebih dari satu siswa",
    },
  ];

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='show'
      style={{ width: "100%" }}
    >
      <Space vertical size={isMobile ? 16 : 20} style={{ width: "100%" }}>
        <MotionDiv variants={itemVariants}>
          <Card
            style={heroCardStyle}
            bodyStyle={{ padding: isSmallMobile ? 16 : isMobile ? 20 : 28 }}
          >
            <Row gutter={[20, 20]} align='middle'>
              <Col xs={24} lg={15}>
                <Space direction='vertical' size={10} style={{ width: "100%" }}>
                  <div
                    style={{
                      ...iconWrapStyle("rgba(255,255,255,0.16)", "#ffffff"),
                      width: isSmallMobile ? 48 : 56,
                      height: isSmallMobile ? 48 : 56,
                      borderRadius: 18,
                    }}
                  >
                    <Users size={isSmallMobile ? 20 : 24} />
                  </div>
                  <div>
                    <Title
                      level={isSmallMobile ? 4 : 3}
                      style={{
                        color: "#ffffff",
                        margin: 0,
                        marginBottom: 6,
                        fontSize: isSmallMobile ? 18 : undefined,
                      }}
                    >
                      Manajemen Akun Orang Tua
                    </Title>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.82)",
                        fontSize: isSmallMobile ? 13 : 14,
                        display: "block",
                      }}
                    >
                      Kelola akun login orang tua, hubungan ke siswa, dan proses
                      import data.
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col xs={24} lg={9}>
                <div
                  style={{
                    padding: isSmallMobile ? 14 : isMobile ? 16 : 18,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Text
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.72)",
                      marginBottom: 8,
                    }}
                  >
                    Ringkasan relasi siswa
                  </Text>
                  <Title
                    level={isSmallMobile ? 3 : 2}
                    style={{
                      color: "#ffffff",
                      margin: 0,
                      marginBottom: 8,
                      fontSize: isSmallMobile ? 26 : undefined,
                    }}
                  >
                    {summary.total_student_links || 0}
                  </Title>
                  <Text style={{ color: "rgba(255,255,255,0.8)" }}>
                    {summary.parents_with_multiple_students || 0} akun terhubung
                    ke lebih dari satu siswa.
                  </Text>
                </div>
              </Col>
            </Row>
          </Card>
        </MotionDiv>

        <Row gutter={[16, 16]}>
          {stats.map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.key}>
              <MotionDiv
                variants={itemVariants}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ height: "100%" }}
              >
                <Card
                  style={statCardStyle}
                  bodyStyle={{
                    padding: isSmallMobile ? 16 : 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: isSmallMobile ? 12 : 14,
                    height: "100%",
                  }}
                >
                  <Space align='start' size={14} style={{ width: "100%" }}>
                    <div style={iconWrapStyle(item.iconBg, item.iconColor)}>
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Text
                        type='secondary'
                        style={{
                          fontSize: 13,
                          display: "block",
                          marginBottom: 4,
                          whiteSpace: "normal",
                        }}
                      >
                        {item.title}
                      </Text>
                      <Statistic
                        value={item.value}
                        styles={{ content: { color: item.accent } }}
                      />
                    </div>
                  </Space>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {item.helper}
                  </Text>
                </Card>
              </MotionDiv>
            </Col>
          ))}
        </Row>

        <MotionDiv variants={itemVariants}>
          <Card
            style={filterCardStyle}
            title={
              <Space
                align='center'
                direction={isSmallMobile ? "vertical" : "horizontal"}
                size={isSmallMobile ? 8 : 12}
                style={{
                  width: "100%",
                  alignItems: isSmallMobile ? "flex-start" : "center",
                }}
              >
                <span style={iconWrapStyle("#dbeafe", "#1d4ed8")}>
                  <SearchOutlined />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>Pencarian dan Aksi</div>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Temukan akun orang tua dengan cepat lalu lakukan aksi yang
                    dibutuhkan.
                  </Text>
                </div>
              </Space>
            }
          >
            <Flex
              vertical={isSmallMobile ? true : false}
              justify='space-between'
              align='center'
              gap={"middle"}
            >
              <Input
                allowClear
                prefix={<SearchOutlined />}
                size='large'
                placeholder='Cari nama, username, telepon, email, nama siswa, atau NIS'
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />

              <Flex
                vertical={isSmallMobile ? true : false}
                justify='center'
                gap={"middle"}
              >
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() =>
                    downloadParentTemplate({ students: studentOptions })
                  }
                  loading={isFetchingStudents}
                >
                  Template
                </Button>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setIsImportOpen(true)}
                >
                  Import Excel
                </Button>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={handleOpenCreate}
                >
                  Tambah Orang Tua
                </Button>
              </Flex>
            </Flex>
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            title={
              <Space direction='vertical' size={2} style={{ width: "100%" }}>
                <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                  Daftar Akun Orang Tua
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Lihat relasi siswa, ubah akun, atau hapus akun yang tidak lagi
                  digunakan.
                </Text>
              </Space>
            }
            style={panelCardStyle}
            styles={{
              body: {
                overflowX: "hidden",
                padding: isSmallMobile ? 12 : isMobile ? 16 : 24,
              },
            }}
          >
            <Table
              rowKey='parent_user_id'
              loading={isLoading || isFetching}
              dataSource={parentItems}
              columns={columns}
              scroll={isMobile ? { x: 760 } : { x: 960 }}
              expandable={{
                expandedRowRender: (record) => (
                  <Space vertical size={12} style={{ width: "100%" }}>
                    <Text strong>Siswa Terhubung</Text>
                    <Row gutter={[12, 12]}>
                      {(record.students || []).map((item) => (
                        <Col xs={24} md={12} xl={8} key={item.student_id}>
                          <Card
                            size='small'
                            style={detailCardStyle}
                            bodyStyle={{ background: "#fcfdff" }}
                          >
                            <Space vertical size={0}>
                              <Text strong>{item.full_name}</Text>
                              <Text type='secondary'>
                                NIS: {item.nis || "-"}
                              </Text>
                              <Text type='secondary'>
                                {item.grade_name || "-"} |{" "}
                                {item.class_name || "-"}
                              </Text>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Space>
                ),
              }}
              locale={{ emptyText: "Akun orang tua belum tersedia." }}
              pagination={{
                current: page,
                pageSize: 10,
                total: data?.meta?.total_data || 0,
                showSizeChanger: false,
                size: isMobile ? "small" : "default",
                showLessItems: isMobile,
                onChange: (nextPage) => setPage(nextPage),
              }}
            />
          </Card>
        </MotionDiv>

        <ParentAccountForm
          open={isFormOpen}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedParent(null);
          }}
          onSubmit={handleSubmit}
          loading={isSaving}
          parentRecord={selectedParent}
          studentOptions={mappedStudentOptions}
        />

        <ParentImportDrawer
          open={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          studentOptions={studentOptions}
          scope={scope}
        />
      </Space>
    </MotionDiv>
  );
};

export default ParentAccountManager;
