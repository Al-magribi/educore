import React from "react";
import { Alert, Button, Card, Flex, Space, Tag, Typography } from "antd";
import { MessageCircle } from "lucide-react";
import { cardStyle } from "./studentDashStyles";

const { Text } = Typography;

const StudentTelegramCard = ({ telegram, isMobile, isXs }) => (
  <Card
    style={{
      ...cardStyle,
      height: "auto",
    }}
    styles={{
      body: {
        padding: isXs ? 12 : isMobile ? 14 : 20,
      },
    }}
  >
    <Flex align='start' gap={isMobile ? 10 : 14} wrap='wrap'>
      <div
        style={{
          width: isMobile ? 40 : 44,
          height: isMobile ? 40 : 44,
          borderRadius: 14,
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg, #dbeafe, #ccfbf1)",
          color: "#0f766e",
          flexShrink: 0,
        }}
      >
        <MessageCircle size={isMobile ? 18 : 20} />
      </div>
      <Space direction='vertical' size={8} style={{ flex: 1, minWidth: 220 }}>
        <Space wrap>
          <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
            Notifikasi Absensi Telegram
          </Text>
          {telegram?.is_bound ? (
            <Tag color='success'>Terhubung</Tag>
          ) : (
            <Tag>Belum terhubung</Tag>
          )}
        </Space>
        <Text type='secondary'>
          {telegram?.is_bound
            ? "Akun Telegram kamu sudah terhubung. Setiap tap datang/pulang di mesin RFID akan dikirim ke chat bot."
            : "Hubungkan Telegram agar menerima notifikasi jam datang dan pulang saat tap di mesin absensi."}
        </Text>
        {telegram?.bind_link ? (
          <Button
            type={telegram?.is_bound ? "default" : "primary"}
            href={telegram.bind_link}
            target='_blank'
            rel='noreferrer'
          >
            {telegram?.is_bound ? "Buka Bot Lagi" : "Hubungkan Telegram"}
          </Button>
        ) : (
          <Alert
            type='warning'
            showIcon
            message='Bot Telegram sekolah belum dikonfigurasi. Hubungi admin sekolah.'
          />
        )}
      </Space>
    </Flex>
  </Card>
);

export default StudentTelegramCard;
