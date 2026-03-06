import React, { useEffect, useMemo, useState } from "react";
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
  Building2,
  CalendarClock,
  GraduationCap,
  NotebookPen,
  BookOpenCheck,
  CircleUserRound,
} from "lucide-react";
import { useGetStudentSummaryQuery } from "../../../service/tahfiz/ApiDashboard";

const { Title, Text } = Typography;

const cardStyle = {
  borderRadius: 12,
  boxShadow: "0 8px 22px rgba(10, 24, 54, 0.08)",
  border: "1px solid #f0f0f0",
};

const iconStyle = (color) => ({ color, width: 20, height: 20 });

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

  const { data, isLoading, isError, isFetching } = useGetStudentSummaryQuery(
    queryArg,
  );

  useEffect(() => {
    if (!data?.filters) return;
    if (selectedHomebaseId == null && data.filters.selected_homebase_id != null) {
      setSelectedHomebaseId(data.filters.selected_homebase_id);
    }
    if (selectedPeriodeId == null && data.filters.selected_periode_id != null) {
      setSelectedPeriodeId(data.filters.selected_periode_id);
    }
  }, [data, selectedHomebaseId, selectedPeriodeId]);

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
      icon: <GraduationCap style={iconStyle("#1677ff")} />,
    },
    {
      title: "Halaqoh Aktif",
      value: data?.overview?.total_halaqoh || 0,
      icon: <BookOpenCheck style={iconStyle("#52c41a")} />,
    },
    {
      title: "Musyrif",
      value: data?.overview?.total_musyrif || 0,
      icon: <CircleUserRound style={iconStyle("#13c2c2")} />,
    },
    {
      title: "Total Setoran",
      value: data?.overview?.total_setoran || 0,
      icon: <NotebookPen style={iconStyle("#fa8c16")} />,
    },
    {
      title: "Ujian Tahfiz",
      value: data?.overview?.total_ujian || 0,
      icon: <CalendarClock style={iconStyle("#722ed1")} />,
    },
    {
      title: "Rata-rata Ujian",
      value: data?.overview?.average_exam_score || 0,
      precision: 2,
      icon: <Building2 style={iconStyle("#eb2f96")} />,
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        message="Gagal memuat dashboard Tahfiz."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: "0 8px" }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            style={{
              ...cardStyle,
              background: "linear-gradient(135deg, #f6ffed 0%, #ffffff 60%)",
            }}
          >
            <Space direction="vertical" size={8}>
              <Title level={4} style={{ margin: 0 }}>
                Summary Laporan Halaman Siswa Tahfiz
              </Title>
              <Text type="secondary">
                Ringkasan performa siswa berdasarkan homebase dan periode.
              </Text>
              <Space wrap>
                <Tag color="green">
                  Homebase:{" "}
                  {data?.filters?.homebases?.find(
                    (item) => item.id === data?.filters?.selected_homebase_id,
                  )?.name || "-"}
                </Tag>
                <Tag color="blue">
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
        </Col>
        <Col xs={24} lg={8}>
          <Card style={cardStyle}>
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Text strong>Filter Data</Text>
              <Select
                value={selectedHomebaseId}
                options={homebaseOptions}
                onChange={(value) => {
                  setSelectedHomebaseId(value);
                  setSelectedPeriodeId(undefined);
                }}
                placeholder="Pilih homebase"
                size="large"
                loading={isFetching}
              />
              <Select
                value={selectedPeriodeId}
                options={periodeOptions}
                onChange={setSelectedPeriodeId}
                placeholder="Pilih periode"
                size="large"
                loading={isFetching}
                disabled={!periodeOptions.length}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statItems.map((item) => (
          <Col key={item.title} xs={24} sm={12} xl={8}>
            <Card style={cardStyle}>
              <Statistic
                title={item.title}
                value={item.value}
                precision={item.precision}
                prefix={item.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card title="Ringkasan Aktivitas Tahfiz" style={cardStyle}>
            <Table
              dataSource={data?.activity_summary || []}
              rowKey={(record) => record.activity_type}
              pagination={false}
              size="small"
              locale={{ emptyText: "Belum ada aktivitas pada periode ini" }}
              columns={[
                {
                  title: "Jenis Aktivitas",
                  dataIndex: "activity_type",
                  key: "activity_type",
                },
                {
                  title: "Total Setoran",
                  dataIndex: "total_setoran",
                  key: "total_setoran",
                  align: "right",
                  width: 140,
                },
                {
                  title: "Total Baris",
                  dataIndex: "total_lines",
                  key: "total_lines",
                  align: "right",
                  width: 130,
                },
              ]}
              loading={isFetching}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TahfizDashboard;
