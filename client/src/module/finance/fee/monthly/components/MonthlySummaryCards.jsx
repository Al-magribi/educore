import FinanceStatGrid from "../../../shared/FinanceStatGrid";

const formatValue = (item) => {
  const formatted = new Intl.NumberFormat("id-ID").format(item.value || 0);

  return item.prefix ? `${item.prefix}${formatted}` : formatted;
};

const MonthlySummaryCards = ({ items }) => (
  <FinanceStatGrid
    items={items.map((item) => ({
      key: item.key,
      title: item.title,
      note: item.note,
      icon: item.icon,
      color: item.color,
      value: formatValue(item),
    }))}
  />
);

export default MonthlySummaryCards;
