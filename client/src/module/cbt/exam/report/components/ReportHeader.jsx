import { Card, Flex, Space, Typography, Tag, theme, Button, Badge } from "antd";
import { ShieldCheck, Users, Timer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { useToken } = theme;

const ReportHeader = ({ examName, stats, isMobile = false, examToken }) => {
  const { token } = useToken();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/computer-based-test/jadwal-ujian");
  };
  return (
    <Badge.Ribbon text={examToken}>
      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, #ffffff 55%)`,
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "flex-start" : "center"}
          wrap='wrap'
          gap={16}
          style={{ flexDirection: isMobile ? "column" : "row" }}
        >
          <Flex vertical style={{ width: isMobile ? "100%" : "auto" }}>
            <Space align='center' size={10} style={{ marginBottom: 6 }}>
              <ShieldCheck size={18} color={token.colorPrimary} />
              <Text type='secondary'>Laporan Ujian</Text>
            </Space>

            <Space style={{ width: "100%" }}>
              <Button
                type='link'
                icon={<ArrowLeft size={14} />}
                onClick={handleBack}
              />
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                {examName || "Ujian CBT"}
              </Title>
            </Space>
          </Flex>

          <Space size={8} wrap style={{ width: isMobile ? "100%" : "auto" }}>
            <Tag color='green'>Mengerjakan: {stats?.ongoing || 0}</Tag>
            <Tag color='red'>Pelanggaran: {stats?.violations || 0}</Tag>
            <Tag color='default'>Belum Masuk: {stats?.waiting || 0}</Tag>
            <Tag color='blue' icon={<Users size={12} />}>
              Total: {stats?.total || 0}
            </Tag>
            <Tag color='purple' icon={<Timer size={12} />}>
              Durasi: {stats?.duration || "-"} menit
            </Tag>
          </Space>
        </Flex>
      </Card>
    </Badge.Ribbon>
  );
};

export default ReportHeader;
