import { useMemo, useState } from "react";
import { Empty, Flex, Pagination } from "antd";

import { DataListCard } from "../../../components/ui/muse/DataSection";
import { museColors } from "../../../config/theme";

const PAGE_SIZE = 8;
const SEARCH_THRESHOLD = 5;

/**
 * DataListCard berisi DataRow dengan pencarian lokal dan paginasi.
 * getSearchText(item) -> teks yang dicocokkan; renderRow(item, isLast) -> DataRow.
 */
const SearchableListCard = ({
  title,
  description,
  icon,
  unit,
  items,
  getSearchText,
  searchPlaceholder = "Cari",
  renderRow,
  emptyText,
  emptyAction,
  extra,
}) => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(keyword));
  }, [items, query, getSearchText]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const searchProps =
    items.length > SEARCH_THRESHOLD
      ? {
          placeholder: searchPlaceholder,
          value: query,
          onChange: (event) => {
            setQuery(event.target.value);
            setPage(1);
          },
        }
      : undefined;

  return (
    <DataListCard
      title={title}
      description={description}
      icon={icon}
      count={items.length}
      unit={unit}
      searchProps={searchProps}
      extra={extra}
    >
      {paged.length ? (
        paged.map((item, index) => renderRow(item, index === paged.length - 1))
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={query ? `Tidak ada hasil untuk "${query}".` : emptyText}
          style={{ padding: "16px 24px 24px" }}
        >
          {query ? null : emptyAction}
        </Empty>
      )}
      {filtered.length > PAGE_SIZE ? (
        <Flex justify='center' style={{ padding: 16, borderTop: `1px solid ${museColors.divider}` }}>
          <Pagination
            size='small'
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onChange={setPage}
            showSizeChanger={false}
          />
        </Flex>
      ) : null}
    </DataListCard>
  );
};

export default SearchableListCard;
