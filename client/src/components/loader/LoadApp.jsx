import { Flex, Typography } from "antd";
import { ThreeCircles } from "react-loader-spinner";

const LoadApp = () => {
  return (
    <Flex
      style={{ minHeight: "100vh" }}
      vertical
      justify="center"
      align="center"
      gap={"large"}
    >
      <ThreeCircles
        visible={true}
        height="100"
        width="100"
        color="#001529"
        ariaLabel="three-circles-loading"
      />
      <Typography.Text type="secondary">Memuat Aplikasi...</Typography.Text>
    </Flex>
  );
};

export default LoadApp;
