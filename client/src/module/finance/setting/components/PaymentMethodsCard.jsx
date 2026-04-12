import { Alert, Card, Flex, Space, Tag, Typography } from "antd";
import { BankOutlined } from "@ant-design/icons";
import { cardStyle } from "../../fee/others/constants";

const { Text } = Typography;

const PaymentMethodsCard = ({ paymentMethods }) => (
  <Card
    style={cardStyle}
    title={
      <Space>
        <BankOutlined />
        <span>Ringkasan Metode Pembayaran</span>
      </Space>
    }
  >
    <Space vertical size={14} style={{ width: "100%" }}>
      {(paymentMethods || []).map((item) => (
        <Card
          key={item.id}
          size='small'
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.14)",
            boxShadow: "none",
          }}
        >
          <Flex justify='space-between' align='center'>
            <div>
              <Text strong>{item.name}</Text>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  marginTop: 2,
                }}
              >
                {item.method_type}
              </div>
            </div>
            <Tag color={item.is_active ? "green" : "default"}>
              {item.is_active ? "Aktif" : "Nonaktif"}
            </Tag>
          </Flex>
        </Card>
      ))}

      {!paymentMethods.length ? (
        <Alert
          type='warning'
          showIcon
          title='Belum ada metode pembayaran aktif'
          description='Midtrans atau rekening bank akan otomatis membuat metode pembayaran saat disimpan.'
        />
      ) : null}
    </Space>
  </Card>
);

export default PaymentMethodsCard;
