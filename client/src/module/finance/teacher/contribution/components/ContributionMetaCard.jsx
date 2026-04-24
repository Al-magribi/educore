import { Card, Descriptions, Space, Typography } from "antd";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const ContributionMetaCard = ({ user, access, summary }) => (
  <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
    <Card
      variant="borderless"
      style={cardStyle}
      styles={{ body: { padding: 18 } }}
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Ringkasan Wali Kelas
          </Title>
          <Text type="secondary">
            Informasi ini membantu Anda melihat posisi kas dan kelas yang sedang
            dikelola pada periode berjalan.
          </Text>
        </div>

        <Descriptions column={{ xs: 1, md: 2, xl: 4 }} size="small">
          <Descriptions.Item label="Wali Kelas">
            {user?.full_name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Kelas">
            {access?.homeroom_class?.name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Total Pemasukan">
            {currencyFormatter.format(Number(summary.income_total || 0))}
          </Descriptions.Item>
          <Descriptions.Item label="Total Pengeluaran">
            {currencyFormatter.format(Number(summary.expense_total || 0))}
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  </MotionDiv>
);

export default ContributionMetaCard;
