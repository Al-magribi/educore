import { Card, Tabs } from "antd";

import { cardStyle } from "../constants";
import SavingStudentsList from "./SavingStudentsList";
import SavingTransactionTable from "./SavingTransactionTable";

const SavingTabs = ({
  students,
  studentsLoading,
  transactions,
  transactionSummary,
  transactionsLoading,
  onCreate,
  onEditTransaction,
  onDeleteTransaction,
  deletingId,
}) => (
  <Card style={cardStyle} styles={{ body: { paddingTop: 12 } }}>
    <Tabs
      items={[
        {
          key: "students",
          label: `Daftar Siswa (${students.length})`,
          children: (
            <SavingStudentsList
              students={students}
              loading={studentsLoading}
              onCreate={onCreate}
            />
          ),
        },
        {
          key: "transactions",
          label: `Riwayat Transaksi (${transactions.length})`,
          children: (
            <SavingTransactionTable
              transactions={transactions}
              summary={transactionSummary}
              loading={transactionsLoading}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
              deletingId={deletingId}
            />
          ),
        },
      ]}
    />
  </Card>
);

export default SavingTabs;
