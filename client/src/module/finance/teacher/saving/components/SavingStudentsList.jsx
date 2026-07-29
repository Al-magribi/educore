import { memo, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Pagination,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  PiggyBank,
} from "lucide-react";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter, formatSavingDate } from "../constants";
import SavingStudentDetailModal from "./SavingStudentDetailModal";

const { Text, Title } = Typography;
const MotionDiv = motion.div;
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const SavingStudentsList = ({ students, loading, onCreate }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [detailStudent, setDetailStudent] = useState(null);
  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const startIndex = (effectivePage - 1) * pageSize;
    return students.slice(startIndex, startIndex + pageSize);
  }, [effectivePage, pageSize, students]);

  if (!loading && students.length === 0) {
    return (
      <Card variant='borderless' style={cardStyle}>
        <Empty description='Belum ada siswa yang sesuai dengan filter aktif.' />
      </Card>
    );
  }

  return (
    <Space orientation='vertical' size={isMobile ? 14 : 20} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        {paginatedStudents.map((student) => (
          <Col xs={24} sm={12} xl={8} key={student.student_id}>
            <MotionDiv
              whileHover={isMobile ? undefined : { y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                loading={loading}
                variant='borderless'
                style={{
                  ...cardStyle,
                  borderRadius: isMobile ? 18 : undefined,
                  height: "100%",
                }}
                styles={{ body: { padding: isMobile ? 14 : 18 } }}
              >
                <Space orientation='vertical' size={14} style={{ width: "100%" }}>
                  <Flex
                    align='flex-start'
                    justify='space-between'
                    gap={8}
                    style={{ width: "100%" }}
                  >
                    <Space orientation='vertical' size={2} style={{ minWidth: 0, flex: 1 }}>
                      <Title
                        level={5}
                        style={{
                          margin: 0,
                          fontSize: isMobile ? 15 : undefined,
                          wordBreak: "break-word",
                        }}
                      >
                        {student.student_name}
                      </Title>
                      <Text
                        type='secondary'
                        style={{
                          fontSize: isMobile ? 12 : 14,
                          wordBreak: "break-word",
                        }}
                      >
                        {student.nis || "-"} | {student.class_name || "-"}
                      </Text>
                    </Space>
                    <Tag
                      color={student.balance > 0 ? "green" : "default"}
                      style={{ margin: 0, flexShrink: 0 }}
                    >
                      {student.balance > 0 ? "Aktif" : "Belum ada saldo"}
                    </Tag>
                  </Flex>

                  <div
                    style={{
                      borderRadius: 18,
                      background:
                        "linear-gradient(135deg, #eff6ff 0%, #dcfce7 100%)",
                      border: "1px solid rgba(59, 130, 246, 0.12)",
                      padding: isMobile ? 12 : 16,
                    }}
                  >
                    <Space orientation='vertical' size={2}>
                      <Text type='secondary'>Saldo Saat Ini</Text>
                      <Space align='center'>
                        <PiggyBank size={18} color='#059669' />
                        <Title
                          level={4}
                          style={{
                            margin: 0,
                            fontSize: isMobile ? 18 : undefined,
                            wordBreak: "break-word",
                          }}
                        >
                          {currencyFormatter.format(student.balance)}
                        </Title>
                      </Space>
                    </Space>
                  </div>

                  <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                    {student.transaction_count > 0
                      ? `Terakhir transaksi ${formatSavingDate(student.last_transaction_date)}`
                      : "Belum ada transaksi tabungan."}
                  </Text>

                  <Flex
                    gap={8}
                    wrap='wrap'
                    vertical={isMobile}
                    style={{ width: "100%" }}
                  >
                    <Button
                      type='primary'
                      icon={<ArrowDownCircle size={15} />}
                      onClick={() => onCreate(student, "deposit")}
                      block={isMobile}
                      style={{
                        borderRadius: 999,
                        fontWeight: 600,
                        flex: isMobile ? undefined : 1,
                        paddingInline: 8,
                      }}
                    >
                      Setoran
                    </Button>
                    <Button
                      icon={<ArrowUpCircle size={15} />}
                      onClick={() => onCreate(student, "withdrawal")}
                      block={isMobile}
                      style={{
                        borderRadius: 999,
                        fontWeight: 600,
                        flex: isMobile ? undefined : 1,
                        paddingInline: 8,
                      }}
                    >
                      Penarikan
                    </Button>
                    <Button
                      icon={<History size={15} />}
                      onClick={() => setDetailStudent(student)}
                      block={isMobile}
                      style={{
                        borderRadius: 999,
                        fontWeight: 600,
                        flex: isMobile ? undefined : 1,
                        paddingInline: 8,
                      }}
                    >
                      Detail
                    </Button>
                  </Flex>
                </Space>
              </Card>
            </MotionDiv>
          </Col>
        ))}
      </Row>

      <Flex justify={isMobile ? "center" : "flex-end"} style={{ width: "100%" }}>
        <Pagination
          current={effectivePage}
          pageSize={pageSize}
          total={students.length}
          size={isMobile ? "small" : "default"}
          onChange={(page, nextPageSize) => {
            if (nextPageSize !== pageSize) {
              setPageSize(nextPageSize);
              setCurrentPage(1);
              return;
            }

            setCurrentPage(page);
          }}
          showSizeChanger={!isMobile}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          showTotal={
            isMobile
              ? undefined
              : (total, range) => `${range[0]}-${range[1]} dari ${total} siswa`
          }
        />
      </Flex>

      <SavingStudentDetailModal
        open={Boolean(detailStudent)}
        student={detailStudent}
        onClose={() => setDetailStudent(null)}
      />
    </Space>
  );
};

export default memo(SavingStudentsList);
