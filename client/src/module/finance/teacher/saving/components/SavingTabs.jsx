import { memo, useMemo, useState } from "react";
import { Card, Tabs } from "antd";
import { motion } from "framer-motion";

import { cardStyle } from "../constants";
import SavingStudentsList from "./SavingStudentsList";
import SavingTransactionTable from "./SavingTransactionTable";

const MotionDiv = motion.div;

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
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        variant="borderless"
        style={cardStyle}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Tabs
          activeKey={activeKey}
          destroyInactiveTabPane
          items={items}
          onChange={setActiveKey}
        />
      </Card>
    </MotionDiv>
  );
};

export default memo(SavingTabs);
