import { Space, Tag, Typography } from "antd";

import { currencyFormatter } from "./monthly/constants";

const { Text } = Typography;

/**
 * Tampilkan netto sebagai utama; jika ada beasiswa, tampilkan cover + bruto.
 */
export const ScholarshipAmountCell = ({
  amount,
  brutoAmount,
  scholarshipCover,
  hasScholarship,
  amountLabel = null,
}) => {
  const netto = Number(amount || 0);
  const cover = Number(scholarshipCover || 0);
  const bruto = Number(
    brutoAmount != null ? brutoAmount : netto + cover,
  );
  const showScholarship = Boolean(hasScholarship) || cover > 0;

  return (
    <Space direction="vertical" size={0}>
      <Text strong>
        {amountLabel ? `${amountLabel} ` : null}
        {currencyFormatter.format(netto)}
      </Text>
      {showScholarship ? (
        <>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Bruto {currencyFormatter.format(bruto)}
          </Text>
          <Tag color="geekblue" style={{ marginInlineEnd: 0, width: "fit-content" }}>
            Beasiswa −{currencyFormatter.format(cover)}
          </Tag>
        </>
      ) : null}
    </Space>
  );
};

export default ScholarshipAmountCell;
