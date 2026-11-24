import { Alert, Button, Flex, Tag, Typography } from "antd";
import { MessageCircle } from "lucide-react";

import { CardTitle, MuseCard } from "../../../components/ui/muse";

const { Text } = Typography;

/** Status tautan bot Telegram untuk notifikasi tap datang/pulang. */
const TelegramBindCard = ({ telegram, boundText, unboundText }) => {
  const isBound = Boolean(telegram?.is_bound);

  return (
    <MuseCard
      title={
        <CardTitle icon={<MessageCircle size={16} />} title='Notifikasi Telegram' description='Kabar tap datang dan pulang.' />
      }
      extra={
        <Tag color={isBound ? "success" : "default"} style={{ margin: 0 }}>
          {isBound ? "Terhubung" : "Belum terhubung"}
        </Tag>
      }
    >
      <Flex vertical gap={12}>
        <Text type='secondary'>{isBound ? boundText : unboundText}</Text>
        {telegram?.bind_link ? (
          <Button
            type={isBound ? "default" : "primary"}
            href={telegram.bind_link}
            target='_blank'
            rel='noreferrer'
            icon={<MessageCircle size={16} />}
            style={{ alignSelf: "flex-start" }}
          >
            {isBound ? "Buka Bot Lagi" : "Hubungkan Telegram"}
          </Button>
        ) : (
          <Alert type='warning' showIcon title='Bot Telegram sekolah belum dikonfigurasi. Hubungi admin sekolah.' />
        )}
      </Flex>
    </MuseCard>
  );
};

export default TelegramBindCard;
