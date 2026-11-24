import { Flex, Skeleton } from "antd";

import { MuseCard } from "../../../components/ui/muse";

/** Placeholder saat data halaman/panel keuangan dimuat (CLAUDE.md §6 "Loading"). */
const FinanceSkeleton = ({ rows = 6, withHeader = false }) => (
  <Flex vertical gap={24} style={{ width: "100%" }}>
    {withHeader ? <Skeleton active title paragraph={{ rows: 1 }} /> : null}
    <MuseCard>
      <Skeleton active paragraph={{ rows }} />
    </MuseCard>
  </Flex>
);

export default FinanceSkeleton;
