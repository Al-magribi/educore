import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { BarChart3, Info, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;
const MotionDiv = motion.div;

const containerStyle = {
  minHeight: "100%",
};

const cardStyle = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 22px 50px rgba(15, 23, 42, 0.08)",
};

const statisticFormatter = (value, prefix = "") =>
  `${prefix}${new Intl.NumberFormat("id-ID").format(value || 0)}`;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const FinanceFeaturePage = ({
  badge,
  title,
  description,
  summary,
  stats,
  headerExtra = null,
  actions = [],
  notes = [],
  columns,
  dataSource,
  children = null,
  showDataTable = true,
}) => {
  const navigate = useNavigate();
  const hasSidebar = actions.length > 0 || notes.length > 0;

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={containerStyle}
    >
      <Space vertical size={24} style={{ width: "100%", display: "flex" }}>
        <MotionDiv variants={itemVariants}>
          <Card
            style={{
              ...cardStyle,
              overflow: "hidden",
              position: "relative",
              border: "none",
              background:
                "radial-gradient(circle at top left, rgba(56,189,248,0.24), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0f766e 100%)",
              boxShadow: "0 26px 54px rgba(15, 23, 42, 0.18)",
            }}
            bodyStyle={{ padding: 28 }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
                pointerEvents: "none",
              }}
            />

            <Row
              gutter={[24, 24]}
              align='middle'
              style={{ position: "relative" }}
            >
              <Col xs={24} xl={16}>
                <Space vertical size={12}>
                  <Flex align='center' gap={10} wrap='wrap'>
                    <Tag
                      color='cyan'
                      style={{
                        width: "fit-content",
                        paddingInline: 12,
                        borderRadius: 999,
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      {badge}
                    </Tag>
                    <Flex
                      align='center'
                      gap={6}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "#e0f2fe",
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={14} />
                      <span>Finance insight report</span>
                    </Flex>
                  </Flex>
                  <Title
                    level={2}
                    style={{ margin: 0, color: "#fff", lineHeight: 1.12 }}
                  >
                    {title}
                  </Title>
                </Space>
              </Col>
              <Col xs={24} xl={8}>
                {headerExtra ? <div>{headerExtra}</div> : null}
              </Col>
            </Row>
          </Card>
        </MotionDiv>

        <Row gutter={[16, 16]}>
          {stats.map((item) => (
            <Col xs={24} md={12} xl={6} key={item.title}>
              <MotionDiv
                variants={itemVariants}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <Card
                  style={{
                    ...cardStyle,
                    background:
                      "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                  }}
                  bodyStyle={{ padding: 22 }}
                >
                  <Statistic
                    title={
                      <Flex align='center' gap={6}>
                        <span>{item.title}</span>
                        {item.note ? (
                          <Tooltip title={item.note}>
                            <Info
                              size={13}
                              color='#94a3b8'
                              style={{ cursor: "help", flexShrink: 0 }}
                            />
                          </Tooltip>
                        ) : null}
                      </Flex>
                    }
                    value={item.value}
                    formatter={(value) =>
                      statisticFormatter(value, item.prefix)
                    }
                  />
                </Card>
              </MotionDiv>
            </Col>
          ))}
        </Row>

        {children ? (
          <MotionDiv variants={itemVariants}>{children}</MotionDiv>
        ) : null}

        {showDataTable ? (
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={hasSidebar ? 16 : 24}>
              <MotionDiv variants={itemVariants}>
                <Card
                  title='Data Ringkas'
                  extra={
                    <Tag
                      color='geekblue'
                      style={{ borderRadius: 999, fontWeight: 600 }}
                    >
                      {dataSource.length} item
                    </Tag>
                  }
                  style={cardStyle}
                  bodyStyle={{ padding: 0 }}
                >
                  <Table
                    columns={columns}
                    dataSource={dataSource}
                    pagination={false}
                    scroll={{ x: 720 }}
                  />
                </Card>
              </MotionDiv>
            </Col>

            {hasSidebar ? (
              <Col xs={24} xl={8}>
                <Space vertical size={16} style={{ width: "100%" }}>
                  {actions.length > 0 ? (
                    <MotionDiv variants={itemVariants}>
                      <Card title='Aksi Cepat' style={cardStyle}>
                        <Space vertical size={12} style={{ width: "100%" }}>
                          {actions.map((action) => (
                            <Button
                              key={action.label}
                              type={action.type || "default"}
                              icon={action.icon || <ArrowRightOutlined />}
                              onClick={() => navigate(action.to)}
                              block
                            >
                              {action.label}
                            </Button>
                          ))}
                        </Space>
                      </Card>
                    </MotionDiv>
                  ) : null}

                  {notes.length > 0 ? (
                    <MotionDiv variants={itemVariants}>
                      <Card title='Catatan Operasional' style={cardStyle}>
                        <List
                          dataSource={notes}
                          renderItem={(item) => (
                            <List.Item style={{ paddingInline: 0 }}>
                              <Flex align='flex-start' gap={12}>
                                {item.type === "document" ? (
                                  <FileTextOutlined
                                    style={{ color: "#2563eb", marginTop: 4 }}
                                  />
                                ) : (
                                  <CheckCircleOutlined
                                    style={{ color: "#16a34a", marginTop: 4 }}
                                  />
                                )}
                                <div>
                                  <Text strong>{item.title}</Text>
                                  <div>
                                    <Text type='secondary'>
                                      {item.description}
                                    </Text>
                                  </div>
                                </div>
                              </Flex>
                            </List.Item>
                          )}
                        />
                      </Card>
                    </MotionDiv>
                  ) : null}
                </Space>
              </Col>
            ) : null}
          </Row>
        ) : null}
      </Space>
    </MotionDiv>
  );
};

export default FinanceFeaturePage;
