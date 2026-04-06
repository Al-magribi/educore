import { Card, Descriptions } from "antd";

import { cardStyle, currencyFormatter } from "../constants";

const ContributionMetaCard = ({ user, access, summary }) => (
  <Card style={cardStyle}>
    <Descriptions column={{ xs: 1, md: 2, xl: 4 }} size='small'>
      <Descriptions.Item label='Wali Kelas'>
        {user?.full_name || "-"}
      </Descriptions.Item>
      <Descriptions.Item label='Kelas'>
        {access?.homeroom_class?.name || "-"}
      </Descriptions.Item>
      <Descriptions.Item label='Total Pemasukan'>
        {currencyFormatter.format(Number(summary.income_total || 0))}
      </Descriptions.Item>
      <Descriptions.Item label='Total Pengeluaran'>
        {currencyFormatter.format(Number(summary.expense_total || 0))}
      </Descriptions.Item>
    </Descriptions>
  </Card>
);

export default ContributionMetaCard;
