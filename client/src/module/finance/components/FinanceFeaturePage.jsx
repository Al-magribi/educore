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
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

const containerStyle = {
  minHeight: "100%",
  padding: 24,
  background:
    "radial-gradient(circle at top left, rgba(14, 165, 233, 0.16), transparent 32%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
};

const cardStyle = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 22px 50px rgba(15, 23, 42, 0.08)",
};

const statisticFormatter = (value, prefix = "") =>
  `${prefix}${new Intl.NumberFormat("id-ID").format(value || 0)}`;

const FinanceFeaturePage = ({
  badge,
  title,
  description,
  highlight,
  summary,
  stats,
  actions = [],
  notes = [],
  columns,
  dataSource,
}) => {
  const navigate = useNavigate();

  return (
    <div style={containerStyle}>
      <Space direction='vertical' size={24} style={{ width: "100%" }}>
        <Card style={cardStyle} bodyStyle={{ padding: 28 }}>
          <Row gutter={[24, 24]} align='middle'>
            <Col xs={24} xl={16}>
              <Space direction='vertical' size={12}>
                <Tag
                  color='blue'
                  style={{ width: "fit-content", paddingInline: 12, borderRadius: 999 }}
                >
                  {badge}
                </Tag>
                <Title level={2} style={{ margin: 0 }}>
                  {title}
                </Title>
                <Paragraph type='secondary' style={{ marginBottom: 0, fontSize: 16 }}>
                  {description}
                </Paragraph>
                <Alert
                  type='info'
                  showIcon
                  message={highlight}
                  style={{ borderRadius: 16 }}
                />
              </Space>
            </Col>

            <Col xs={24} xl={8}>
              <Card
                bordered={false}
                style={{
                  ...cardStyle,
                  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
                }}
                bodyStyle={{ padding: 24 }}
              >
                <Space direction='vertical' size={8}>
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>Ringkasan Hari Ini</Text>
                  <Title level={3} style={{ margin: 0, color: "#fff" }}>
                    {summary.title}
                  </Title>
                  <Paragraph style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>
                    {summary.description}
                  </Paragraph>
                  <Progress
                    percent={summary.percent}
                    strokeColor='#38bdf8'
                    trailColor='rgba(255,255,255,0.18)'
                  />
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          {stats.map((item) => (
            <Col xs={24} md={12} xl={6} key={item.title}>
              <Card style={cardStyle} bodyStyle={{ padding: 22 }}>
                <Statistic
                  title={item.title}
                  value={item.value}
                  formatter={(value) => statisticFormatter(value, item.prefix)}
                />
                <Text type='secondary'>{item.note}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card
              title='Data Ringkas'
              extra={<Tag color='geekblue'>{dataSource.length} item</Tag>}
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
          </Col>

          <Col xs={24} xl={8}>
            <Space direction='vertical' size={16} style={{ width: "100%" }}>
              <Card title='Aksi Cepat' style={cardStyle}>
                <Space direction='vertical' size={12} style={{ width: "100%" }}>
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

              <Card title='Catatan Operasional' style={cardStyle}>
                <List
                  dataSource={notes}
                  renderItem={(item) => (
                    <List.Item style={{ paddingInline: 0 }}>
                      <Flex align='flex-start' gap={12}>
                        {item.type === "document" ? (
                          <FileTextOutlined style={{ color: "#2563eb", marginTop: 4 }} />
                        ) : (
                          <CheckCircleOutlined
                            style={{ color: "#16a34a", marginTop: 4 }}
                          />
                        )}
                        <div>
                          <Text strong>{item.title}</Text>
                          <div>
                            <Text type='secondary'>{item.description}</Text>
                          </div>
                        </div>
                      </Flex>
                    </List.Item>
                  )}
                />
              </Card>
            </Space>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default FinanceFeaturePage;
