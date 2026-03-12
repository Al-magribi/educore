import { Flex, Typography } from "antd";
import { ThreeCircles } from "react-loader-spinner";

const LoadApp = () => {
  return (
    <Flex
      vertical
      justify='center'
      align='center'
      gap={24}
      style={{
        width: "100%",
        minHeight: "clamp(240px, 45vh, 420px)",
        padding: "24px 16px",
      }}
    >
      <Flex
        vertical
        justify='center'
        align='center'
        gap={16}
        style={{
          width: "min(100%, 320px)",
          padding: "32px 24px",
          borderRadius: 20,
        }}
      >
        <ThreeCircles
          visible={true}
          height='72'
          width='72'
          color='#001529'
          ariaLabel='three-circles-loading'
        />
        <Flex vertical align='center' gap={4}>
          <Typography.Title level={5} style={{ margin: 0, color: "#001529" }}>
            Memuat Aplikasi
          </Typography.Title>
          <Typography.Text
            type='secondary'
            style={{ textAlign: "center", fontSize: 13, lineHeight: 1.6 }}
          >
            Menyiapkan halaman dan data yang dibutuhkan.
          </Typography.Text>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default LoadApp;
