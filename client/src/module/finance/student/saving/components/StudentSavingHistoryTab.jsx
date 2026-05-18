import { Card, Empty, List, Space, Tag, Typography } from "antd";

import {
  cardStyle,
  currencyFormatter,
  formatSavingDate,
  transactionTypeMeta,
} from "../constants";

const { Text } = Typography;

const StudentSavingHistoryTab = ({ transactions }) => {
  if (!transactions.length) {
    return (
      <Card style={cardStyle}>
        <Empty description='Belum ada transaksi tabungan pada periode aktif.' />
      </Card>
    );
  }

  return (
    <Card style={cardStyle}>
      <List
        itemLayout='vertical'
        dataSource={transactions}
        renderItem={(item) => (
          <List.Item key={item.transaction_id}>
            <Space
              direction='vertical'
              size={10}
              style={{ width: "100%" }}
            >
              <Space
                align='start'
                style={{ width: "100%", justifyContent: "space-between" }}
                wrap
              >
                <Space direction='vertical' size={2}>
                  <Text strong>{formatSavingDate(item.transaction_date)}</Text>
                  <Text type='secondary'>
                    Diproses oleh {item.processed_by_name || "Petugas sekolah"}
                  </Text>
                </Space>
                <Tag color={transactionTypeMeta[item.transaction_type]?.color}>
                  {transactionTypeMeta[item.transaction_type]?.label}
                </Tag>
              </Space>

              <Text
                strong
                style={{
                  color:
                    item.transaction_type === "withdrawal"
                      ? "#d97706"
                      : "#059669",
                  fontSize: 16,
                }}
              >
                {item.transaction_type === "withdrawal" ? "- " : "+ "}
                {currencyFormatter.format(Number(item.amount || 0))}
              </Text>

              <Text type='secondary'>{item.description || "Tanpa keterangan."}</Text>
            </Space>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default StudentSavingHistoryTab;
