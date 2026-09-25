import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Badge,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { BookOpenCheck, Users } from "lucide-react";
import { useGetMusyrifHalaqohListQuery } from "../../../service/tahfiz/ApiHalaqoh";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut", staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

const MusyrifHalaqoh = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [periodeId, setPeriodeId] = useState();
  const [halaqohId, setHalaqohId] = useState();
  const [studentSearchByHalaqoh, setStudentSearchByHalaqoh] = useState({});

  const { data, isLoading, isFetching, isError, error } =
    useGetMusyrifHalaqohListQuery({
      periode_id: periodeId,
    });

  const selectedPeriodeId =
    periodeId ?? data?.filters?.selected_periode_id ?? undefined;

  const periodeOptions = (data?.filters?.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
  }));
  const halaqohOptions = (data?.halaqoh || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const halaqohRows = useMemo(() => {
    const rows = data?.halaqoh || [];
    return rows.filter((halaqoh) => (halaqohId ? halaqoh.id === halaqohId : true));
  }, [data?.halaqoh, halaqohId]);

  const totalUniqueStudents = useMemo(() => {
    const studentMap = new Map();
    halaqohRows.forEach((halaqoh) => {
      (halaqoh.students || []).forEach((student) => {
        if (!student?.id) return;
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, student);
        }
      });
    });
    return studentMap.size;
  }, [halaqohRows]);

  const columns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text strong>{record.full_name}</Text>
          <Text type='secondary'>NIS: {record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Kelas",
      dataIndex: "class_name",
      width: 170,
      render: (value) => value || "-",
    },
  ];

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat halaqoh musyrif.'
        description={error?.data?.message || "Silakan coba lagi."}
      />
    );
  }

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          style={{
            borderRadius: 22,
            border: "1px solid #dbeafe",
            boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
            background:
              "radial-gradient(circle at top left, rgba(191,219,254,0.35), transparent 36%), linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0ea5e9 100%)",
          }}
          styles={{ body: { padding: isMobile ? 16 : 22 } }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={12}
          >
            <Space direction='vertical' size={8}>
              <Space>
                <BookOpenCheck size={18} color='#dbeafe' />
                <Text style={{ color: "#e0f2fe", fontWeight: 700 }}>
                  HALAQOH MUSYRIF
                </Text>
              </Space>
              <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: "#f8fafc" }}>
                {data?.musyrif?.full_name || "Musyrif"}
              </Title>
              <Text style={{ color: "rgba(240,249,255,0.88)" }}>
                Daftar seluruh halaqoh dan siswa binaan sesuai akun musyrif
                login. Satu musyrif bisa menangani lebih dari satu halaqoh.
              </Text>
            </Space>

            <Space
              direction={isMobile ? "vertical" : "horizontal"}
              size={10}
              style={{ width: isMobile ? "100%" : "auto" }}
            >
              <Select
                value={selectedPeriodeId}
                options={periodeOptions}
                onChange={setPeriodeId}
                placeholder='Pilih periode'
                style={{ width: isMobile ? "100%" : 260 }}
                loading={isFetching}
              />
              <Select
                allowClear
                value={halaqohId}
                options={halaqohOptions}
                onChange={setHalaqohId}
                placeholder='Semua halaqoh'
                style={{ width: isMobile ? "100%" : 220 }}
                loading={isFetching}
              />
            </Space>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[14, 14]}>
          <Col xs={24} md={12}>
            <Card style={{ borderRadius: 18 }}>
              <Space align='center'>
                <Badge color='#1d4ed8' />
                <Text type='secondary'>Total Halaqoh</Text>
              </Space>
              <Title level={3} style={{ marginTop: 10, marginBottom: 0 }}>
                {halaqohRows.length}
              </Title>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card style={{ borderRadius: 18 }}>
              <Space align='center'>
                <Users size={16} />
                <Text type='secondary'>Total Siswa Binaan</Text>
              </Space>
              <Title level={3} style={{ marginTop: 10, marginBottom: 0 }}>
                {totalUniqueStudents}
              </Title>
            </Card>
          </Col>
        </Row>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        {isLoading ? (
          <Card style={{ borderRadius: 20 }} loading />
        ) : halaqohRows.length ? (
          <Space direction='vertical' size={14} style={{ width: "100%" }}>
            {halaqohRows.map((halaqoh) => (
              <Card
                key={halaqoh.id}
                style={{
                  borderRadius: 20,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
                }}
                styles={{ body: { padding: isMobile ? 12 : 16 } }}
              >
                {(() => {
                  const keyword = String(studentSearchByHalaqoh[halaqoh.id] || "")
                    .trim()
                    .toLowerCase();
                  const studentRows = keyword
                    ? (halaqoh.students || []).filter((student) =>
                        String(student.full_name || "")
                          .toLowerCase()
                          .includes(keyword),
                      )
                    : halaqoh.students || [];

                  return (
                    <>
                <Flex justify='space-between' align='center' wrap='wrap' gap={10}>
                  <Space direction='vertical' size={0}>
                    <Text strong style={{ fontSize: 16 }}>
                      {halaqoh.name}
                    </Text>
                    <Text type='secondary'>
                      {Number(halaqoh.student_count || 0)} siswa
                    </Text>
                  </Space>
                  <Tag color={halaqoh.is_active ? "green" : "default"}>
                    {halaqoh.is_active ? "Aktif" : "Nonaktif"}
                  </Tag>
                </Flex>

                <Input
                  allowClear
                  placeholder='Filter nama siswa di halaqoh ini'
                  style={{ marginTop: 12, maxWidth: 320 }}
                  value={studentSearchByHalaqoh[halaqoh.id] || ""}
                  onChange={(event) =>
                    setStudentSearchByHalaqoh((prev) => ({
                      ...prev,
                      [halaqoh.id]: event.target.value,
                    }))
                  }
                />

                <Table
                  style={{ marginTop: 12 }}
                  rowKey='id'
                  columns={columns}
                  dataSource={studentRows}
                  pagination={false}
                  size='small'
                  scroll={{ x: 520 }}
                  locale={{ emptyText: <Empty description='Belum ada siswa' /> }}
                />
                    </>
                  );
                })()}
              </Card>
            ))}
          </Space>
        ) : (
          <Card style={{ borderRadius: 20 }}>
            <Empty description='Belum ada halaqoh untuk periode ini' />
          </Card>
        )}
      </MotionDiv>
    </MotionDiv>
  );
};

export default MusyrifHalaqoh;
