import { memo, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Pagination,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter, formatSavingDate } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;
const PAGE_SIZE = 12;

const SavingStudentsList = ({ students, loading, onCreate }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const startIndex = (effectivePage - 1) * PAGE_SIZE;
    return students.slice(startIndex, startIndex + PAGE_SIZE);
  }, [effectivePage, students]);

  if (!loading && students.length === 0) {
    return (
      <Card variant="borderless" style={cardStyle}>
        <Empty description="Belum ada siswa yang sesuai dengan filter aktif." />
      </Card>
    );
  }

  return (
    <Space orientation="vertical" size={20} style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        {paginatedStudents.map((student) => (
          <Col xs={24} md={12} xl={8} key={student.student_id}>
            <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Card
                loading={loading}
                variant="borderless"
                style={cardStyle}
                styles={{ body: { padding: 18 } }}
              >
                <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                  <Space
                    align="start"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space orientation="vertical" size={2}>
                      <Title level={5} style={{ margin: 0 }}>
                        {student.student_name}
                      </Title>
                      <Text type="secondary">
                        {student.nis || "-"} | {student.class_name || "-"}
                      </Text>
                    </Space>
                    <Tag color={student.balance > 0 ? "green" : "default"}>
                      {student.balance > 0 ? "Aktif" : "Belum ada saldo"}
                    </Tag>
                  </Space>

                  <div
                    style={{
                      borderRadius: 18,
                      background:
                        "linear-gradient(135deg, #eff6ff 0%, #dcfce7 100%)",
                      border: "1px solid rgba(59, 130, 246, 0.12)",
                      padding: 16,
                    }}
                  >
                    <Space orientation="vertical" size={2}>
                      <Text type="secondary">Saldo Saat Ini</Text>
                      <Space align="center">
                        <PiggyBank size={18} color="#059669" />
                        <Title level={4} style={{ margin: 0 }}>
                          {currencyFormatter.format(student.balance)}
                        </Title>
                      </Space>
                    </Space>
                  </div>

                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <div
                        style={{
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                          padding: 14,
                        }}
                      >
                        <Text type="secondary">Setoran</Text>
                        <div style={{ fontWeight: 700, marginTop: 4 }}>
                          {currencyFormatter.format(student.deposit_total)}
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div
                        style={{
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                          padding: 14,
                        }}
                      >
                        <Text type="secondary">Penarikan</Text>
                        <div style={{ fontWeight: 700, marginTop: 4 }}>
                          {currencyFormatter.format(student.withdrawal_total)}
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <Text type="secondary">
                    {student.transaction_count > 0
                      ? `Terakhir transaksi ${formatSavingDate(student.last_transaction_date)}`
                      : "Belum ada transaksi pada periode aktif."}
                  </Text>

                  <Space wrap style={{ width: "100%" }}>
                    <Button
                      type="primary"
                      icon={<ArrowDownCircle size={16} />}
                      onClick={() => onCreate(student, "deposit")}
                      style={{ borderRadius: 999, fontWeight: 600 }}
                    >
                      Setoran
                    </Button>
                    <Button
                      icon={<ArrowUpCircle size={16} />}
                      onClick={() => onCreate(student, "withdrawal")}
                      style={{ borderRadius: 999, fontWeight: 600 }}
                    >
                      Penarikan
                    </Button>
                  </Space>
                </Space>
              </Card>
            </MotionDiv>
          </Col>
        ))}
      </Row>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Pagination
          current={effectivePage}
          pageSize={PAGE_SIZE}
          total={students.length}
          onChange={setCurrentPage}
          showSizeChanger={false}
        />
      </div>
    </Space>
  );
};

export default memo(SavingStudentsList);
