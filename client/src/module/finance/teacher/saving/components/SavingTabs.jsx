import { memo, useMemo, useState } from "react";
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
}) => {
  const [activeKey, setActiveKey] = useState("students");
  const items = useMemo(
    () => [
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
    ],
    [
      deletingId,
      onCreate,
      onDeleteTransaction,
      onEditTransaction,
      students,
      studentsLoading,
      transactionSummary,
      transactions,
      transactionsLoading,
    ],
  );

  return (
    <Card style={cardStyle} styles={{ body: { paddingTop: 12 } }}>
      <Tabs
        activeKey={activeKey}
        destroyInactiveTabPane
        items={items}
        onChange={setActiveKey}
      />
    </Card>
  );
};

export default memo(SavingTabs);
