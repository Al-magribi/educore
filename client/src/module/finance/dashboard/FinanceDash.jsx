import { Card, Typography } from "antd";

const { Paragraph, Title } = Typography;

const FinanceDash = () => {
  return (
    <Card>
      <Title level={3}>Dashboard Finance</Title>
      <Paragraph style={{ marginBottom: 0 }}>
        Route finance sudah aktif di branch main. Halaman ini masih placeholder
        dan bisa diganti penuh saat masuk ke branch `feature/finance`.
      </Paragraph>
    </Card>
  );
};

export default FinanceDash;
