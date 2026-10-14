import { Flex, Typography } from "antd";

const { Title, Text } = Typography;

const PageHeader = ({ title, description, extra, meta, size = "page" }) => {
  const isSection = size === "section";

  return (
    <Flex justify='space-between' align='flex-start' gap={16} wrap='wrap'>
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <Title
          level={isSection ? 4 : 3}
          style={{
            margin: 0,
            fontSize: isSection ? 20 : 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}
        >
          {title}
        </Title>
        {description ? (
          <Text
            type='secondary'
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 14,
              lineHeight: 1.5,
              maxWidth: 720,
            }}
          >
            {description}
          </Text>
        ) : null}
        {meta ? <div style={{ marginTop: 12 }}>{meta}</div> : null}
      </div>
      {extra ? (
        <Flex gap={8} wrap='wrap' align='center' style={{ maxWidth: "100%" }}>
          {extra}
        </Flex>
      ) : null}
    </Flex>
  );
};

export default PageHeader;
