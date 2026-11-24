import React, { useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Flex,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  Award,
  Eye,
  ShieldAlert,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { museColors, museRadius, museShadow } from "../../../../config/theme";
const { Paragraph, Text, Title } = Typography;

const cardStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
};

const getInitials = (name) =>
  String(name || "")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const ScoreTag = ({ value, showBalance = false }) => (
  <Tag
    style={{
      margin: 0,
      paddingInline: 10,
      borderColor: showBalance ? museColors.primarySoft : "#d1fae5",
      background: showBalance ? museColors.primarySoft : "#ecfdf5",
      color: showBalance ? museColors.primary : museColors.success,
      fontWeight: 700,
    }}
  >
    {showBalance ? `Poin Bersih ${value}` : `Skor ${value}`}
  </Tag>
);

const MetricCard = ({
  label,
  value,
  percent,
  color,
  background,
  borderColor,
  trailColor,
}) => (
  <div
    style={{
      borderRadius: museRadius.card,
      border: `1px solid ${borderColor}`,
      background,
      padding: 12,
    }}
  >
    <Text style={{ color, fontSize: 12 }}>{label}</Text>
    <Title level={4} style={{ margin: "4px 0 8px", color }}>
      {value}
    </Title>
    <Progress
      percent={percent}
      size='small'
      showInfo={false}
      strokeColor={color}
      trailColor={trailColor}
    />
  </div>
);

const StudentDetailModal = ({ open, onClose, student, showBalance }) => {
  if (!student) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      title={null}
      destroyOnHidden
    >
      <Flex vertical gap={20}>
        <Flex justify='space-between' align='start' gap={16}>
          <Space align='start' size={14}>
            <Avatar
              size={52}
              style={{
                background: museColors.primary,
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {getInitials(student.student_name)}
            </Avatar>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {student.student_name}
              </Title>
              <Text style={{ color: museColors.muted }}>
                NIS {student.nis || "-"} • {student.grade_name || "-"} /{" "}
                {student.class_name || "-"}
              </Text>
            </div>
          </Space>

          <ScoreTag value={student.sort_points} showBalance={showBalance} />
        </Flex>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label='Total Poin Penghargaan'
            value={student.total_reward}
            percent={100}
            color='#a16207'
            background='#fffbeb'
            borderColor='#fef3c7'
            trailColor='#fde68a'
          />
          <MetricCard
            label='Total Poin Pelanggaran'
            value={student.total_punishment}
            percent={100}
            color={museColors.danger}
            background='#fef2f2'
            borderColor='#fecaca'
            trailColor='#fca5a5'
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <Card
            style={{
              borderRadius: museRadius.card,
              border: "1px solid #fef3c7",
              background: "#fffdf7",
              boxShadow: "none",
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Space size={10}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: "#fef3c7",
                  color: "#a16207",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={16} />
              </span>
              <div>
                <Text style={{ color: museColors.muted, fontSize: 12 }}>
                  Entri Penghargaan
                </Text>
                <Title level={4} style={{ margin: "2px 0 0", color: "#a16207" }}>
                  {student.reward_entries || 0}
                </Title>
              </div>
            </Space>
          </Card>

          <Card
            style={{
              borderRadius: museRadius.card,
              border: "1px solid #fecaca",
              background: "#fff8f8",
              boxShadow: "none",
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Space size={10}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: "#fecaca",
                  color: museColors.danger,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldAlert size={16} />
              </span>
              <div>
                <Text style={{ color: museColors.muted, fontSize: 12 }}>
                  Entri Pelanggaran
                </Text>
                <Title level={4} style={{ margin: "2px 0 0", color: museColors.danger }}>
                  {student.punishment_entries || 0}
                </Title>
              </div>
            </Space>
          </Card>

          <Card
            style={{
              borderRadius: museRadius.card,
              border: `1px solid ${museColors.primarySoft}`,
              background: museColors.bgLayout,
              boxShadow: "none",
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Space size={10}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: museColors.primarySoft,
                  color: museColors.primary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Award size={16} />
              </span>
              <div>
                <Text style={{ color: museColors.muted, fontSize: 12 }}>
                  Total Semua Entri
                </Text>
                <Title level={4} style={{ margin: "2px 0 0", color: museColors.primary }}>
                  {student.total_entries || 0}
                </Title>
              </div>
            </Space>
          </Card>
        </div>
      </Flex>
    </Modal>
  );
};

const StudentCard = ({
  item,
  showBalance,
  rank,
  rewardPercent,
  punishmentPercent,
  onOpenDetail,
}) => (
  <Card
    style={{
      borderRadius: museRadius.card,
      boxShadow: museShadow.card,
    }}
    styles={{ body: { padding: 18 } }}
  >
    <Flex vertical gap={12}>
      <Flex justify='space-between' align='start' gap={12}>
        <Space align='start' size={12}>
          <Avatar
            size={44}
            style={{
              background: museColors.primary,
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {getInitials(item.student_name)}
          </Avatar>
          <div>
            <Text strong style={{ color: museColors.text, fontSize: 15 }}>
              #{rank} {item.student_name}
            </Text>
            <div>
              <Text style={{ color: museColors.muted }}>
                NIS {item.nis || "-"} • {item.class_name || "-"}
              </Text>
            </div>
          </div>
        </Space>
        <Button
          icon={<Eye size={15} />}
          onClick={() => onOpenDetail(item)}
          style={{ borderRadius: 12 }}
        >
          Detail
        </Button>
      </Flex>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <MetricCard
          label='Penghargaan'
          value={item.total_reward}
          percent={rewardPercent}
          color='#a16207'
          background='#fffbeb'
          borderColor='#fef3c7'
          trailColor='#fde68a'
        />
        <MetricCard
          label='Pelanggaran'
          value={item.total_punishment}
          percent={punishmentPercent}
          color={museColors.danger}
          background='#fef2f2'
          borderColor='#fecaca'
          trailColor='#fca5a5'
        />
      </div>

      {showBalance ? (
        <ScoreTag value={item.sort_points} showBalance={showBalance} />
      ) : null}
    </Flex>
  </Card>
);

const PointStudentLeaderboard = ({
  dataSource = [],
  loading = false,
  isMobile = false,
  showBalance = false,
}) => {
  const [selectedStudent, setSelectedStudent] = useState(null);

  const topReward = useMemo(
    () => Math.max(...dataSource.map((item) => Number(item.total_reward || 0)), 0),
    [dataSource],
  );
  const topPunishment = useMemo(
    () =>
      Math.max(...dataSource.map((item) => Number(item.total_punishment || 0)), 0),
    [dataSource],
  );

  const columns = [
    {
      title: "Peringkat",
      key: "rank",
      width: 92,
      align: "center",
      render: (_, __, index) => (
        <Text strong style={{ color: museColors.text }}>
          #{index + 1}
        </Text>
      ),
    },
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      render: (_, record) => (
        <Space align='start' size={12}>
          <Avatar
            size={42}
            style={{
              background: museColors.primary,
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {getInitials(record.student_name)}
          </Avatar>
          <div>
            <Text strong style={{ color: museColors.text }}>
              {record.student_name}
            </Text>
            <div>
              <Text style={{ color: museColors.muted }}>NIS {record.nis || "-"}</Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Kelas",
      key: "class",
      width: 120,
      render: (_, record) => (
        <Text style={{ color: museColors.text }}>
          {record.grade_name || "-"} / {record.class_name || "-"}
        </Text>
      ),
    },
    {
      title: "Penghargaan",
      dataIndex: "total_reward",
      key: "total_reward",
      width: 180,
      render: (value) => (
        <Space direction='vertical' size={6} style={{ width: "100%" }}>
          <Tag
            style={{
              margin: 0,
              paddingInline: 10,
              borderColor: "#fcd34d",
              background: "#fffbeb",
              color: "#a16207",
              fontWeight: 700,
              width: "fit-content",
            }}
          >
            {value}
          </Tag>
          <Progress
            percent={
              topReward > 0
                ? Math.max(0, Math.round((Number(value || 0) / topReward) * 100))
                : 0
            }
            size='small'
            showInfo={false}
            strokeColor='#a16207'
            trailColor='#fde68a'
          />
        </Space>
      ),
    },
    {
      title: "Pelanggaran",
      dataIndex: "total_punishment",
      key: "total_punishment",
      width: 180,
      render: (value) => (
        <Space direction='vertical' size={6} style={{ width: "100%" }}>
          <Tag
            style={{
              margin: 0,
              paddingInline: 10,
              borderColor: "#fecaca",
              background: "#fef2f2",
              color: museColors.danger,
              fontWeight: 700,
              width: "fit-content",
            }}
          >
            {value}
          </Tag>
          <Progress
            percent={
              topPunishment > 0
                ? Math.max(
                    0,
                    Math.round((Number(value || 0) / topPunishment) * 100),
                  )
                : 0
            }
            size='small'
            showInfo={false}
            strokeColor={museColors.danger}
            trailColor='#fca5a5'
          />
        </Space>
      ),
    },
    {
      title: "Detail",
      key: "detail",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Button
          icon={<Eye size={15} />}
          onClick={() => setSelectedStudent(record)}
          style={{ borderRadius: 12 }}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <motion.div
      initial='hidden'
      animate='show'
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.04,
          },
        },
      }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <Card style={cardStyle} styles={{ body: { padding: isMobile ? 16 : 20 } }}>
        <Flex vertical gap={18}>
          <Flex
            vertical={isMobile}
            justify='space-between'
            align={isMobile ? "flex-start" : "center"}
            gap={12}
          >
            <Space align='start'>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: museRadius.card,
                  background: museColors.primarySoft,
                  color: museColors.primary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={20} />
              </span>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Daftar Siswa dan Poin
                </Title>
                <Paragraph style={{ margin: "4px 0 0", color: museColors.muted }}>
                  Diurutkan berdasarkan skor poin tertinggi. Jika nilainya sama,
                  urutan ditentukan oleh tingkat 7, 8, 9 lalu kelas 7A, 7B,
                  dan seterusnya.
                </Paragraph>
              </div>
            </Space>

            <Space wrap size={[8, 8]}>
              <Tag
                style={{
                  margin: 0,
                  paddingInline: 10,
                  borderColor: museColors.primarySoft,
                  background: museColors.primarySoft,
                  color: museColors.primary,
                }}
              >
                <Award size={13} style={{ marginRight: 6 }} />
                {dataSource.length} siswa
              </Tag>
              <Tag
                style={{
                  margin: 0,
                  paddingInline: 10,
                  borderColor: showBalance ? museColors.primarySoft : "#d1fae5",
                  background: showBalance ? museColors.primarySoft : "#ecfdf5",
                  color: showBalance ? museColors.primary : museColors.success,
                }}
              >
                <Trophy size={13} style={{ marginRight: 6 }} />
                {showBalance ? "Mode Poin Bersih" : "Mode Reward/Punishment"}
              </Tag>
            </Space>
          </Flex>

          {isMobile ? (
            <Flex vertical gap={16}>
              {dataSource.length ? (
                dataSource.map((item, index) => (
                  <StudentCard
                    key={`${item.student_id}-${item.class_id}`}
                    item={item}
                    showBalance={showBalance}
                    rank={index + 1}
                    rewardPercent={
                      topReward > 0
                        ? Math.max(
                            0,
                            Math.round(
                              (Number(item.total_reward || 0) / topReward) * 100,
                            ),
                          )
                        : 0
                    }
                    punishmentPercent={
                      topPunishment > 0
                        ? Math.max(
                            0,
                            Math.round(
                              (Number(item.total_punishment || 0) / topPunishment) *
                                100,
                            ),
                          )
                        : 0
                    }
                    onOpenDetail={setSelectedStudent}
                  />
                ))
              ) : (
                <Empty
                  description='Belum ada data siswa untuk periode ini.'
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Flex>
          ) : (
            <Table
              rowKey={(record) => `${record.student_id}-${record.class_id}`}
              loading={loading}
              dataSource={dataSource}
              columns={columns}
              pagination={{ pageSize: 12, showSizeChanger: false }}
              locale={{
                emptyText: (
                  <Empty
                    description='Belum ada data siswa untuk periode ini.'
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          )}
        </Flex>
      </Card>

      <StudentDetailModal
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
        showBalance={showBalance}
      />
    </motion.div>
  );
};

export default PointStudentLeaderboard;
