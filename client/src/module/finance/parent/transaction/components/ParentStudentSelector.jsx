import { Avatar, Button, Card, Flex, Select, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { CalendarRange, GraduationCap, UsersRound } from "lucide-react";

const { Text } = Typography;
const MotionDiv = motion.div;

const ParentStudentSelector = ({
  childrenOptions,
  selectedStudentId,
  selectedPeriodeId,
  periodes,
  onStudentChange,
  onPeriodeChange,
}) => (
  <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <Card
      variant='borderless'
      style={{
        borderRadius: 26,
        border: "1px solid rgba(148,163,184,0.14)",
        boxShadow: "0 20px 42px rgba(15,23,42,0.06)",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      }}
      styles={{ body: { padding: 22 } }}
    >
      <Space direction='vertical' size={18} style={{ width: "100%" }}>
        <Flex align='center' justify='space-between' gap={12} wrap='wrap'>
          <Space size={10}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
                color: "#0f766e",
              }}
            >
              <UsersRound size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>
                Pilih Anak dan Periode
              </div>
              <Text type='secondary'>
                Gunakan panel ini untuk berpindah antar anak tanpa kehilangan
                konteks pembayaran.
              </Text>
            </div>
          </Space>

          <Space wrap>
            <Select
              value={selectedStudentId}
              onChange={onStudentChange}
              style={{ minWidth: 240 }}
              placeholder='Pilih anak'
              options={childrenOptions.map((item) => ({
                value: item.student_id,
                label: `${item.student_name}${item.nis ? ` • ${item.nis}` : ""}`,
              }))}
            />
            <Select
              value={selectedPeriodeId}
              onChange={onPeriodeChange}
              style={{ minWidth: 220 }}
              placeholder='Pilih periode'
              options={periodes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Space>
        </Flex>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {childrenOptions.map((item) => {
            const isActive = Number(item.student_id) === Number(selectedStudentId);

            return (
              <Button
                key={item.student_id}
                type={isActive ? "primary" : "default"}
                onClick={() => onStudentChange(item.student_id)}
                style={{
                  height: "auto",
                  padding: 0,
                  borderRadius: 22,
                  overflow: "hidden",
                  textAlign: "left",
                  boxShadow: isActive
                    ? "0 18px 34px rgba(37, 99, 235, 0.18)"
                    : "none",
                }}
              >
                <div style={{ padding: 18 }}>
                  <Flex align='flex-start' gap={14}>
                    <Avatar
                      size={46}
                      style={{
                        background: isActive
                          ? "rgba(255,255,255,0.2)"
                          : "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.16))",
                        color: isActive ? "#fff" : "#1d4ed8",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {(item.student_name || "?").slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Space direction='vertical' size={8} style={{ width: "100%" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{item.student_name}</div>
                        <div
                          style={{
                            opacity: isActive ? 0.92 : 0.72,
                            fontSize: 12,
                          }}
                        >
                          {item.nis || "Tanpa NIS"} • {item.homebase_name || "-"}
                        </div>
                      </div>

                      <Flex gap={8} wrap='wrap'>
                        <Tag
                          icon={<GraduationCap size={12} />}
                          color={isActive ? "blue" : "default"}
                          style={{ margin: 0, borderRadius: 999 }}
                        >
                          {item.current_grade_name || "-"} {item.current_class_name || ""}
                        </Tag>
                        <Tag
                          icon={<CalendarRange size={12} />}
                          color={item.active_periode_name ? "cyan" : "default"}
                          style={{ margin: 0, borderRadius: 999 }}
                        >
                          {item.active_periode_name || "Periode belum dipilih"}
                        </Tag>
                      </Flex>
                    </Space>
                  </Flex>
                </div>
              </Button>
            );
          })}
        </div>
      </Space>
    </Card>
  </MotionDiv>
);

export default ParentStudentSelector;
