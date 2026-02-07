import React from "react";
import { Card, Flex, Space, Typography, Tag, theme, Button, Badge } from "antd";
import { ShieldCheck, Users, Timer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { useToken } = theme;

const ReportHeader = ({ examId, examName, stats }) => {
  const { token } = useToken();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/computer-based-test/jadwal-ujian");
  };
  return (
    <Badge.Ribbon
      text={
        <Text
          style={{ color: "white", fontSize: 10 }}
        >{`ID ${examId || "-"}`}</Text>
      }
    >
      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, #ffffff 55%)`,
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Flex vertical>
            <Space align="center" size={10} style={{ marginBottom: 6 }}>
              <ShieldCheck size={18} color={token.colorPrimary} />
              <Text type="secondary">Laporan Ujian</Text>
            </Space>

            <Space>
              <Button
                type="link"
                icon={<ArrowLeft size={14} />}
                onClick={handleBack}
              />
              <Title level={4} style={{ margin: 0 }}>
                {examName || "Ujian CBT"}
              </Title>
            </Space>
          </Flex>

          <Space size={8} wrap>
            <Tag color="green">Mengerjakan: {stats?.ongoing || 0}</Tag>
            <Tag color="red">Pelanggaran: {stats?.violations || 0}</Tag>
            <Tag color="default">Belum Masuk: {stats?.waiting || 0}</Tag>
            <Tag color="blue" icon={<Users size={12} />}>
              Total: {stats?.total || 0}
            </Tag>
            <Tag color="purple" icon={<Timer size={12} />}>
              Durasi: {stats?.duration || "-"} menit
            </Tag>
          </Space>
        </Flex>
      </Card>
    </Badge.Ribbon>
  );
};

export default ReportHeader;
