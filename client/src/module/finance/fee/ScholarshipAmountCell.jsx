import { Space, Tag, Typography } from "antd";

import { currencyFormatter } from "./monthly/constants";

const { Text } = Typography;

/**
 * Tampilkan netto sebagai utama; jika ada beasiswa, tampilkan cover + bruto + nama.
 */
export const ScholarshipAmountCell = ({
  amount,
  brutoAmount,
  scholarshipCover,
  hasScholarship,
  scholarshipNames = [],
  amountLabel = null,
}) => {
  const netto = Number(amount || 0);
  const cover = Number(scholarshipCover || 0);
  const bruto = Number(
    brutoAmount != null ? brutoAmount : netto + cover,
  );
  const names = Array.isArray(scholarshipNames)
    ? [...new Set(scholarshipNames.filter(Boolean))]
    : [];
  const showScholarship = Boolean(hasScholarship) || cover > 0 || names.length > 0;

  return (
    <Space direction="vertical" size={0}>
      <Text strong>
        {amountLabel ? `${amountLabel} ` : null}
        {currencyFormatter.format(netto)}
      </Text>
      {showScholarship ? (
        <>
          {cover > 0 ? (
            <>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Bruto {currencyFormatter.format(bruto)}
              </Text>
              <Tag color="geekblue" style={{ marginInlineEnd: 0, width: "fit-content" }}>
                Beasiswa −{currencyFormatter.format(cover)}
              </Tag>
            </>
          ) : null}
          {names.length > 0 ? (
            <Space size={[4, 4]} wrap>
              {names.map((name) => (
                <Tag
                  key={name}
                  color="blue"
                  style={{
                    marginInlineEnd: 0,
                    borderRadius: 999,
                    maxWidth: "100%",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {name}
                </Tag>
              ))}
            </Space>
          ) : null}
        </>
      ) : null}
    </Space>
  );
};

export default ScholarshipAmountCell;
