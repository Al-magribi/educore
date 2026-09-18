import React, { useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  Award,
  CalendarClock,
  GraduationCap,
  NotebookPen,
  BookOpenCheck,
  CircleUserRound,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGetStudentSummaryQuery } from "../../../service/tahfiz/ApiDashboard";

const { Title, Text } = Typography;

const cardStyle = {
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.04)",
  border: "1px solid #f5f5f5",
  height: "100%",
};

const IconWrapper = ({ icon, color }) => (
  <div
    style={{
      backgroundColor: `${color}15`,
      color: color,
      borderRadius: "50%",
      width: 48,
      height: 48,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    }}
  >
    {icon}
  </div>
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const TahfizDashboard = () => {
  const [selectedHomebaseId, setSelectedHomebaseId] = useState();
  const [selectedPeriodeId, setSelectedPeriodeId] = useState();

  const queryArg = useMemo(
    () => ({
      homebase_id: selectedHomebaseId,
      periode_id: selectedPeriodeId,
    }),
    [selectedHomebaseId, selectedPeriodeId],
  );

  const { data, isLoading, isError, isFetching } =
    useGetStudentSummaryQuery(queryArg);

  const selectedHomebaseValue =
    selectedHomebaseId ?? data?.filters?.selected_homebase_id;
  const selectedPeriodeValue =
    selectedPeriodeId ?? data?.filters?.selected_periode_id;

  const homebaseOptions = (data?.filters?.homebases || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const periodeOptions = (data?.filters?.periodes || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const statItems = [
    {
      title: "Total Siswa",
      value: data?.overview?.total_students || 0,
      icon: <GraduationCap size={24} />,
      color: "#1677ff",
    },
    {
      title: "Halaqoh Aktif",
      value: data?.overview?.total_halaqoh || 0,
      icon: <BookOpenCheck size={24} />,
      color: "#52c41a",
    },
    {
      title: "Musyrif",
      value: data?.overview?.total_musyrif || 0,
      icon: <CircleUserRound size={24} />,
      color: "#13c2c2",
    },
    {
      title: "Total Setoran",
      value: data?.overview?.total_setoran || 0,
      icon: <NotebookPen size={24} />,
      color: "#fa8c16",
    },
    {
      title: "Ujian Tahfiz",
      value: data?.overview?.total_ujian || 0,
      icon: <CalendarClock size={24} />,
      color: "#722ed1",
    },
    {
      title: "Rata-rata Ujian",
      value: data?.overview?.average_exam_score || 0,
      precision: 2,
      icon: <Award size={24} />,
      color: "#eb2f96",
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size='large' />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert message='Gagal memuat dashboard Tahfiz.' type='error' showIcon />
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={{ padding: "0 8px", overflowX: "hidden" }}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align='stretch'>
        <Col
          xs={24}
          lg={16}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <motion.div variants={itemVariants} style={{ flex: 1 }}>
            <Card
              style={{
                ...cardStyle,
                background: "linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)",
              }}
            >
              <Space direction='vertical' size={8}>
                <Title level={4} style={{ margin: 0 }}>
                  Dashboard Tahfiz
                </Title>
                <Text type='secondary'>
                  Ringkasan performa siswa berdasarkan homebase dan periode.
                </Text>
                <Space wrap>
                  <Tag color='green'>
                    Homebase:{" "}
                    {data?.filters?.homebases?.find(
                      (item) => item.id === data?.filters?.selected_homebase_id,
                    )?.name || "-"}
                  </Tag>
                  <Tag color='blue'>
                    Periode:{" "}
                    {data?.filters?.periodes?.find(
                      (item) => item.id === data?.filters?.selected_periode_id,
                    )?.name || "-"}
                  </Tag>
                  <Tag
                    color={
                      data?.filters?.active_periode_id ===
                      data?.filters?.selected_periode_id
                        ? "cyan"
                        : "default"
                    }
                  >
                    {data?.filters?.active_periode_id ===
                    data?.filters?.selected_periode_id
                      ? "Periode aktif satuan"
                      : "Periode nonaktif"}
                  </Tag>
                </Space>
              </Space>
            </Card>
          </motion.div>
        </Col>
        <Col
          xs={24}
          lg={8}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <motion.div variants={itemVariants} style={{ flex: 1 }}>
            <Card style={cardStyle}>
              <Space direction='vertical' size={12} style={{ width: "100%" }}>
                <Space>
                  <Filter size={18} />
                  <Text strong style={{ fontSize: 16 }}>
                    Filter Data
                  </Text>
                </Space>
                <Select
                  value={selectedHomebaseValue}
                  options={homebaseOptions}
                  onChange={(value) => {
                    setSelectedHomebaseId(value);
                    setSelectedPeriodeId(undefined);
                  }}
                  placeholder='Pilih homebase'
                  size='large'
                  style={{ width: "100%" }}
                  loading={isFetching}
                />
                <Select
                  value={selectedPeriodeValue}
                  options={periodeOptions}
                  onChange={setSelectedPeriodeId}
                  placeholder='Pilih periode'
                  size='large'
                  style={{ width: "100%" }}
                  loading={isFetching}
                  disabled={!periodeOptions.length}
                />
              </Space>
            </Card>
          </motion.div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align='stretch'>
        {statItems.map((item) => (
          <Col
            key={item.title}
            xs={24}
            sm={12}
            xl={8}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4 }}
              style={{ flex: 1 }}
            >
              <Card style={cardStyle}>
                <Statistic
                  title={
                    <Text type='secondary' strong>
                      {item.title}
                    </Text>
                  }
                  value={item.value}
                  precision={item.precision}
                  prefix={<IconWrapper icon={item.icon} color={item.color} />}
                  valueStyle={{
                    fontWeight: 600,
                    fontSize: "24px",
                    marginTop: 8,
                  }}
                />
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} style={{ display: "flex", flexDirection: "column" }}>
          <motion.div variants={itemVariants} style={{ flex: 1 }}>
            <Card
              title={
                <Text strong style={{ fontSize: 16 }}>
                  Ringkasan Aktivitas Tahfiz
                </Text>
              }
              style={cardStyle}
            >
              <Table
                dataSource={data?.activity_summary || []}
                rowKey={(record) => record.activity_type}
                pagination={false}
                size='middle'
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Belum ada aktivitas pada periode ini" }}
                columns={[
                  {
                    title: "Jenis Aktivitas",
                    dataIndex: "activity_type",
                    key: "activity_type",
                    render: (text) => <Text strong>{text}</Text>,
                  },
                  {
                    title: "Total Setoran",
                    dataIndex: "total_setoran",
                    key: "total_setoran",
                    align: "right",
                    width: 140,
                    render: (val) => <Tag color='blue'>{val}</Tag>,
                  },
                  {
                    title: "Total Baris",
                    dataIndex: "total_lines",
                    key: "total_lines",
                    align: "right",
                    width: 130,
                    render: (val) => <Tag color='green'>{val}</Tag>,
                  },
                ]}
                loading={isFetching}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>
    </motion.div>
  );
};

export default TahfizDashboard;
